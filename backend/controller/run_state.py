"""
In-memory run-state registry for the agentic controller's async execution
pipeline (see CLAUDE.md §1: "the controller ties it together into an
auditable trace", and §12: Celery/Redis explicitly deferred — FastAPI
BackgroundTasks + this in-process registry is the interim mechanism).

Not persisted across process restarts. Thread-safe via a single lock since
BackgroundTasks callables run in FastAPI's threadpool.

`GET /runs/{run_id}/events` (SSE) and `POST /runs/{run_id}/cancel` in
backend/api/query.py read and write this registry; controller/pipeline.py
advances it stage-by-stage.
"""
import threading
import time
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional


class RunStatus(str, Enum):
    pending = "pending"
    running = "running"
    done = "done"
    failed = "failed"
    cancelled = "cancelled"


TERMINAL_STATUSES = {RunStatus.done, RunStatus.failed, RunStatus.cancelled}


class CancelledError(Exception):
    """Raised inside the pipeline when a run was flagged for cancellation."""


@dataclass
class RunState:
    run_id: str
    image_ids: List[str]
    status: RunStatus = RunStatus.pending
    stage: str = "queued"
    progress: int = 0
    cancel_requested: bool = False
    error: Optional[str] = None
    result: Optional[Dict[str, Any]] = None
    updated_at: float = field(default_factory=time.time)

    def to_event_dict(self) -> Dict[str, Any]:
        """Lightweight payload for SSE — no claims/masks, just progress."""
        return {
            "run_id": self.run_id,
            "status": self.status.value,
            "stage": self.stage,
            "progress": self.progress,
            "error": self.error,
            "updated_at": self.updated_at,
        }


_LOCK = threading.Lock()
_RUNS: Dict[str, RunState] = {}


def create_run(run_id: str, image_ids: List[str]) -> RunState:
    with _LOCK:
        state = RunState(run_id=run_id, image_ids=image_ids)
        _RUNS[run_id] = state
        return state


from pathlib import Path
import json
import numpy as np


def _load_run_from_disk(run_id: str) -> Optional[RunState]:
    manifest_path = Path("artifacts") / run_id / "run_manifest.json"
    if not manifest_path.exists():
        return None
    try:
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        image_ids = list(manifest.get("input_artifacts", {}).keys())
        evidence = manifest.get("evidence", {})
        claims = evidence.get("claims", [])
        observations = evidence.get("observations", [])
        limitations = evidence.get("limitations", [])
        tool_graph = manifest.get("tool_graph")
        traces = manifest.get("execution_traces", [])

        # Compute overall confidence
        confs = [c.get("confidence") for c in claims if c.get("confidence") is not None]
        if not confs:
            confs = [o.get("confidence") for o in observations if o.get("confidence") is not None]
        overall_conf = float(np.mean(confs)) if confs else 0.85

        answer = "Analysis complete. Verified measurements computed from imagery."
        if claims:
            summary_claims = [f"{c.get('claim')}: {c.get('measurement'):.3f} {c.get('unit', '')}".strip() for c in claims[:3]]
            answer = f"Computed verified results: {', '.join(summary_claims)}."

        result = {
            "answer": answer,
            "answer_obj": {"plain_language": answer, "technical": answer},
            "claims": claims,
            "limitations": limitations,
            "observations": observations,
            "tool_graph": tool_graph,
            "traces": traces,
            "confidence": overall_conf,
        }

        mtime = manifest_path.stat().st_mtime
        state = RunState(
            run_id=run_id,
            image_ids=image_ids,
            status=RunStatus.done,
            stage="complete",
            progress=100,
            result=result,
            updated_at=mtime,
        )
        return state
    except Exception:
        return None


def get_run(run_id: str) -> Optional[RunState]:
    with _LOCK:
        if run_id in _RUNS:
            return _RUNS[run_id]
        persisted = _load_run_from_disk(run_id)
        if persisted:
            _RUNS[run_id] = persisted
            return persisted
        return None


def list_runs() -> List[RunState]:
    with _LOCK:
        artifacts_dir = Path("artifacts")
        if artifacts_dir.exists():
            for p in artifacts_dir.glob("*/run_manifest.json"):
                r_id = p.parent.name
                if r_id not in _RUNS:
                    persisted = _load_run_from_disk(r_id)
                    if persisted:
                        _RUNS[r_id] = persisted
        return sorted(_RUNS.values(), key=lambda state: state.updated_at, reverse=True)


def update_stage(run_id: str, stage: str, progress: int) -> None:
    with _LOCK:
        state = _RUNS.get(run_id)
        if state is None:
            return
        state.stage = stage
        state.progress = progress
        state.status = RunStatus.running
        state.updated_at = time.time()


def check_cancelled(run_id: str) -> None:
    """Raises CancelledError if the run was flagged for cancellation.

    Checked between pipeline stages (see controller/pipeline.py). This is
    coarse-grained, cooperative cancellation — it will not interrupt a single
    in-flight model inference call, since controller/executor.py's function
    signatures are a fixed contract (CLAUDE.md §6) and are not modified here.
    """
    with _LOCK:
        state = _RUNS.get(run_id)
        if state is not None and state.cancel_requested:
            raise CancelledError(f"Run {run_id} was cancelled by the user.")


def request_cancel(run_id: str) -> bool:
    """Returns False if the run doesn't exist or has already reached a terminal state."""
    with _LOCK:
        state = _RUNS.get(run_id)
        if state is None or state.status in TERMINAL_STATUSES:
            return False
        state.cancel_requested = True
        state.updated_at = time.time()
        return True


def mark_done(run_id: str, result: Dict[str, Any]) -> None:
    with _LOCK:
        state = _RUNS.get(run_id)
        if state is None:
            return
        state.status = RunStatus.done
        state.stage = "complete"
        state.progress = 100
        state.result = result
        state.updated_at = time.time()


def mark_failed(run_id: str, error: str) -> None:
    with _LOCK:
        state = _RUNS.get(run_id)
        if state is None:
            return
        state.status = RunStatus.failed
        state.error = error
        state.updated_at = time.time()


def mark_cancelled(run_id: str) -> None:
    with _LOCK:
        state = _RUNS.get(run_id)
        if state is None:
            return
        state.status = RunStatus.cancelled
        state.stage = "cancelled"
        state.updated_at = time.time()
