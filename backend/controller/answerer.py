"""
backend/controller/answerer.py
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Generates the two answer variants (technical + plain-language) from an
EvidencePackage using the NIM VLM.

Architectural rules (enforced by prompt design):
  • The VLM NEVER sees raw rasters or high-res masks.
  • The VLM ONLY gets serialized claim summaries and limitation text.
  • Quantitative measurements have already been locked by scientific tools.
  • The VLM's role is purely rhetorical — translating numbers into language.
  • All numbers in the answer must pass verifier.py's cross-check, so
    the prompts explicitly forbid inventing values not in the evidence.

When no tool measurements are available (empty claims), the pipeline falls
back to generate_answer_from_process_log(), which compiles the full process
log and sends it to the VLM so it can still produce a qualitative answer
with a conservative confidence estimate — never returning empty results.
"""

from __future__ import annotations

import json
import logging
import re
import uuid
from typing import Dict, Any, List

from backend.schemas.evidence_package import EvidencePackage, Claim
from backend.schemas.execution_plan import ExecutionPlan
from backend.schemas.validation_result import ValidationResult
from backend.services.vlm_service import generate, VLMError

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────────────────
# System prompts — one per answer variant
# ─────────────────────────────────────────────────────────────────────────────

_TECHNICAL_SYSTEM = (
    "You are a senior GIS analyst specialising in satellite remote sensing.\n"
    "You will receive a user query and a structured evidence package containing "
    "verified measurements, confidence scores, and known limitations.\n\n"
    "STRICT RULES:\n"
    "1. Use ONLY numbers, measurements, and facts from the evidence. Never invent values.\n"
    "2. State every measurement with its unit (ha, km², m, %, etc.).\n"
    "3. Round values to at most 2 significant figures — do not add false precision.\n"
    "4. You MUST disclose every limitation listed in the evidence.\n"
    "5. If confidence is below 0.7, call it out explicitly.\n"
    "6. Reference the sensor, resolution, and acquisition context when relevant.\n"
    "7. If no measurement exists for a claim, say 'insufficient data'."
)

_PLAIN_SYSTEM = (
    "You are a helpful assistant explaining satellite image analysis to a non-expert.\n"
    "You will receive a user query and verified measurements from a scientific analysis.\n\n"
    "STRICT RULES:\n"
    "1. Use ONLY numbers from the evidence package. Never invent values.\n"
    "2. Translate area measurements into everyday comparisons "
    "(e.g. 'about 20 football fields' for 14 ha).\n"
    "3. Keep the answer to 3 short paragraphs maximum.\n"
    "4. Disclose all limitations — but explain them in plain English, not jargon.\n"
    "5. If confidence is below 0.7, say 'the analysis has significant uncertainty' "
    "and explain why simply.\n"
    "6. End with one practical takeaway sentence."
)


# ─────────────────────────────────────────────────────────────────────────────
# Evidence serialiser — compact, verifier-compatible
# ─────────────────────────────────────────────────────────────────────────────

def _serialise_evidence(evidence: EvidencePackage) -> str:
    """
    Convert the EvidencePackage into a compact text block for the VLM prompt.
    Keeps numbers and units in a format the verifier can cross-check with regex.
    """
    lines: list[str] = ["=== VERIFIED MEASUREMENTS ==="]
    for c in evidence.claims:
        conf_flag = " ⚠️ low-confidence" if c.confidence < 0.7 else ""
        lines.append(
            f"• {c.claim}: {c.measurement:.4g} ha  "
            f"[confidence={c.confidence:.2f}{conf_flag}]  "
            f"[tool={c.tool}]  [region={c.region_id}]"
        )

    if evidence.limitations:
        lines.append("\n=== KNOWN LIMITATIONS ===")
        for lim in evidence.limitations:
            lines.append(f"• {lim}")

    lines.append(f"\n=== MODEL VERSIONS USED ===")
    for mid, ver in evidence.model_versions.items():
        lines.append(f"• {mid} v{ver}")

    return "\n".join(lines)


# ─────────────────────────────────────────────────────────────────────────────
# Public API
# ─────────────────────────────────────────────────────────────────────────────

def generate_answer(
    query: str,
    evidence: EvidencePackage,
    plan: ExecutionPlan,
) -> Dict[str, str]:
    """
    Produce technical and plain-language answers from the EvidencePackage.

    Returns:
        {"technical": str, "plain_language": str}

    On VLM failure, returns conservative fallback text so the pipeline
    continues and the verifier can still run (it will flag the fallback as
    having no invented numbers, which passes cleanly).
    """
    evidence_text = _serialise_evidence(evidence)

    # ── Technical answer ─────────────────────────────────────────────────────
    technical_prompt = (
        f"USER QUERY: {query}\n\n"
        f"{evidence_text}\n\n"
        "Write a concise technical answer to the query using ONLY the verified measurements above. "
        "Include units (ha), confidence levels, sensor context, and all limitations. "
        "Do not include any number that is not in the evidence above."
    )

    try:
        technical_answer = generate(
            prompt=technical_prompt,
            system=_TECHNICAL_SYSTEM,
            images=[],                         # low-res overlays can be added here later
            adapter=plan.final_adapter,        # None until LoRA is deployed
            max_tokens=512,
            reasoning_budget=256,
        )
        logger.info("Technical answer generated for run %s (len=%d)", evidence.run_id, len(technical_answer))
    except VLMError as e:
        logger.error("VLM failed for technical answer (run %s): %s", evidence.run_id, e)
        technical_answer = _conservative_text_answer(query, evidence)

    # ── Plain-language answer ────────────────────────────────────────────────
    plain_prompt = (
        f"USER QUERY: {query}\n\n"
        f"{evidence_text}\n\n"
        "Write a plain-language answer to the query for a non-expert. "
        "Translate all measurements into everyday comparisons (e.g. football fields). "
        "Do not include any number that is not in the evidence above. "
        "Keep it under 3 short paragraphs."
    )

    try:
        plain_answer = generate(
            prompt=plain_prompt,
            system=_PLAIN_SYSTEM,
            images=[],
            adapter=plan.final_adapter,
            max_tokens=512,
            reasoning_budget=256,
        )
        logger.info("Plain answer generated for run %s (len=%d)", evidence.run_id, len(plain_answer))
    except VLMError as e:
        logger.error("VLM failed for plain answer (run %s): %s", evidence.run_id, e)
        plain_answer = _conservative_text_answer(query, evidence)

    return {
        "technical":     technical_answer,
        "plain_language": plain_answer,
    }


# ─────────────────────────────────────────────────────────────────────────────
# Conservative fallback — used when the VLM call itself fails (not hallucination)
# ─────────────────────────────────────────────────────────────────────────────

def _conservative_text_answer(query: str, evidence: EvidencePackage) -> str:
    """
    Template-only answer with zero invented data.
    Generated locally without any VLM call — guaranteed to pass the verifier.
    """
    lines = [f"Query: {query}", "", "Analysis Results:"]
    if evidence.claims:
        for c in evidence.claims:
            lines.append(f"  • {c.claim}: {c.measurement:.4g}  (confidence {c.confidence:.0%})")
    else:
        lines.append("  • No measurements could be extracted from the provided imagery.")

    if evidence.limitations:
        lines.append("")
        lines.append("Limitations:")
        for lim in evidence.limitations:
            lines.append(f"  • {lim}")

    lines.append("")
    lines.append("(Note: VLM narrative generation was unavailable; showing raw evidence only.)")
    return "\n".join(lines)


# ─────────────────────────────────────────────────────────────────────────────
# Process-log fallback — used when tool execution produced zero measurements
# ─────────────────────────────────────────────────────────────────────────────

_PROCESS_LOG_SYSTEM = (
    "You are a senior satellite remote sensing analyst.\n"
    "The automated scientific tool pipeline ran but could not extract numeric measurements "
    "from the imagery (e.g. insufficient spectral bands, unsupported sensor, or coverage below threshold).\n\n"
    "You are given the FULL PROCESS LOG — every stage the pipeline completed, which models were "
    "attempted, what tools ran, what restrictions were applied, and what limitations were recorded.\n\n"
    "STRICT RULES:\n"
    "1. Give a qualitative answer based ONLY on what the pipeline actually observed.\n"
    "2. Do NOT invent numeric measurements (area, percentage, count) — none were computed.\n"
    "3. Explain clearly WHY no measurements are available and what the user could do to get them.\n"
    "4. At the very end of your response, output a JSON block (and NOTHING after it) in this exact format:\n"
    '   ```json\n   {"confidence": <float 0.0-1.0>, "reason": "<one sentence>"}\n   ```\n'
    "   where confidence reflects how reliably the pipeline could characterise the scene qualitatively.\n"
    "5. Keep the answer under 4 paragraphs."
)


def _build_process_log(
    query: str,
    plan: ExecutionPlan,
    validation: ValidationResult,
    traces: List[dict],
    limitations: List[str],
) -> str:
    """
    Compile every piece of structured pipeline context into a single text block
    for the VLM.  No invented numbers — only observed pipeline facts.
    """
    lines: list[str] = [
        f"USER QUERY: {query}",
        "",
        "=== PIPELINE PROCESS LOG ===",
        f"Workflow type  : {plan.workflow}",
        f"Images         : {', '.join(plan.images)}",
        f"Required models: {', '.join(plan.required_models) or 'none'}",
        f"Target classes : {', '.join(plan.target_classes) or 'none'}",
        f"Requested outputs: {', '.join(plan.requested_outputs) or 'none'}",
        f"Optional tools : {', '.join(plan.optional_tools) or 'none'}",
        "",
        f"=== VALIDATION ===",
        f"Approved: {validation.approved}",
    ]

    if validation.errors:
        lines.append("Errors:")
        for e in validation.errors:
            lines.append(f"  • {e}")
    if validation.restrictions:
        lines.append("Restrictions:")
        for r in validation.restrictions:
            lines.append(f"  • {r}")

    lines.append("")
    lines.append("=== EXECUTION TRACES ===")
    if traces:
        for t in traces:
            step = t.get("step", "unknown")
            status = t.get("status", "?")
            dur = t.get("duration_s")
            note = t.get("note") or t.get("reason") or t.get("model_id") or t.get("tool") or ""
            dur_str = f"  [{dur:.2f}s]" if dur is not None else ""
            lines.append(f"  [{status.upper()}] {step}{dur_str}  {note}".rstrip())
    else:
        lines.append("  (no traces recorded)")

    if limitations:
        lines.append("")
        lines.append("=== KNOWN LIMITATIONS ===")
        for lim in limitations:
            lines.append(f"  • {lim}")

    lines.append("")
    lines.append("NOTE: Zero numeric measurements were produced by the tool pipeline.")
    return "\n".join(lines)


def generate_answer_from_process_log(
    query: str,
    evidence: EvidencePackage,
    plan: ExecutionPlan,
    validation: ValidationResult,
    traces: List[dict],
) -> tuple[Dict[str, str], List[Claim]]:
    """
    Fallback for when the executor produced no measurements.

    Compiles the full process log and sends it to the VLM so it can give a
    qualitative answer and a conservative confidence estimate.  A synthetic
    'qualitative_assessment' Claim is returned so ConfidenceBar and the rest
    of the pipeline always have non-null confidence data.

    Returns:
        (answer_obj, synthetic_claims)
    """
    process_log = _build_process_log(
        query=query,
        plan=plan,
        validation=validation,
        traces=traces,
        limitations=list(evidence.limitations),
    )

    prompt = (
        f"{process_log}\n\n"
        "Based ONLY on the process log above, write a qualitative answer to the user query. "
        "Explain what the pipeline attempted, why no measurements are available, and what the "
        "user could do to obtain quantitative results. "
        "End with a JSON confidence block as instructed."
    )

    raw_answer: str
    confidence: float = 0.35  # conservative default when no data

    try:
        raw_answer = generate(
            prompt=prompt,
            system=_PROCESS_LOG_SYSTEM,
            images=[],
            adapter=plan.final_adapter,
            max_tokens=600,
            reasoning_budget=128,
        )
        logger.info(
            "Process-log VLM answer generated for run %s (len=%d)",
            evidence.run_id, len(raw_answer),
        )
    except VLMError as e:
        logger.error("VLM failed for process-log answer (run %s): %s", evidence.run_id, e)
        raw_answer = (
            f"Query: {query}\n\n"
            "The analysis pipeline completed but could not extract numeric measurements "
            "from the provided imagery. "
            + (f"Limitations: {'; '.join(evidence.limitations)}" if evidence.limitations else "")
            + "\n\nConsider uploading a georeferenced GeoTIFF with sufficient spectral bands."
        )

    # ── Parse the trailing JSON confidence block ─────────────────────────────
    json_match = re.search(
        r"```(?:json)?\s*(\{[^`]+\})\s*```",
        raw_answer,
        re.DOTALL,
    )
    narrative = raw_answer
    if json_match:
        try:
            parsed = json.loads(json_match.group(1))
            raw_conf = parsed.get("confidence")
            if isinstance(raw_conf, (int, float)):
                confidence = float(max(0.0, min(1.0, raw_conf)))
        except (json.JSONDecodeError, KeyError):
            pass
        # Strip the JSON block from the narrative shown to the user
        narrative = raw_answer[: json_match.start()].strip()

    answer_obj = {"technical": narrative, "plain_language": narrative}

    # ── Synthetic claim so ConfidenceBar has a non-null value ────────────────
    synthetic_claim = Claim(
        claim="qualitative_assessment",
        measurement=round(confidence * 100, 1),   # store as percentage for display
        region_id=str(uuid.uuid4()),
        source_images=plan.images,
        tool="vlm.process_log_synthesis",
        confidence=confidence,
    )

    return answer_obj, [synthetic_claim]

