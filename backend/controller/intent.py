"""
backend/controller/intent.py
━━━━━━━━━━━━━━━━━━━━━━━━━━━
Query Intent Classifier (Pre-Planner Stage).

Performs lightweight, fast intent analysis on the user query and available
image metadata prior to full execution planning.

Provides hints for:
  • workflow_hint (single | temporal | crossmodal)
  • analysis_type (change_detection | segmentation | spectral_index | general)
  • target_classes_hint (water | vegetation | urban | etc.)
  • suggested_tools (e.g. compute_spectral_index:NDWI)
  • requires_area (boolean)
"""

from __future__ import annotations

import json
import logging
import re
from typing import Any, Dict, List

from backend.schemas.input_profile import InputProfile
from backend.services.vlm_service import generate as vlm_generate

logger = logging.getLogger(__name__)


def classify_intent(query: str, input_profiles: List[InputProfile]) -> Dict[str, Any]:
    """
    Classify user query intent into structured hints for the planner.
    Deterministic rule-based fallback is used if the VLM call fails.
    """
    profiles_summary = [
        {
            "sensor": p.sensor_family,
            "date": str(p.acquisition_date) if p.acquisition_date else None,
            "modality": "sar" if p.sensor_family in ("sentinel-1", "risat") else "optical",
            "bands": p.band_identities,
        }
        for p in input_profiles
    ]

    prompt = (
        "You are a remote sensing intent classifier. Analyze the user query and available imagery.\n\n"
        f"QUERY: {query}\n"
        f"IMAGE PROFILES: {json.dumps(profiles_summary)}\n\n"
        "Respond ONLY with a JSON object:\n"
        "{\n"
        '  "workflow_hint": "single" | "temporal" | "crossmodal",\n'
        '  "analysis_type": "change_detection" | "segmentation" | "spectral_index" | "measurement" | "general",\n'
        '  "target_classes_hint": ["water" | "vegetation" | "urban"],\n'
        '  "suggested_tools": ["compute_spectral_index:NDWI" | "compute_spectral_index:NDVI"],\n'
        '  "requires_area": true | false\n'
        "}"
    )

    try:
        raw = vlm_generate(prompt=prompt, max_tokens=200, reasoning_budget=0)
        cleaned = re.sub(r"```(?:json)?\s*|\s*```", "", raw).strip()
        parsed = json.loads(cleaned)
        if isinstance(parsed, dict) and "workflow_hint" in parsed:
            num_images = len(input_profiles)
            sar_count = sum(
                1 for p in input_profiles
                if (p.sensor_family or "").lower() in ("sentinel-1", "risat")
                or (p.sensor_type or "").lower() == "sar"
                or any(b in ("VV", "VH") for b in p.band_identities)
            )
            opt_count = num_images - sar_count

            if num_images <= 1:
                parsed["workflow_hint"] = "single"
            elif sar_count >= 1 and opt_count >= 1:
                parsed["workflow_hint"] = "crossmodal"
            elif num_images >= 2 and parsed.get("workflow_hint") == "crossmodal" and (sar_count == 0 or opt_count == 0):
                parsed["workflow_hint"] = "temporal"

            logger.info("Intent classified: workflow=%s, type=%s", parsed.get("workflow_hint"), parsed.get("analysis_type"))
            return parsed
    except Exception as e:
        logger.warning("VLM intent classification fallback triggered: %s", e)

    # Deterministic heuristic fallback
    num_images = len(input_profiles)
    sar_count = sum(
        1 for p in input_profiles
        if (p.sensor_family or "").lower() in ("sentinel-1", "risat")
        or (p.sensor_type or "").lower() == "sar"
        or any(b in ("VV", "VH") for b in p.band_identities)
    )
    opt_count = num_images - sar_count

    if num_images >= 2 and sar_count >= 1 and opt_count >= 1:
        workflow = "crossmodal"
    elif num_images >= 2:
        workflow = "temporal"
    else:
        workflow = "single"

    lower_query = query.lower()
    classes = []
    if any(w in lower_query for w in ("water", "flood", "lake", "river", "reservoir")):
        classes.append("water")
    if any(w in lower_query for w in ("vegetation", "forest", "tree", "crop", "agriculture", "ndvi")):
        classes.append("vegetation")
    if any(w in lower_query for w in ("urban", "city", "building", "settlement")):
        classes.append("urban")
    if not classes:
        classes = ["water"]  # default standard

    suggested_tools = []
    if "ndwi" in lower_query or ("water" in classes and "index" in lower_query):
        suggested_tools.append("compute_spectral_index:NDWI")
    if "ndvi" in lower_query or ("vegetation" in classes and "index" in lower_query):
        suggested_tools.append("compute_spectral_index:NDVI")

    return {
        "workflow_hint": workflow,
        "analysis_type": "change_detection" if workflow == "temporal" else "segmentation",
        "target_classes_hint": classes,
        "suggested_tools": suggested_tools,
        "requires_area": any(w in lower_query for w in ("area", "hectare", "km", "size", "extent", "measure")),
    }
