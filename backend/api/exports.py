import uuid
import csv
import json
import zipfile
from pathlib import Path
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse, JSONResponse
import os

from backend.controller.notebook_export import generate_notebook

router = APIRouter(prefix="/runs/{run_id}/export", tags=["exports"])


@router.get("/geotiff")
async def export_geotiff(run_id: uuid.UUID) -> FileResponse:
    """Zips all mask/index rasters for the given run."""
    run_dir = Path("artifacts") / str(run_id)
    files = list(run_dir.glob("masks/*.tif")) + list(run_dir.glob("derived/*.tif"))
    if not files:
        raise HTTPException(status_code=404, detail="No GeoTIFF outputs are available for this run")
    archive = run_dir / f"{run_id}_geotiffs.zip"
    with zipfile.ZipFile(archive, "w", compression=zipfile.ZIP_DEFLATED) as bundle:
        for file in files:
            bundle.write(file, file.relative_to(run_dir))
    return FileResponse(archive, media_type="application/zip", filename=f"{run_id}_geotiffs.zip")


@router.get("/geojson")
async def export_geojson(
    run_id: uuid.UUID,
) -> JSONResponse:
    """Polygonize georeferenced result masks into WGS84 GeoJSON features."""
    import numpy as np
    import rasterio
    from rasterio.features import shapes
    from rasterio.warp import transform_geom
    features = []
    mask_paths = list((Path("artifacts") / str(run_id) / "masks").glob("*.tif"))
    if not mask_paths:
        raise HTTPException(status_code=404, detail="No mask boundaries are available for this run")
    for mask_path in mask_paths:
        with rasterio.open(mask_path) as src:
            if src.crs is None:
                continue
            mask = src.read(1)
            selected = mask > 0
            for geometry, value in shapes(mask.astype(np.uint8), mask=selected, transform=src.transform):
                features.append({
                    "type": "Feature",
                    "geometry": transform_geom(src.crs, "EPSG:4326", geometry, precision=7),
                    "properties": {"mask": mask_path.stem, "class_value": int(value), "source_crs": src.crs.to_string()},
                })
    if not features:
        raise HTTPException(status_code=422, detail="Masks are empty or lack verified CRS")
    return JSONResponse({"type": "FeatureCollection", "features": features}, headers={"Content-Disposition": f'attachment; filename="{run_id}.geojson"'})


@router.get("/csv")
async def export_csv(
    run_id: uuid.UUID,
) -> FileResponse:
    """Exports a flattened measurements table for the given run."""
    from backend.controller import run_state
    state = run_state.get_run(str(run_id))
    if not state or not state.result:
        raise HTTPException(status_code=404, detail="Run result is unavailable")
    path = Path("artifacts") / str(run_id) / f"{run_id}_measurements.csv"
    path.parent.mkdir(parents=True, exist_ok=True)
    claims = state.result.get("claims", [])
    fields = ["claim", "measurement", "unit", "confidence", "uncertainty", "tool", "tool_version", "crs", "source_images", "source_bands", "artifact_ref"]
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields)
        writer.writeheader()
        for claim in claims:
            writer.writerow({key: json.dumps(claim.get(key)) if isinstance(claim.get(key), (list, dict)) else claim.get(key) for key in fields})
    return FileResponse(path, media_type="text/csv", filename=path.name)


@router.get("/stac")
async def export_stac(run_id: uuid.UUID) -> dict:
    """Exports the STAC catalog subset for this run."""
    manifest = Path("artifacts") / str(run_id) / "run_manifest.json"
    properties = json.loads(manifest.read_text()) if manifest.exists() else {"run_id": str(run_id)}
    return JSONResponse({"stac_version": "1.0.0", "id": f"catalog_{run_id}", "type": "Catalog", "description": "SatQuery analysis outputs", "links": [], "satquery:run": properties}, headers={"Content-Disposition": f'attachment; filename="{run_id}_stac.json"'})


@router.get("/audit-report")
async def export_audit_report(
    run_id: uuid.UUID,
) -> FileResponse:
    """Exports a PDF report including the full evidence graph."""
    from backend.controller import run_state
    from reportlab.lib.pagesizes import A4
    from reportlab.pdfgen.canvas import Canvas
    state = run_state.get_run(str(run_id))
    if not state or not state.result:
        raise HTTPException(status_code=404, detail="Run result is unavailable")
    path = Path("artifacts") / str(run_id) / f"{run_id}_audit.pdf"
    path.parent.mkdir(parents=True, exist_ok=True)
    canvas = Canvas(str(path), pagesize=A4)
    y = A4[1] - 50
    for line in ["SatQuery AI Scientific Audit Report", f"Run: {run_id}", "", state.result.get("answer", ""), "", "Limitations:", *state.result.get("limitations", [])]:
        for chunk_start in range(0, len(str(line)), 95):
            canvas.drawString(40, y, str(line)[chunk_start:chunk_start + 95])
            y -= 15
            if y < 50:
                canvas.showPage(); y = A4[1] - 50
    canvas.save()
    return FileResponse(path, media_type="application/pdf", filename=path.name)


import asyncio

@router.get("/notebook")
async def export_notebook(run_id: uuid.UUID):
    """Generates and returns the reproducible Jupyter Notebook (.ipynb) for the run."""
    try:
        nb_path = await asyncio.to_thread(generate_notebook, str(run_id))
        if await asyncio.to_thread(os.path.exists, nb_path):
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
