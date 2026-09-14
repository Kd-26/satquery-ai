"""
Orchestrates the end-to-end agentic query pipeline described in CLAUDE.md §1:

    ingest -> plan (VLM proposes) -> validate (deterministic rule engine) ->
    execute (specialist tools/models) -> build evidence -> answer (VLM
    explains) -> verify (no invented numbers).

Implements architecture.md §3 (agentic controller). Runs as a FastAPI
BackgroundTask — Celery/Redis are explicitly deferred per CLAUDE.md §12.
Progress and cooperative cancellation are tracked via
backend.controller.run_state, which backend/api/query.py's
`/runs/{run_id}/events` (SSE) and `/runs/{run_id}/cancel` endpoints read/write.

Each stage transition is recorded so the frontend Job Centre can show real
stage names (Ingesting -> Planning -> Validating -> Executing Tool -> VLM
Synthesis -> Verifying) instead of a generic spinner.
"""
import json
from typing import List

from backend.controller import run_state
from backend.controller.ingestion import resolve_metadata
from backend.controller.planner import plan as planner_plan, replan as planner_replan, PlannerParseError
from backend.controller.validator import validate_plan
from backend.controller.executor import (
    run_single_image_workflow,
    run_temporal_workflow,
    run_crossmodal_workflow,
    ExecutorError,
)
from backend.controller.preprocessing import IncompatibleInputError
from backend.controller.evidence import build_evidence_package
from backend.controller.answerer import generate_answer
from backend.controller.answerer import generate_direct_answer
from backend.controller.verifier import verify_answer_hybrid, get_conservative_fallback
from backend.controller.intent import classify_intent, route_query
from backend.controller.visual_specialist import collect_visual_evidence, VisualSpecialistError
from backend.services.provider_service import ProviderError
from backend.controller.scientific_tool_executor import (
    ScientificToolError,
    ensure_preview,
    execute_scientific_route,
)
from backend.schemas.execution_plan import ExecutionPlan
from backend.schemas.validation_result import ValidationResult
from backend.controller.reproducibility import write_run_manifest
from backend.controller.tool_graph import build_tool_graph
from backend.schemas.tool_execution import ToolResult

_WORKFLOW_DISPATCH = {
    "single": run_single_image_workflow,
    "temporal": run_temporal_workflow,
    "crossmodal": run_crossmodal_workflow,
}


def run_query_pipeline(run_id: str, query: str, image_ids: List[str], external_image_consent: bool = False) -> None:
    """
    Entry point scheduled via FastAPI BackgroundTasks from POST /api/v1/query.
    Never raises — all failures are recorded on the run_state registry so the
    API layer and SSE stream can report them, per the project's "fail loud,
    never silently degrade" rule (CLAUDE.md §9, §14).
    """
    try:
        run_state.check_cancelled(run_id)
        run_state.update_stage(run_id, "ingesting", 10)
        profiles = [resolve_metadata(image_id) for image_id in image_ids]

        run_state.check_cancelled(run_id)
        run_state.update_stage(run_id, "routing", 18)
        # OpenAI supplies structured semantic intent hints. The deterministic
        # router remains the final policy gate so no model can silently unlock
        # quantitative or segmentation work.
        intent_hints = classify_intent(query, profiles)
        route = route_query(query, profiles)

        if route.mode != "general_knowledge" and not image_ids:
            run_state.mark_failed(run_id, "This query requires at least one uploaded image.")
            return

        # Conversational questions do not need a raster plan or scientific tools.
        if route.mode == "general_knowledge":
            run_state.update_stage(run_id, "vlm_synthesis", 80)
            answer_obj = generate_direct_answer(query)
            run_state.mark_done(run_id, {
                "answer": answer_obj["plain_language"],
                "answer_obj": answer_obj,
                "claims": [],
                "limitations": ["This is a general-knowledge response; no raster analysis was performed."],
                "route": route.model_dump(),
                "intent": intent_hints,
                "traces": [{"step": "direct_vlm", "status": "success"}],
            })
            return

        # Qualitative visual interpretation sees a display preview and metadata,
        # but deliberately does not create masks or quantitative claims.
        if route.mode == "visual_interpretation":
            run_state.update_stage(run_id, "preparing_preview", 40)
            previews = [ensure_preview(image_id) for image_id in image_ids]
            metadata = json.dumps([p.model_dump(mode="json") for p in profiles], indent=2)
            run_state.update_stage(run_id, "visual_interpretation", 80)
            try:
                observations = collect_visual_evidence(
                    run_id=run_id,
                    workflow="single",
                    query=f"{query}\n\nVERIFIED IMAGE METADATA:\n{metadata}",
                    image_ids=image_ids,
                    previews=previews,
                    external_image_consent=external_image_consent,
                )
            except (ProviderError, VisualSpecialistError) as exc:
                run_state.mark_failed(run_id, f"Visual interpretation failed: {exc}")
                return
            answer_text = observations[0].statement
            answer_obj = {"technical": answer_text, "plain_language": answer_text}
            visual_evidence = _empty_evidence(run_id).model_copy(update={"observations": observations})
            visual_verification = verify_answer_hybrid(answer_text, visual_evidence)
            limitations = [
                "This is qualitative visual interpretation, not segmentation or a physical measurement."
            ]
            if not visual_verification.passed:
                safe = (
                    "The visual response included unsupported quantitative details and was withheld. "
                    "Run an appropriate scientific measurement tool for quantitative results."
                )
                answer_obj = {"technical": safe, "plain_language": safe}
                limitations.extend(visual_verification.flagged_claims)
            run_state.mark_done(run_id, {
                "answer": answer_obj["plain_language"],
                "answer_obj": answer_obj,
                "claims": [],
                "limitations": limitations,
                "route": route.model_dump(),
                "intent": intent_hints,
                "observations": [value.model_dump() for value in observations],
                "verification": {"plain_language": visual_verification.model_dump()},
                "traces": [{"step": "vision_vlm_interpret", "status": "success", "images_supplied": len(previews)}],
            })
            return

        # Non-segmentation scientific routes are deterministic. The VLM only
        # explains the resulting evidence after tools have finished.
        if not route.requires_segmentation:
            run_state.update_stage(run_id, f"executing_tool:{route.mode}", 55)
            try:
                workflow_result = execute_scientific_route(route, image_ids, profiles, run_id=run_id)
            except ScientificToolError as e:
                run_state.mark_failed(run_id, f"Scientific tool execution failed: {e}")
                return
            if route.mode == "temporal_analysis":
                _attach_visual_evidence(
                    workflow_result=workflow_result,
                    run_id=run_id,
                    workflow="temporal",
                    query=query,
                    image_ids=image_ids,
                    external_image_consent=external_image_consent,
                )
            scientific_plan = ExecutionPlan(
                workflow="temporal" if route.mode == "temporal_analysis" else "single",
                images=image_ids,
                target_classes=[],
                required_models=[],
                optional_tools=route.required_tools,
                requested_outputs=["statistics"],
                final_adapter=None,
                fallback=None,
            )
            validation = ValidationResult(approved=True, restrictions=[], errors=[], confidence_caps={})
            run_state.update_stage(run_id, "building_evidence", 72)
            evidence = build_evidence_package(run_id, workflow_result, scientific_plan, validation)
            write_run_manifest(
                run_id, scientific_plan, evidence, profiles,
                workflow_result.get("tool_graph"), workflow_result.get("traces"),
            )
            run_state.update_stage(run_id, "vlm_synthesis", 86)
            answer_obj = generate_answer(query, evidence, scientific_plan)
            run_state.update_stage(run_id, "verifying", 96)
            technical_check = verify_answer_hybrid(answer_obj["technical"], evidence)
            plain_check = verify_answer_hybrid(answer_obj["plain_language"], evidence)
            limitations = list(evidence.limitations)
            if not technical_check.passed or not plain_check.passed:
                fallback_text = get_conservative_fallback(evidence)
                answer_obj = {"technical": fallback_text, "plain_language": fallback_text}
                limitations.append("VLM synthesis failed evidence verification; showing computed evidence only.")
            run_state.mark_done(run_id, {
                "answer": answer_obj["plain_language"],
                "answer_obj": answer_obj,
                "claims": [c.model_dump() for c in evidence.claims],
                "limitations": limitations,
                "route": route.model_dump(),
                "intent": intent_hints,
                "observations": [value.model_dump() for value in evidence.observations],
                "verification": {
                    "technical": technical_check.model_dump(),
                    "plain_language": plain_check.model_dump(),
                },
                "tool_outputs": workflow_result["tool_outputs"],
                "tool_graph": workflow_result["tool_graph"],
                "traces": workflow_result["traces"],
            })
            return

        run_state.check_cancelled(run_id)
        run_state.update_stage(run_id, "planning", 25)
        try:
            execution_plan = planner_plan(query, image_ids, profiles, intent_hints)
        except PlannerParseError as e:
            run_state.mark_failed(run_id, f"Planning failed: {e}")
            return

        run_state.check_cancelled(run_id)
        run_state.update_stage(run_id, "validating", 40)
        validation = validate_plan(execution_plan, profiles)
        if not validation.approved:
            # Give the planner one self-reflection pass with the rejection reasons
            run_state.update_stage(run_id, "replanning", 45)
            try:
                execution_plan = planner_replan(
                    query,
                    image_ids,
                    profiles,
                    execution_plan,
                    validation.errors,
                    intent_hints,
                )
            except PlannerParseError as e:
                run_state.mark_failed(run_id, f"Replanning failed: {e}")
                return
            validation = validate_plan(execution_plan, profiles)
            if not validation.approved:
                run_state.mark_failed(
                    run_id,
                    "Plan rejected after replanning: " + "; ".join(validation.errors)
                )
                return

        run_state.check_cancelled(run_id)
        workflow_fn = _WORKFLOW_DISPATCH.get(execution_plan.workflow)
        if workflow_fn is None:
            run_state.mark_failed(
                run_id,
                f"Unsupported workflow type '{execution_plan.workflow}'. "
                f"Expected one of: {', '.join(_WORKFLOW_DISPATCH)}.",
            )
            return

        run_state.update_stage(run_id, f"executing_tool:{execution_plan.workflow}", 60)
        try:
            workflow_result = workflow_fn(execution_plan, validation, external_image_consent)
        except (ExecutorError, IncompatibleInputError) as e:
            run_state.mark_failed(run_id, f"Execution failed: {e}")
            return

        segmentation_graph = build_tool_graph(route)
        segmentation_results = []
        optional_limitations = []
        for node in segmentation_graph.nodes:
            skipped = node.tool == "generate_overlay" and not workflow_result.get("overlays")
            if skipped:
                optional_limitations.append("Optional overlay generation was skipped; georeferenced mask artifacts remain available.")
            value = (
                workflow_result.get("measurements", {}) if node.tool == "measure_regions"
                else list(workflow_result.get("masks", {})) if node.tool == "segment_features"
                else {"completed": not skipped}
            )
            segmentation_results.append(ToolResult(
                node_id=node.id, tool=node.tool,
                status="skipped" if skipped else "success", required=node.required,
                value=value, crs=profiles[0].crs if profiles else None,
                source_images=image_ids,
                source_bands=profiles[0].band_identities if profiles else [],
                derivation=node.depends_on,
                warnings=[optional_limitations[-1]] if skipped else [],
            ).model_dump(mode="json"))
        workflow_result["tool_graph"] = segmentation_graph.model_dump(mode="json")
        workflow_result.setdefault("tool_outputs", {})["tool_results"] = segmentation_results
        workflow_result.setdefault("limitations", []).extend(optional_limitations)
        _attach_visual_evidence(
            workflow_result=workflow_result,
            run_id=run_id,
            workflow=execution_plan.workflow,
            query=query,
            image_ids=image_ids,
            external_image_consent=external_image_consent,
        )

        run_state.check_cancelled(run_id)
        run_state.update_stage(run_id, "building_evidence", 75)
        evidence = build_evidence_package(run_id, workflow_result, execution_plan, validation)
        write_run_manifest(
            run_id, execution_plan, evidence, profiles,
            workflow_result.get("tool_graph"), workflow_result.get("traces"),
        )

        run_state.check_cancelled(run_id)
        run_state.update_stage(run_id, "vlm_synthesis", 90)
        answer_obj = generate_answer(query, evidence, execution_plan)

        run_state.check_cancelled(run_id)
        run_state.update_stage(run_id, "verifying", 97)
        technical_verification = verify_answer_hybrid(answer_obj["technical"], evidence)
        plain_verification = verify_answer_hybrid(answer_obj["plain_language"], evidence)

        limitations = list(evidence.limitations)
        if not technical_verification.passed or not plain_verification.passed:
            # A failed verification disables the VLM's rhetorical answer, not
            # the whole result — fall back to the evidence-only template
            # (CLAUDE.md §1: "no number in the final answer may be invented").
            fallback_text = get_conservative_fallback(evidence)
            answer_obj = {"technical": fallback_text, "plain_language": fallback_text}
            limitations.append(
                "VLM answer failed verification (unsupported claims); "
                "showing an evidence-only fallback instead."
            )

        result = {
            "answer": answer_obj["plain_language"],
            "answer_obj": answer_obj,
            "claims": [c.model_dump() for c in evidence.claims],
            "limitations": limitations,
            "traces": workflow_result.get("traces", []),
            "route": route.model_dump(),
            "intent": intent_hints,
            "observations": [value.model_dump() for value in evidence.observations],
            "verification": {
                "technical": technical_verification.model_dump(),
                "plain_language": plain_verification.model_dump(),
            },
            "tool_outputs": workflow_result.get("tool_outputs", {}),
            "tool_graph": workflow_result.get("tool_graph"),
        }
        run_state.mark_done(run_id, result)

    except run_state.CancelledError:
        run_state.mark_cancelled(run_id)
    except Exception as e:  # noqa: BLE001 — top-level pipeline boundary, must never crash the worker
        run_state.mark_failed(run_id, f"Unexpected pipeline error: {type(e).__name__}: {e}")


def _empty_evidence(run_id: str):
    from backend.schemas.evidence_package import EvidencePackage

    return EvidencePackage(
        run_id=run_id,
        claims=[],
        masks_ref={},
        overlays_ref={},
        limitations=[],
        model_versions={},
    )


def _attach_visual_evidence(
    *,
    workflow_result: dict,
    run_id: str,
    workflow: str,
    query: str,
    image_ids: list[str],
    external_image_consent: bool,
) -> None:
    """Best-effort Qwen enrichment for otherwise valid scientific output."""
    limitations = workflow_result.setdefault("limitations", [])
    if not external_image_consent:
        limitations.append(
            "Qwen visual observation was skipped because external image consent was not granted."
        )
        return
    try:
        previews = [ensure_preview(image_id) for image_id in image_ids]
        observations = collect_visual_evidence(
            run_id=run_id,
            workflow=workflow,
            query=query,
            image_ids=image_ids,
            previews=previews,
            external_image_consent=True,
        )
    except (ProviderError, VisualSpecialistError) as exc:
        limitations.append(f"Qwen visual observation was unavailable: {exc}")
        return
    workflow_result.setdefault("observations", []).extend(
        observation.model_dump() for observation in observations
    )
    workflow_result.setdefault("traces", []).append({
        "step": "qwen_visual_specialist",
        "workflow": workflow,
        "status": "success",
        "images_supplied": len(previews),
    })
