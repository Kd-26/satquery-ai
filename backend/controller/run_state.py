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


def get_run(run_id: str) -> Optional[RunState]:
    with _LOCK:
        return _RUNS.get(run_id)


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
