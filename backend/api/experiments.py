from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from typing import Dict, Any
import uuid

try:
    from backend.db.session import get_session
except ImportError:
    def get_session(): yield None

from backend.db.models import Experiment
from backend.controller.experiments import create_experiment

router = APIRouter(tags=["experiments"])

@router.post("/runs/{run_id}/experiments")
def api_create_experiment(run_id: str, parameter_overrides: Dict[str, Any] = Body(...), session: Session = Depends(get_session)):
    """
    Creates an experiment from a parent run_id using the provided parameter overrides.
    Never mutates the parent run.
    """
    try:
        # Mocking fetching the parent plan
        parent_plan_dict = {"required_models": [], "images": [], "target_classes": []}
        
        experiment_id = create_experiment(session, run_id, parameter_overrides, parent_plan_dict)
        return {"experiment_id": experiment_id, "status": "running"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/experiments/{experiment_id}")
def api_get_experiment(experiment_id: str, session: Session = Depends(get_session)):
    """
    Fetches the status and results of an experiment.
    """
    try:
        exp = session.query(Experiment).filter(Experiment.id == uuid.UUID(experiment_id)).first()
        if not exp:
            raise HTTPException(status_code=404, detail="Experiment not found")
            
        return {
            "experiment_id": str(exp.id),
            "parent_run_id": exp.parent_run_id,
            "status": exp.status,
            "overrides": exp.parameter_overrides_json
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

from pydantic import BaseModel
import json
from pathlib import Path
from backend.db.models import FeedbackTag, FeedbackTagEnum

class CorrectionRequest(BaseModel):
    evidence_node_id: str
    geometry_geojson: dict
    operation: str # "include" or "exclude"

@router.post("/experiments/{experiment_id}/corrections")
def api_save_correction(experiment_id: str, request: CorrectionRequest, session: Session = Depends(get_session)):
    """
    Stores a manual mask correction in the database and appends it to run_manifest.json.
    """
    try:
        exp = session.query(Experiment).filter(Experiment.id == uuid.UUID(experiment_id)).first()
        if not exp:
            raise HTTPException(status_code=404, detail="Experiment not found")
            
        # 1. Save to database as a feedback tag
        correction_tag = FeedbackTag(
            evidence_node_id=uuid.UUID(request.evidence_node_id),
            tag=FeedbackTagEnum.accepted, # assuming manual correction implies accepting the rest and fixing it
            reviewer_note=f"Manual {request.operation} correction applied via UI"
        )
        session.add(correction_tag)
        session.commit()
        
        # 2. Append to run_manifest.json (Commit 3)
        # Assumes run_manifest.json exists in artifacts
        manifest_path = Path(f"./artifacts/{exp.parent_run_id}/run_manifest.json")
        if manifest_path.exists():
            with open(manifest_path, "r") as f:
                manifest = json.load(f)
            
            correction_entry = {
                "experiment_id": experiment_id,
                "evidence_node_id": request.evidence_node_id,
                "operation": request.operation,
                "geometry": request.geometry_geojson,
                "timestamp": str(correction_tag.created_at)
            }
            manifest.setdefault("user_corrections", []).append(correction_entry)
            
            with open(manifest_path, "w") as f:
                json.dump(manifest, f, indent=2)
                
        return {"status": "success", "message": "Correction saved and appended to manifest"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
