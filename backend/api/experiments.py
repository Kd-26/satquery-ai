from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Dict, Any
import uuid

from backend.db.session import get_session
from backend.db.models import Experiment
from backend.controller.experiments import create_experiment

router = APIRouter(tags=["experiments"])

@router.post("/runs/{run_id}/experiments")
async def api_create_experiment(
    run_id: uuid.UUID,
    parameter_overrides: Dict[str, Any] = Body(...),
    session: AsyncSession = Depends(get_session),
):
    """
    Creates an experiment from a parent run_id using the provided parameter overrides.
    Never mutates the parent run.
    """
    try:
        # Mocking fetching the parent plan — replace with real DB lookup when executor is wired
        parent_plan_dict = {"required_models": [], "images": [], "target_classes": []}

        experiment_id = await create_experiment(session, str(run_id), parameter_overrides, parent_plan_dict)
        return {"experiment_id": experiment_id, "status": "running"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/experiments/{experiment_id}")
async def api_get_experiment(
    experiment_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
):
    """
    Fetches the status and results of an experiment.
    """
    try:
        result = await session.execute(
            select(Experiment).where(Experiment.id == experiment_id)
        )
        exp = result.scalar_one_or_none()
        if not exp:
            raise HTTPException(status_code=404, detail="Experiment not found")

        return {
            "experiment_id": str(exp.id),
            "parent_run_id": exp.parent_run_id,
            "status": exp.status,
            "overrides": exp.parameter_overrides_json,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


from pydantic import BaseModel
import json
from pathlib import Path
from backend.db.models import FeedbackTag, FeedbackTagEnum


class CorrectionRequest(BaseModel):
    evidence_node_id: str
    geometry_geojson: dict
    operation: str  # "include" or "exclude"


@router.post("/experiments/{experiment_id}/corrections")
async def api_save_correction(
    experiment_id: uuid.UUID,
    request: CorrectionRequest,
    session: AsyncSession = Depends(get_session),
):
    """
    Stores a manual mask correction in the database and appends it to run_manifest.json.
    """
    try:
        result = await session.execute(
            select(Experiment).where(Experiment.id == experiment_id)
        )
        exp = result.scalar_one_or_none()
        if not exp:
            raise HTTPException(status_code=404, detail="Experiment not found")

        # 1. Save to database as a feedback tag
        correction_tag = FeedbackTag(
            evidence_node_id=uuid.UUID(request.evidence_node_id),
            tag=FeedbackTagEnum.accepted,
            reviewer_note=f"Manual {request.operation} correction applied via UI",
        )
        session.add(correction_tag)
        await session.commit()

        # 2. Append to run_manifest.json if it exists
        manifest_path = Path(f"./artifacts/{exp.parent_run_id}/run_manifest.json")
        if manifest_path.exists():
            with open(manifest_path, "r") as f:
                manifest = json.load(f)

            correction_entry = {
                "experiment_id": str(experiment_id),
                "evidence_node_id": request.evidence_node_id,
                "operation": request.operation,
                "geometry": request.geometry_geojson,
                "timestamp": str(correction_tag.created_at),
            }
            manifest.setdefault("user_corrections", []).append(correction_entry)

            with open(manifest_path, "w") as f:
                json.dump(manifest, f, indent=2)

        return {"status": "success", "message": "Correction saved and appended to manifest"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
