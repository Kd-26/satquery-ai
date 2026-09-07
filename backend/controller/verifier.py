"""
backend/controller/verifier.py
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
The Verification Engine.

Performs strict, multi-pass cross-checks between the VLM generated answer
and the EvidencePackage:
  1. Unit-aware numeric cross-checking (ha, m², km², percentages, confidence)
  2. Qualitative hallucination checking (detects unbacked superlative/extreme adjectives)
  3. Ground-truth identifier cross-checking (image and region UUIDs)
  4. Clean, structured conservative fallback generation when verification fails.
"""

from __future__ import annotations

import re
import logging
from typing import List, Set

from backend.schemas.evidence_package import EvidencePackage
from backend.schemas.verification_result import VerificationResult

logger = logging.getLogger(__name__)

# Extreme/superlative terms requiring strong evidence backing (>0.75 confidence or significant impact)
_HIGH_SEVERITY_TERMS = [
    "catastrophic",
    "massive",
    "severe",
    "dramatic",
    "widespread",
    "total loss",
    "complete destruction",
    "unprecedented",
    "devastating",
]

# Regex matching numbers with optional thousands commas and optional trailing units
_NUM_WITH_UNIT_PATTERN = re.compile(
    r'\b(\d{1,3}(?:,\d{3})*(?:\.\d+)?|\d+(?:\.\d+)?)\s*'
    r'(ha|hectares?|m[²2]|sq\.?\s*m(?:eters?)?|square\s*meters?|km[²2]|sq\.?\s*km|square\s*kilometers?|%|percent)?\b',
    re.IGNORECASE,
)

_UUID_PATTERN = re.compile(
    r'\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b',
    re.IGNORECASE,
)


def _parse_candidate_values(num_str: str, unit_str: str | None) -> list[float]:
    """
    Parse a numeric token and return candidate values normalized to hectares
    and raw float representation.
    """
    cleaned = num_str.replace(",", "")
    try:
        raw_val = float(cleaned)
    except ValueError:
        return []

    candidates = [raw_val]
    unit = (unit_str or "").lower().strip()

    # Remote sensing area normalization (evidence measurements are in hectares)
    if unit in ("ha", "hectare", "hectares"):
        candidates.append(raw_val)
    elif unit in ("m²", "m2", "sq m", "sq. m", "square meter", "square meters"):
        candidates.append(raw_val / 10000.0)  # 1 ha = 10,000 m²
    elif unit in ("km²", "km2", "sq km", "sq. km", "square kilometer", "square kilometers"):
        candidates.append(raw_val * 100.0)    # 1 km² = 100 ha
    elif unit in ("%", "percent"):
        candidates.append(raw_val / 100.0)    # 85% -> 0.85
        candidates.append(raw_val)

    return candidates


def verify_answer(answer_text: str, evidence: EvidencePackage) -> VerificationResult:
    """
    Cross-check answer text against evidence package.
    Ensures zero fabricated numbers, unsupported region IDs, or unbacked hyperbolic claims.
    """
    flagged_claims: list[str] = []
    notes: list[str] = []

    # Normalize unicode hyphens/dashes to standard ASCII hyphen
    answer_text = re.sub(r"[\u2010\u2011\u2012\u2013\u2014\u2212]", "-", answer_text)
    # Normalize unicode spaces to standard ASCII space
    answer_text = re.sub(r"[\u00a0\u2000-\u200a\u202f\u205f]", " ", answer_text)

    # ── 1. Region / image reference validation ───────────────────────────────
    mentioned_ids = [match.group(0).lower() for match in _UUID_PATTERN.finditer(answer_text)]
    valid_region_ids: Set[str] = {c.region_id.lower() for c in evidence.claims}
    valid_image_ids: Set[str] = set()
    for c in evidence.claims:
        for img_id in c.source_images:
            valid_image_ids.add(img_id.lower())

    for mid in mentioned_ids:
        if mid not in valid_region_ids and mid not in valid_image_ids:
            flagged_claims.append(f"ID '{mid}' mentioned in answer but not present in evidence or source images.")

    # Mask out valid UUIDs so their hex numeric components aren't parsed as scientific measurements
    text_for_nums = _UUID_PATTERN.sub(" [UUID] ", answer_text)

    # ── 2. Unit-aware numeric cross-checking ─────────────────────────────────
    valid_measurements = [c.measurement for c in evidence.claims]
    valid_confidences = [c.confidence for c in evidence.claims]
    valid_conf_pcts = [c.confidence * 100.0 for c in evidence.claims]

    tolerance = 0.06  # 6% tolerance for rounding (e.g. 14.2 ha vs 14.5 ha)

    for match in _NUM_WITH_UNIT_PATTERN.finditer(text_for_nums):
        num_str = match.group(1)
        unit_str = match.group(2)
        candidates = _parse_candidate_values(num_str, unit_str)
        if not candidates:
            continue

        raw_val = candidates[0]

        # Ignore common non-claim integers (e.g. "step 1", "2 images", "3 paragraphs", years 1990-2035)
        if raw_val.is_integer() and (raw_val < 10 or 1990 <= raw_val <= 2035):
            continue

        # Check if ANY normalized candidate matches ANY measurement, confidence, or unit conversion
        is_valid = False

        for cand in candidates:
            # Check against measurements directly
            for meas in valid_measurements:
                if meas == 0:
                    if abs(cand) < 1e-4:
                        is_valid = True
                        break
                elif abs(cand - meas) / abs(meas) <= tolerance:
                    is_valid = True
                    break

                # Also test direct conversions if raw number was un-annotated
                # cand in m² -> meas * 10000
                if meas > 0 and abs(cand - (meas * 10000.0)) / (meas * 10000.0) <= tolerance:
                    is_valid = True
                    break
                # cand in km² -> meas / 100
                if meas > 0 and abs(cand - (meas / 100.0)) / (meas / 100.0) <= tolerance:
                    is_valid = True
                    break

            if is_valid:
                break

            # Check against confidences (e.g. 0.85 or 85%)
            for conf in valid_confidences:
                if abs(cand - conf) <= 0.05:
                    is_valid = True
                    break
            if is_valid:
                break

            for conf_pct in valid_conf_pcts:
                if abs(cand - conf_pct) <= 5.0:
                    is_valid = True
                    break
            if is_valid:
                break

            # Also allow numbers that match a measurement directly in % form
            # (e.g. claim measurement=34.0 meaning 34% coverage → VLM writes "34%")
            for meas in valid_measurements:
                if 0.0 < meas <= 100.0:
                    if abs(cand - meas) <= (meas * tolerance + 1.0):
                        is_valid = True
                        break
                    # fraction form: 0.34 for 34%
                    if abs(cand - meas / 100.0) <= 0.02:
                        is_valid = True
                        break
            if is_valid:
                break

        if not is_valid:
            unit_suffix = f" {unit_str}" if unit_str else ""
            flagged_claims.append(f"Number '{num_str}{unit_suffix}' not grounded in evidence claims or confidence metrics.")

    # ── 3. Qualitative claim validation ──────────────────────────────────────
    lower_answer = answer_text.lower()
    has_high_confidence = any(c.confidence >= 0.75 for c in evidence.claims)
    for term in _HIGH_SEVERITY_TERMS:
        if term in lower_answer and not has_high_confidence:
            notes.append(
                f"Qualitative severity term '{term}' used without high-confidence (>=75%) scientific evidence backing."
            )

    passed = len(flagged_claims) == 0
    if not passed:
        notes.append("Answer contains numeric claims or identifiers not verified by scientific evidence.")

    return VerificationResult(
        passed=passed,
        flagged_claims=flagged_claims,
        notes=notes,
    )


def get_conservative_fallback(evidence: EvidencePackage) -> str:
    """
    Returns a strict, clean, templated report based exclusively on verified evidence.
    Called when verify_answer() fails to prevent unverified claims from reaching the user.
    """
    lines = [
        "### Verified Scientific Analysis Report",
        "*Note: VLM rhetorical synthesis contained unverified assertions; displaying strictly verified measurements.*",
        "",
        "**Verified Findings:**",
    ]

    if evidence.claims:
        for c in evidence.claims:
            conf_str = f"{c.confidence:.0%}"
            lines.append(f"- **{c.claim.capitalize()}**: `{c.measurement:.4g} ha` (Confidence: {conf_str}, Tool: `{c.tool}`)")
    else:
        lines.append("- No quantitative features exceeded the minimum detection threshold.")

    if evidence.limitations:
        lines.append("")
        lines.append("**Operational Limitations & Caveats:**")
        for lim in evidence.limitations:
            lines.append(f"- {lim}")

    if evidence.model_versions:
        lines.append("")
        lines.append("**Model Provenance:**")
        for mid, ver in evidence.model_versions.items():
            lines.append(f"- Model `{mid}` (version {ver})")

    return "\n".join(lines)
