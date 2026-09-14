"""
backend/controller/planner.py
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
The Planning Agent.

Uses the OpenAI agent brain via strict TOOL CALLING
to produce a guaranteed-structured ExecutionPlan.  Tool calling is used instead
of free-form JSON parsing because:
  - The model's reasoning budget runs internally before it commits arguments
  - The API enforces the schema — the model cannot output malformed JSON
  - Retry logic is simpler: only retry on transport/parse failure, not schema failure

Flow:
    _build_planner_prompt()  →  generate_with_tool_call(tool=create_execution_plan)
                             →  ExecutionPlan.model_validate(args_dict)

Replanning (validation-aware):
    If validate_plan() rejects, pipeline.py calls replan() with the rejection
    reasons. The model sees its own rejected plan and the errors and fixes them.
"""

from __future__ import annotations

import json
import logging
from typing import Any, Optional

from backend.schemas.input_profile import InputProfile
from backend.schemas.execution_plan import ExecutionPlan
from backend.registry import registry_loader
from backend.services.provider_service import generate_agent_with_tool_call
from backend.controller.intent import classify_intent

logger = logging.getLogger(__name__)


class PlannerParseError(Exception):
    """Raised when the planner fails to produce a valid ExecutionPlan after all retries."""


# ─────────────────────────────────────────────────────────────────────────────
# Tool schema — mirrors ExecutionPlan exactly so the model is forced to match
# ─────────────────────────────────────────────────────────────────────────────

_EXECUTION_PLAN_TOOL_SCHEMA: dict = {
    "type": "object",
    "required": [
        "workflow", "images", "target_classes",
        "required_models", "optional_tools", "requested_outputs",
        "final_adapter", "fallback",
    ],
    "additionalProperties": False,
    "properties": {
        "workflow": {
            "type": "string",
            "enum": ["single", "temporal", "crossmodal"],
            "description": (
                "Pipeline workflow type. "
                "Use 'single' for one image. "
                "Use 'temporal' for two images of the same area at different dates. "
                "Use 'crossmodal' for two images of the same area from different sensor types (optical + SAR)."
            ),
        },
        "images": {
            "type": "array",
            "items": {"type": "string"},
            "description": "Ordered list of image_ids to process (from InputProfiles).",
        },
        "target_classes": {
            "type": "array",
            "items": {"type": "string"},
            "description": (
                "Land-cover/object classes to analyse. "
                "MUST only use classes that appear in the 'classes' list of every required_model."
            ),
        },
        "required_models": {
            "type": "array",
            "items": {"type": "string"},
            "description": (
                "Model IDs from the CAPABILITY REGISTRY to invoke. "
                "Use EXACT ids as listed (e.g. 'SEG_RGB_v1'). Do NOT invent model ids."
            ),
        },
        "optional_tools": {
            "type": "array",
            "items": {"type": "string"},
            "description": (
                "Scientific tools to run after model inference. "
                "Format: 'compute_spectral_index:NDWI' or 'compute_spectral_index:NDVI'. "
                "Only include if the user asks for a spectral index or vegetation/water index."
            ),
        },
        "requested_outputs": {
            "type": "array",
            "items": {
                "type": "string",
                "enum": ["masks", "measurements", "area_estimate", "change_map", "confidence_map"],
            },
            "description": "Output types the user needs. Always include 'masks'.",
        },
        "final_adapter": {
            "type": ["string", "null"],
            "description": (
                "LoRA adapter id for the answerer VLM. "
                "Set to null — fine-tuned adapters are not yet deployed. "
                "(When ready: 'LORA_GENERAL_v1' for single, 'LORA_TEMPORAL_v1' for temporal, "
                "'LORA_CROSSMODAL_v1' for crossmodal.)"
            ),
        },
        "fallback": {
            "type": ["string", "null"],
            "description": "Fallback strategy if primary workflow fails. Usually null.",
        },
    },
}


# ─────────────────────────────────────────────────────────────────────────────
# System prompt for the planner agent
# ─────────────────────────────────────────────────────────────────────────────

_PLANNER_SYSTEM = (
    "You are the SatQuery AI Planning Agent — an expert in satellite remote sensing, "
    "geospatial analysis, and multi-modal AI pipelines.\n"
    "Your ONLY job is to call the create_execution_plan function with a valid plan.\n"
    "Never return plain text. Never add explanation outside the function call.\n"
    "Think carefully before selecting models: only choose models whose band/modality "
    "requirements match the available InputProfiles."
)


# ─────────────────────────────────────────────────────────────────────────────
# Few-shot examples embedded in the prompt for reliable structured output
# ─────────────────────────────────────────────────────────────────────────────

_FEW_SHOT_EXAMPLES = """
EXAMPLES (input → correct plan structure):

Example 1
Query: "How much water is in this Sentinel-2 image?"
Profiles: 1 optical image, bands [R, G, B], pixel_spacing=10m
→ workflow=single, required_models=[SEG_RGB_v1], target_classes=[water],
  optional_tools=[], requested_outputs=[masks, measurements, area_estimate]

Example 2
Query: "Has the vegetation cover changed between the two images?"
Profiles: 2 optical images same area, different dates
→ workflow=temporal, required_models=[SEG_RGB_v1], target_classes=[vegetation],
  optional_tools=[], requested_outputs=[masks, measurements, change_map]

Example 3
Query: "Compare the flood extent using both the SAR and optical images."
Profiles: 1 Sentinel-1 SAR image + 1 Sentinel-2 optical image, same area
→ workflow=crossmodal, required_models=[SEG_SAR_VV_VH_v1, SEG_RGB_v1],
  target_classes=[water], optional_tools=[], requested_outputs=[masks, measurements]

Example 4
Query: "Calculate the NDWI for this multispectral image."
Profiles: 1 optical image with NIR band
→ workflow=single, required_models=[SEG_RGB_v1], target_classes=[water],
  optional_tools=[compute_spectral_index:NDWI], requested_outputs=[masks, measurements]
"""


# ─────────────────────────────────────────────────────────────────────────────
# Prompt builder
# ─────────────────────────────────────────────────────────────────────────────

def _build_planner_prompt(
    query: str,
    input_profiles: list[InputProfile],
    intent_hints: Optional[dict[str, Any]] = None,
) -> str:
    """Build the full planning prompt including registry context, intent hints, and profiles."""
    registry_entries = registry_loader.query()
    registry_summary = []
    for entry in registry_entries:
        registry_summary.append({
            "id":       entry.id,
            "type":     entry.type,
            "modality": entry.modality,
            "task":     getattr(entry, "task", None),
            "classes":  entry.classes,
            "bands_required": entry.input_contract.get("bands") or entry.input_contract.get("polarization_order"),
            "resolution_range_m": getattr(entry, "resolution_range_m", None),
        })

    profiles_summary = [p.model_dump() for p in input_profiles]
    intent_hints = intent_hints or classify_intent(query, input_profiles)

    prompt = (
        f"{_FEW_SHOT_EXAMPLES}\n\n"
        "━━━ NOW PLAN THE FOLLOWING ━━━\n\n"
        f"USER QUERY: {query}\n\n"
        f"INTENT CLASSIFICATION HINTS:\n{json.dumps(intent_hints, indent=2)}\n\n"
        f"INPUT PROFILES (images available):\n{json.dumps(profiles_summary, indent=2)}\n\n"
        f"CAPABILITY REGISTRY (ONLY use model IDs from this list):\n{json.dumps(registry_summary, indent=2)}\n\n"
        "RULES:\n"
        "1. Follow the INTENT CLASSIFICATION HINTS for workflow type and target classes unless contradicted by profiles.\n"
        "   - If only 1 image profile is available: workflow MUST be 'single'. Never choose 'temporal' or 'crossmodal' for 1 image.\n"
        "   - If 2 images are available and one is SAR and the other is Optical: workflow MUST be 'crossmodal', and required_models MUST include both an optical model (e.g. 'SEG_RGB_v1') and a SAR model (e.g. 'SEG_SAR_VV_VH_v1').\n"
        "   - If 2 images of the same modality (both optical or both SAR) are available at different dates: workflow is 'temporal'.\n"
        "2. Select required_models ONLY from the CAPABILITY REGISTRY above. Never invent a model id.\n"
        "3. target_classes must only contain class names supported by ALL required_models.\n"
        "4. For optional_tools use format 'compute_spectral_index:INDEX_NAME' (INDEX_NAME = NDVI, NDWI, etc.).\n"
        "5. Set final_adapter to null — LoRA adapters are not yet deployed.\n"
        "6. Workflow must be exactly one of: 'single', 'temporal', 'crossmodal'.\n"
        "7. Call the create_execution_plan function — do NOT return plain text.\n"
    )
    return prompt



# ─────────────────────────────────────────────────────────────────────────────
# Public: initial plan
# ─────────────────────────────────────────────────────────────────────────────

def plan(
    query: str,
    image_ids: list[str],
    input_profiles: list[InputProfile],
    intent_hints: Optional[dict[str, Any]] = None,
) -> ExecutionPlan:
    """
    Ask the VLM (via tool calling) to produce an ExecutionPlan.
    Retries once with error context if the model returns unexpected output.

    Raises:
        PlannerParseError — after all retries are exhausted.
    """
    prompt = _build_planner_prompt(query, input_profiles, intent_hints)

    try:
        args = generate_agent_with_tool_call(
            prompt=prompt,
            tool_name="create_execution_plan",
            tool_schema=_EXECUTION_PLAN_TOOL_SCHEMA,
            system=_PLANNER_SYSTEM,
        )
        # Inject actual image_ids (model may echo them correctly, but enforce ground truth)
        args["images"] = image_ids
        return ExecutionPlan.model_validate(args)

    except Exception as first_err:
        logger.warning("Planner first attempt failed: %s — retrying with error context.", first_err)
        retry_prompt = (
            f"{prompt}\n\n"
            "⚠️  ATTENTION: Your previous response was invalid.\n"
            f"ERROR: {first_err}\n"
            "Fix the error. Call create_execution_plan with a corrected plan. "
            "Do NOT return plain text."
        )
        try:
            args = generate_agent_with_tool_call(
                prompt=retry_prompt,
                tool_name="create_execution_plan",
                tool_schema=_EXECUTION_PLAN_TOOL_SCHEMA,
                system=_PLANNER_SYSTEM,
            )
            args["images"] = image_ids
            return ExecutionPlan.model_validate(args)
        except Exception as second_err:
            raise PlannerParseError(
                f"Planner failed after retry. First: {first_err}. Second: {second_err}"
            ) from second_err


# ─────────────────────────────────────────────────────────────────────────────
# Public: validation-aware replan (called from pipeline.py after validator rejects)
# ─────────────────────────────────────────────────────────────────────────────

def replan(
    query: str,
    image_ids: list[str],
    input_profiles: list[InputProfile],
    rejected_plan: ExecutionPlan,
    rejection_errors: list[str],
    intent_hints: Optional[dict[str, Any]] = None,
) -> ExecutionPlan:
    """
    Self-reflection loop: the model sees its own rejected plan + validation
    errors and produces a corrected plan.

    Called by pipeline.py — do NOT call this directly from the API layer.

    Raises:
        PlannerParseError — if the corrected plan also fails to parse.
    """
    base_prompt  = _build_planner_prompt(query, input_profiles, intent_hints)
    error_lines  = "\n".join(f"  • {e}" for e in rejection_errors)
    replan_prompt = (
        f"{base_prompt}\n\n"
        "━━━ REPLANNING REQUIRED ━━━\n"
        "Your previous plan was REJECTED by the validation engine.\n\n"
        f"REJECTED PLAN:\n{rejected_plan.model_dump_json(indent=2)}\n\n"
        f"REJECTION REASONS:\n{error_lines}\n\n"
        "REPLANNING RULES:\n"
        "1. Fix every rejection reason listed above.\n"
        "2. If the rejection was related to Temporal or Cross-modal workflow requiring at least 2 images:\n"
        "   - Switch workflow to 'single' with 1 primary image and matching model.\n"
        "3. If the rejection was related to modality mismatch or incompatible pair under temporal workflow:\n"
        "   - If one image is SAR and the other is Optical, switch workflow to 'crossmodal' and include both optical and SAR models (e.g. ['SEG_RGB_v1', 'SEG_SAR_VV_VH_v1']).\n"
        "   - Otherwise, switch workflow to 'single' to analyze the primary image so the pipeline succeeds.\n"
        "4. Call create_execution_plan with the corrected plan."
    )

    logger.info("Replanning with %d validation errors.", len(rejection_errors))
    try:
        args = generate_agent_with_tool_call(
            prompt=replan_prompt,
            tool_name="create_execution_plan",
            tool_schema=_EXECUTION_PLAN_TOOL_SCHEMA,
            system=_PLANNER_SYSTEM,
        )
        args["images"] = image_ids
        return ExecutionPlan.model_validate(args)
    except Exception as e:
        raise PlannerParseError(f"Replan also failed: {e}") from e
