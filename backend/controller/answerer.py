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
"""

from __future__ import annotations

import logging
from typing import Dict

from backend.schemas.evidence_package import EvidencePackage
from backend.schemas.execution_plan import ExecutionPlan
from backend.services.providers.openai_provider import OpenAIProvider

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
        unit = "%" if c.tool == "geometry.pixel_fraction" else "ha"
        lines.append(
            f"• {c.claim}: {c.measurement:.4g} {unit}  "
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
        provider = OpenAIProvider()
        technical_answer = provider.complete(
            prompt=technical_prompt,
            system=_TECHNICAL_SYSTEM,
        )
        logger.info("Technical answer generated for run %s (len=%d)", evidence.run_id, len(technical_answer))
    except Exception as e:
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
        provider = OpenAIProvider()
        plain_answer = provider.complete(
            prompt=plain_prompt,
            system=_PLAIN_SYSTEM,
        )
        logger.info("Plain answer generated for run %s (len=%d)", evidence.run_id, len(plain_answer))
    except Exception as e:
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
            unit = "%" if c.tool == "geometry.pixel_fraction" else "ha"
            lines.append(f"  • {c.claim}: {c.measurement:.4g} {unit}  (confidence {c.confidence:.0%})")
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
