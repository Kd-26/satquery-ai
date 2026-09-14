"""
Serves Cloud-Optimized GeoTIFF tiles via TiTiler so the frontend (MapLibre GL)
never has to load a full-resolution raster into the browser.
Implements architecture.md §17.4 (never load full-res rasters client-side).
"""
from pathlib import Path
from urllib.parse import quote

from fastapi import APIRouter, HTTPException
import rasterio
import numpy as np
from rasterio.warp import transform_bounds

try:
    from titiler.core.factory import TilerFactory
    # router_prefix must match where TiTiler is actually served from so that
    # self-referencing links (tilejson, etc.) resolve correctly.
    # The router is mounted at /api/v1/tiles in main.py, so TiTiler's own
    # sub-routes (/tiles/WebMercatorQuad/...) end up at /api/v1/tiles/... —
    # NOT /api/v1/tiles/tiles/... (which was the double-prefix bug).
    cog = TilerFactory(router_prefix="/api/v1/tiles")
    titiler_router = APIRouter(prefix="/tiles")
    titiler_router.include_router(cog.router)
    _TITILER_AVAILABLE = True
except ImportError:
    # Keep route shape stable, but fail explicitly instead of returning JSON
    # where the client expects raster tile bytes.
    titiler_router = APIRouter(prefix="/tiles")
    _TITILER_AVAILABLE = False

    @titiler_router.get("/{z}/{x}/{y}")
    def unavailable_tile(z: int, x: int, y: int, url: str):
        raise HTTPException(status_code=503, detail="Raster tile service is not installed")


def _resolve_artifact_path(image_id: str) -> Path:
    """Finds the raw uploaded raster for a given image_id under ./artifacts/."""
    artifact_dir = Path(f"./artifacts/{image_id}")
    matches = list(artifact_dir.glob("original.*"))
    if not matches:
        raise HTTPException(status_code=404, detail=f"No raster artifact found for image_id={image_id}")
    return matches[0]


def _resolve_mask_path(run_id: str, mask_name: str) -> Path:
    """Finds a saved mask or derived TIFF for a completed run under ./artifacts/{run_id}/."""
    search_dirs = [
        Path(f"./artifacts/{run_id}/derived"),
        Path(f"./artifacts/{run_id}/masks"),
        Path(f"./artifacts/{run_id}"),
    ]
    for d in search_dirs:
        if not d.exists():
            continue
        # Check direct or lowercased name with extensions
        for name in (mask_name, mask_name.lower()):
            for ext in ("", ".tif", ".tiff", ".png"):
                candidate = d / f"{name}{ext}"
                if candidate.is_file():
                    return candidate
    raise HTTPException(
        status_code=404,
        detail=f"No mask or derived artifact found for run_id={run_id}, mask_name={mask_name}",
    )


def _build_tile_response(path: Path) -> dict:
    """
    Core logic shared by source-image and mask-tile resolve endpoints.
    Opens the raster, computes WGS-84 bounds, and builds a TiTiler tile URL template.

    Band selection strategy per sensor type:
      - 13-band Sentinel-2  → bidx=4,3,2 (B4=Red, B3=Green, B2=Blue) natural colour
      - 2-band SAR (VV+VH)  → bidx=1 (VV channel as greyscale)
      - 1-band (panchromatic / DEM) → bidx=1
      - 3-band RGB / 4-band RGBN → no bidx (TiTiler defaults to bands 1,2,3)
      - Other N-band          → no bidx (TiTiler defaults to bands 1,2,3 with warning)

    For rasters with no CRS (plain JPEG/PNG uploads), returns a soft-warning
    response (no_crs=true) instead of raising 422 — the frontend shows a yellow
    warning banner and still renders the map canvas.
    """
    try:
        with rasterio.open(path) as src:
            crs = src.crs
            bounds = src.bounds
            width = src.width
            height = src.height
            band_count = src.count
            if band_count == 13:
                indexes = [4, 3, 2]
            elif band_count in (1, 2):
                indexes = [1, 1, 1]
            else:
                indexes = list(range(1, min(band_count, 3) + 1))
            sample = src.read(
                indexes,
                out_shape=(len(indexes), min(src.height, 512), min(src.width, 512)),
            ).astype(np.float32)
            finite = sample[np.isfinite(sample)]
            display_min, display_max = np.percentile(finite, [2, 98]) if finite.size else (0.0, 1.0)
            if display_max <= display_min:
                display_max = display_min + 1.0
    except rasterio.errors.RasterioIOError as e:
        raise HTTPException(status_code=422, detail=f"Could not open raster: {e}")

    encoded_url = quote(str(path.resolve()), safe="")
    no_crs = crs is None

    if no_crs:
        # Soft fallback: return pixel-space extents. The frontend will show a
        # "Upload a georeferenced GeoTIFF" warning but won't crash.
        bounds_4326 = [0.0, 0.0, float(width), float(height)]
    else:
        bounds_4326 = list(transform_bounds(crs, "EPSG:4326", *bounds))

    band_query = "&".join(f"bidx={index}" for index in indexes)

    if _TITILER_AVAILABLE:
        raw_tile_template = (
            f"/api/v1/tiles/tiles/WebMercatorQuad/{{z}}/{{x}}/{{y}}.png"
            f"?url={encoded_url}&{band_query}&rescale={float(display_min)},{float(display_max)}"
        )
    else:
        raw_tile_template = f"/api/v1/tiles/{{z}}/{{x}}/{{y}}?url={encoded_url}"

    return {
        "tile_url_template": raw_tile_template,
        "bounds": bounds_4326,
        "titiler_available": _TITILER_AVAILABLE,
        "no_crs": no_crs,
        "band_count": band_count,
        "crs_warning": (
            "Raster has no CRS — displayed at pixel coordinates only. "
            "Upload a georeferenced GeoTIFF for accurate map placement and area measurements in hectares."
        ) if no_crs else None,
    }


@titiler_router.get("/resolve/{image_id}")
def resolve_tile_info(image_id: str):
    """
    Resolves an image_id to a ready-to-use TiTiler tile URL template and its
    geographic bounds (EPSG:4326), so the frontend can add a raster source to
    MapLibre GL without ever knowing the server's filesystem layout.

    Returns 404 if the artifact is missing.
    Returns a soft-warning response (no_crs=true) if the raster has no CRS
    instead of a hard 422 — the frontend is responsible for showing a user-friendly
    warning banner rather than displaying a black map.
    """
    path = _resolve_artifact_path(image_id)
    result = _build_tile_response(path)
    result["image_id"] = image_id
    return result

@titiler_router.get("/masks/{run_id}/{mask_name}/resolve")
def resolve_mask_tile_info(run_id: str, mask_name: str):
    """
    Resolves a saved mask TIF for a completed run to a TiTiler tile URL template.
    Used by the frontend (MapCanvas) to overlay Semantic / Change / Quality masks
    on top of the source raster when the user clicks a layer tab.

    Returns 404 if the mask has not been generated for this run yet.
    Returns soft-warning (no_crs=true) for ungeoreferenced masks.
    """
    path = _resolve_mask_path(run_id, mask_name)
    result = _build_tile_response(path)
    result["run_id"] = run_id
    result["mask_name"] = mask_name
    return result
