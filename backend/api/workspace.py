import uuid
from pathlib import Path

import rasterio
from fastapi import APIRouter, BackgroundTasks, HTTPException
from pydantic import BaseModel, Field

from backend.controller import run_state
from backend.controller.ingestion import inspect_image
from backend.controller.pipeline import run_query_pipeline
from backend.registry.registry_loader import load_all_tools

router = APIRouter(tags=["scientific-workspace"])


@router.get("/images/{image_id}/metadata")
def image_metadata(image_id: str):
    try:
        return inspect_image(image_id)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/images/{image_id}/pixel")
def inspect_pixel(image_id: str, row: int | None = None, col: int | None = None, lon: float | None = None, lat: float | None = None):
    files = list((Path("artifacts") / image_id).glob("original.*"))
    if not files:
        raise HTTPException(status_code=404, detail="Raster not found")
    with rasterio.open(files[0]) as src:
        if lon is not None and lat is not None:
            row, col = src.index(lon, lat)
        if row is None or col is None or not (0 <= row < src.height and 0 <= col < src.width):
            raise HTTPException(status_code=422, detail="Supply a valid row/col or coordinate")
        values = src.read(window=((row, row + 1), (col, col + 1)))[:, 0, 0]
        return {"image_id": image_id, "row": row, "col": col, "values": [float(v) for v in values], "bands": list(src.descriptions)}


@router.get("/tools")
def tool_catalog():
    return {"tools": [entry.model_dump(mode="json") for entry in load_all_tools()]}


class WorkbenchRequest(BaseModel):
    image_ids: list[str] = Field(min_length=1, max_length=2)
    tool: str
    external_image_consent: bool = False


_TOOL_QUERIES = {
    "NDVI": "Calculate NDVI for this image",
    "NDWI": "Calculate NDWI for this image",
    "MNDWI": "Calculate MNDWI for this image",
    "NDBI": "Calculate NDBI for this image",
    "QUALITY": "Check this image quality, nodata, clouds, shadows and saturation",
    "SAR": "Calculate SAR VV and VH backscatter statistics",
    "TEMPORAL": "Compare these images and calculate raster change",
}


@router.post("/tools/execute")
def execute_tool(request: WorkbenchRequest, background_tasks: BackgroundTasks):
    tool = request.tool.upper()
    if tool not in _TOOL_QUERIES:
        raise HTTPException(status_code=422, detail=f"Unsupported workbench tool: {request.tool}")
    run_id = str(uuid.uuid4())
    run_state.create_run(run_id, request.image_ids)
    background_tasks.add_task(run_query_pipeline, run_id, _TOOL_QUERIES[tool], request.image_ids, request.external_image_consent)
    return {"status": "accepted", "run_id": run_id}


@router.get("/runs")
def run_history():
    return {"runs": [state.to_event_dict() | {"image_ids": state.image_ids} for state in run_state.list_runs()]}


@router.get("/runs/{run_id}/manifest")
def run_manifest(run_id: str):
    path = Path("artifacts") / run_id / "run_manifest.json"
    if not path.exists():
        raise HTTPException(status_code=404, detail="Run manifest not found")
    import json
    return json.loads(path.read_text())


class ZonalRequest(BaseModel):
    image_id: str
    geometry: dict
    geometry_crs: str = "EPSG:4326"
    band: int = Field(default=1, ge=1)


@router.post("/geospatial/zonal")
def execute_zonal(request: ZonalRequest):
    """Clip one band to an AOI and return statistics plus a georeferenced artifact."""
    from rasterio.warp import transform_geom
    from backend.scientific_tools.geospatial import clip_to_aoi, zonal_statistics, write_georeferenced_raster
    files = list((Path("artifacts") / request.image_id).glob("original.*"))
    if not files:
        raise HTTPException(status_code=404, detail="Raster not found")
    operation_id = str(uuid.uuid4())
    with rasterio.open(files[0]) as src:
        if not src.crs:
            raise HTTPException(status_code=422, detail="AOI operations require a verified raster CRS")
        if request.band > src.count:
            raise HTTPException(status_code=422, detail=f"Band must be between 1 and {src.count}")
        geometry = transform_geom(request.geometry_crs, src.crs, request.geometry, precision=9)
        array = src.read(request.band).astype("float32")
        stats = zonal_statistics(array, src.transform, geometry)
        clipped = clip_to_aoi(array, src.transform, geometry)["array"].astype("float32")
        artifact = write_georeferenced_raster(
            Path("artifacts") / operation_id / "derived" / "aoi_clip.tif",
            clipped, src.transform, src.crs.to_string(), float("nan"),
        )
        return {
            "operation_id": operation_id,
            "result": {
                "node_id": "aoi_zonal_statistics_1", "tool": "aoi_zonal_statistics",
                "status": "success", "required": True, "value": stats,
                "unit": src.units[request.band - 1] if src.units else None,
                "uncertainty": None, "crs": src.crs.to_string(),
                "source_images": [request.image_id],
                "source_bands": [src.descriptions[request.band - 1] or f"band_{request.band}"],
                "parameters": {"band": request.band, "geometry_crs": request.geometry_crs},
                "artifact_ref": artifact, "derivation": ["clip_to_aoi", "zonal_statistics"],
                "warnings": [], "duration_s": 0.0,
            },
        }


class ReprojectRequest(BaseModel):
    image_id: str
    target_crs: str
    target_resolution: float | None = Field(default=None, gt=0)
    categorical: bool = False


@router.post("/geospatial/reproject")
def execute_reproject(request: ReprojectRequest):
    from backend.scientific_tools.geospatial import reproject_raster, validate_crs, write_georeferenced_raster
    if not validate_crs(request.target_crs)["valid"]:
        raise HTTPException(status_code=422, detail="Invalid target CRS")
    files = list((Path("artifacts") / request.image_id).glob("original.*"))
    if not files:
        raise HTTPException(status_code=404, detail="Raster not found")
    operation_id = str(uuid.uuid4())
    with rasterio.open(files[0]) as src:
        if not src.crs:
            raise HTTPException(status_code=422, detail="Reprojection requires a verified source CRS")
        projected = reproject_raster(
            src.read(), src.transform, src.crs.to_string(), request.target_crs,
            request.target_resolution, request.categorical,
        )
    artifact = write_georeferenced_raster(
        Path("artifacts") / operation_id / "derived" / "reprojected.tif",
        projected["array"], projected["transform"], request.target_crs,
    )
    return {"operation_id": operation_id, "artifact_ref": artifact, "crs": request.target_crs, "resampling": "nearest" if request.categorical else "bilinear"}
