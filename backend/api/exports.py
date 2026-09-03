from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy.orm import Session
import os

try:
    from backend.db.session import get_session
except ImportError:
    def get_session(): yield None

router = APIRouter(prefix="/runs/{run_id}/export", tags=["exports"])

@router.get("/geotiff")
def export_geotiff(run_id: str):
    """
    Zips all mask/index rasters for the given run.
    """
    # Mocking zip generation
    return {"status": "mock", "message": f"Exported GeoTIFFs for {run_id}"}

@router.get("/geojson")
def export_geojson(run_id: str, session: Session = Depends(get_session)):
    """
    Exports region boundaries via shapely/fiona from the regions PostGIS table.
    """
    # Mocking GeoJSON dump
    return {"type": "FeatureCollection", "features": []}

@router.get("/csv")
def export_csv(run_id: str, session: Session = Depends(get_session)):
    """
    Exports a flattened measurements table for the given run.
    """
    return {"status": "mock", "message": f"Exported CSV for {run_id}"}

@router.get("/stac")
def export_stac(run_id: str):
    """
    Exports the STAC catalog subset for this run (from Phase 15.3).
    """
    return {"stac_version": "1.0.0", "id": f"catalog_{run_id}", "type": "Catalog", "links": []}

@router.get("/audit-report")
def export_audit_report(run_id: str, session: Session = Depends(get_session)):
    """
    Exports a PDF report, reusing the existing report generator but including the full evidence graph.
    """
    return {"status": "mock", "message": f"Generated PDF Audit Report for {run_id}"}

from backend.controller.notebook_export import generate_notebook

@router.get("/notebook")
def export_notebook(run_id: str):
    """
    Generates and returns the reproducible Jupyter Notebook (.ipynb) for the run.
    """
    try:
        nb_path = generate_notebook(run_id)
        if os.path.exists(nb_path):
            return FileResponse(nb_path, media_type="application/x-ipynb+json", filename=f"{run_id}_reproducible.ipynb")
        else:
            raise HTTPException(status_code=404, detail="Notebook generation failed")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
