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
