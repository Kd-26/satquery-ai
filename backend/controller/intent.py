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
from backend.schemas.routing_decision import RoutingDecision
from backend.services.provider_service import generate as vlm_generate

logger = logging.getLogger(__name__)


def route_query(query: str, input_profiles: List[InputProfile]) -> RoutingDecision:
    """Route a query before planning so segmentation is opt-in, not default.

    This gate is deterministic on purpose: an LLM cannot silently turn a
    descriptive request into an expensive or quantitative workflow.
    """
    q = query.lower().strip()
    has_images = bool(input_profiles)

    image_words = ("this image", "this scene", "this raster", "uploaded", "upload", "these images")
    general_openers = ("what is", "what are", "explain ", "define ", "how does", "why does")
    raster_operation = any(term in q for term in (
        "calculate", "compute", "measure", "segment", "delineate", "describe this",
        "analyze this", "analyse this", "check this image", "compare these",
    )) or any(word in q for word in image_words)
    if not has_images and raster_operation:
        return RoutingDecision(
            mode="visual_interpretation",
            requires_segmentation=False,
            required_tools=["inspect_metadata"],
            claim_policy="qualitative_only",
            reason="Raster analysis was requested, but no image was supplied.",
        )
    if not has_images or (
        q.startswith(general_openers) and not any(word in q for word in image_words)
    ):
        return RoutingDecision(
            mode="general_knowledge",
            requires_segmentation=False,
            required_tools=[],
            claim_policy="conversational",
            reason="The question does not request analysis of an uploaded raster.",
        )

    segmentation_terms = (
        "segment", "delineate", "boundary", "boundaries", "outline", "polygon",
        "locate", "where are", "map all", "count objects", "detect objects",
    )
    area_terms = ("area", "hectare", "square kilomet", "square meter", "extent", "coverage", "percentage", "proportion", "how much")
    feature_terms = ("water", "flood", "vegetation", "forest", "crop", "urban", "building", "soil")
    if any(term in q for term in segmentation_terms) or (
        any(term in q for term in area_terms) and any(term in q for term in feature_terms)
    ):
        return RoutingDecision(
            mode="segmentation",
            requires_segmentation=True,
            required_tools=["segment_features", "compute_valid_mask", "measure_regions", "generate_overlay"],
            claim_policy="model_inference",
            reason="The request needs feature locations, boundaries, counts, or physical area.",
        )

    comparison_requested = any(term in q for term in ("compare", "change", "difference", "between", "over time", "before and after"))
    if len(input_profiles) >= 2 and comparison_requested:
        indices = [name for name in ("NDVI", "NDWI", "MNDWI", "NDBI") if name.lower() in q]
        index_tools = [f"compute_spectral_index:{name}" for name in indices]
        return RoutingDecision(
            mode="temporal_analysis",
            requires_segmentation=False,
            required_tools=["inspect_metadata", "check_alignment", *index_tools, "compute_raster_difference", "summarize_raster"],
            claim_policy="computed",
            reason="The request asks for non-segmented comparison of multiple rasters.",
        )

    if any(term in q for term in ("ndvi", "ndwi", "mndwi", "ndbi", "spectral index", "band math")):
        indices = [name for name in ("NDVI", "NDWI", "MNDWI", "NDBI") if name.lower() in q]
        if not indices:
            indices = ["NDVI"]
        return RoutingDecision(
            mode="spectral_analysis",
            requires_segmentation=False,
            required_tools=["inspect_metadata", "compute_valid_mask", *[f"compute_spectral_index:{i}" for i in indices], "summarize_raster"],
            claim_policy="computed",
            reason="A deterministic spectral calculation was requested.",
        )

    if any(term in q for term in ("quality", "usable", "cloud", "nodata", "missing pixels", "resolution", "crs")):
        return RoutingDecision(
            mode="quality_analysis",
            requires_segmentation=False,
            required_tools=["inspect_metadata", "compute_valid_mask", "assess_quality"],
            claim_policy="computed",
            reason="The request concerns raster quality or suitability.",
        )

    is_sar = any((p.sensor_type or "").lower() == "sar" for p in input_profiles)
    if is_sar and any(term in q for term in ("backscatter", "vv", "vh", "sar", "radar", "speckle")):
        return RoutingDecision(
            mode="sar_analysis",
            requires_segmentation=False,
            required_tools=["inspect_metadata", "compute_valid_mask", "sar_statistics"],
            claim_policy="computed",
            reason="The request asks for deterministic SAR statistics.",
        )

    return RoutingDecision(
        mode="visual_interpretation",
        requires_segmentation=False,
        required_tools=["inspect_metadata", "generate_preview", "vision_vlm_interpret"],
        claim_policy="qualitative_only",
        reason="The request asks for a qualitative interpretation, not feature boundaries or measurement.",
    )


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
