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
from backend.controller.evidence import build_evidence_package
from backend.controller.answerer import generate_answer
from backend.controller.verifier import verify_answer, get_conservative_fallback

_WORKFLOW_DISPATCH = {
    "single": run_single_image_workflow,
    "temporal": run_temporal_workflow,
    "crossmodal": run_crossmodal_workflow,
}


def run_query_pipeline(run_id: str, query: str, image_ids: List[str]) -> None:
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
        run_state.update_stage(run_id, "planning", 25)
        try:
            execution_plan = planner_plan(query, image_ids, profiles)
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
                    query, image_ids, profiles, execution_plan, validation.errors
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
            workflow_result = workflow_fn(execution_plan, validation)
        except ExecutorError as e:
            run_state.mark_failed(run_id, f"Execution failed: {e}")
            return

        run_state.check_cancelled(run_id)
        run_state.update_stage(run_id, "building_evidence", 75)
        evidence = build_evidence_package(run_id, workflow_result, execution_plan, validation)

        run_state.check_cancelled(run_id)
        run_state.update_stage(run_id, "vlm_synthesis", 90)
        answer_obj = generate_answer(query, evidence, execution_plan)

        run_state.check_cancelled(run_id)
        run_state.update_stage(run_id, "verifying", 97)
        verification = verify_answer(answer_obj["technical"], evidence)

        limitations = list(evidence.limitations)
        if not verification.passed:
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
        }
        run_state.mark_done(run_id, result)

    except run_state.CancelledError:
        run_state.mark_cancelled(run_id)
    except Exception as e:  # noqa: BLE001 — top-level pipeline boundary, must never crash the worker
        run_state.mark_failed(run_id, f"Unexpected pipeline error: {type(e).__name__}: {e}")
