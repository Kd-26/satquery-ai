from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
import os

from backend.db.session import get_session
from backend.controller.notebook_export import generate_notebook

router = APIRouter(prefix="/runs/{run_id}/export", tags=["exports"])


@router.get("/geotiff")
async def export_geotiff(run_id: str) -> dict:
    """Zips all mask/index rasters for the given run."""
    # TODO: implement real zip generation from artifacts/{run_id}/masks/
    return {"status": "mock", "message": f"Exported GeoTIFFs for {run_id}"}


@router.get("/geojson")
async def export_geojson(
    run_id: str,
    session: AsyncSession = Depends(get_session),
) -> dict:
    """Exports region boundaries via shapely/fiona from the regions PostGIS table."""
    # TODO: query Region table and serialize geometries
    return {"type": "FeatureCollection", "features": []}


@router.get("/csv")
async def export_csv(
    run_id: str,
    session: AsyncSession = Depends(get_session),
) -> dict:
    """Exports a flattened measurements table for the given run."""
    # TODO: join EvidenceNode + Region tables and stream CSV
    return {"status": "mock", "message": f"Exported CSV for {run_id}"}


@router.get("/stac")
async def export_stac(run_id: str) -> dict:
    """Exports the STAC catalog subset for this run."""
    # TODO: load from artifacts/{run_id}/stac/catalog.json written by reproducibility.py
    return {"stac_version": "1.0.0", "id": f"catalog_{run_id}", "type": "Catalog", "links": []}


@router.get("/audit-report")
async def export_audit_report(
    run_id: str,
    session: AsyncSession = Depends(get_session),
) -> dict:
    """Exports a PDF report including the full evidence graph."""
    # TODO: invoke PDF generator
    return {"status": "mock", "message": f"Generated PDF Audit Report for {run_id}"}


@router.get("/notebook")
async def export_notebook(run_id: str):
    """Generates and returns the reproducible Jupyter Notebook (.ipynb) for the run."""
    try:
        nb_path = generate_notebook(run_id)
        if os.path.exists(nb_path):
            return FileResponse(
                nb_path,
                media_type="application/x-ipynb+json",
                filename=f"{run_id}_reproducible.ipynb",
            )
        raise HTTPException(status_code=404, detail="Notebook generation failed")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
