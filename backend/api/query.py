"""
Implements the query submission and run-status surface described in
architecture.md §3.2 (API Gateway / Agentic Controller). Execution is
delegated to controller/pipeline.py and runs as a FastAPI BackgroundTask
(Celery/Redis explicitly deferred, CLAUDE.md §12). Progress, cancellation,
and live event streaming are backed by controller/run_state.py.
"""
import asyncio
import json
import uuid
from typing import List

from fastapi import APIRouter, BackgroundTasks, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from backend.controller import run_state
from backend.controller.pipeline import run_query_pipeline

router = APIRouter(tags=["query"])


class QueryRequest(BaseModel):
    query: str
    image_ids: List[str]


@router.post("/query")
async def submit_query(request: QueryRequest, background_tasks: BackgroundTasks):
    """
    Submits a natural language query for processing. Kicks off the real
    ingest -> plan -> validate -> execute -> evidence -> answer -> verify
    pipeline as a background task; poll GET /runs/{run_id} or subscribe to
    GET /runs/{run_id}/events for progress.
    """
    run_id = str(uuid.uuid4())
    run_state.create_run(run_id, request.image_ids)
    background_tasks.add_task(run_query_pipeline, run_id, request.query, request.image_ids)
    return {"status": "accepted", "run_id": run_id}


@router.get("/runs/{run_id}")
async def get_run_status(run_id: str):
    """
    Polls the status of a run. Returns the full result payload (answer,
    claims, limitations, traces) once status is "done".
    """
    state = run_state.get_run(run_id)
    if state is None:
        raise HTTPException(status_code=404, detail=f"Run {run_id} not found.")

    payload = {
        "run_id": state.run_id,
        "status": state.status.value,
        "stage": state.stage,
        "progress": state.progress,
        "image_ids": state.image_ids,
    }
    if state.status == run_state.RunStatus.done and state.result:
        payload.update(state.result)
    if state.status == run_state.RunStatus.failed and state.error:
        payload["error"] = state.error
    return payload


@router.post("/runs/{run_id}/cancel")
async def cancel_run(run_id: str):
    """
    Requests cancellation of a running (or pending) job. Cancellation is
    cooperative — the pipeline checks for it between stages (see
    controller/run_state.check_cancelled), so it will not interrupt a single
    in-flight model inference call.
    """
    ok = run_state.request_cancel(run_id)
    if not ok:
        existing = run_state.get_run(run_id)
        if existing is None:
            raise HTTPException(status_code=404, detail=f"Run {run_id} not found.")
        raise HTTPException(
            status_code=409,
            detail=f"Run {run_id} is already {existing.status.value} and cannot be cancelled.",
        )
    return {"status": "cancel_requested", "run_id": run_id}


@router.get("/runs/{run_id}/events")
async def stream_run_events(run_id: str):
    """
    Server-Sent Events stream of stage transitions (Ingesting -> Validating ->
    Executing Tool -> VLM Synthesis -> ...) for the Job Centre. Closes the
    stream once the run reaches a terminal state.
    """

    async def event_generator():
        last_payload = None
        while True:
            state = run_state.get_run(run_id)
            if state is None:
                yield f"event: error\ndata: {json.dumps({'detail': 'Run not found'})}\n\n"
                return

            payload = state.to_event_dict()
            if payload != last_payload:
                yield f"data: {json.dumps(payload)}\n\n"
                last_payload = payload

            if state.status in run_state.TERMINAL_STATUSES:
                return

            await asyncio.sleep(0.5)

    return StreamingResponse(event_generator(), media_type="text/event-stream")


@router.get("/runs/{run_id}/graph")
async def get_run_graph(run_id: uuid.UUID):
    """
    Returns the evidence graph nodes and edges for the run.
    """
    # Mock behavior — Evidence Explorer graph wiring is tracked separately
    # (architecture.md §15) and is additive, not part of Quick Query scope.
    return {
        "nodes": [
            {"id": "reg_123", "type": "region", "label": "Region 1"}
        ],
        "edges": []
    }
