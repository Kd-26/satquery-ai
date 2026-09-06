"""
Serves Cloud-Optimized GeoTIFF tiles via TiTiler so the frontend (MapLibre GL)
never has to load a full-resolution raster into the browser.
Implements architecture.md §17.4 (never load full-res rasters client-side).
"""
from pathlib import Path
from urllib.parse import quote

from fastapi import APIRouter, HTTPException
import rasterio
from rasterio.warp import transform_bounds

try:
    from titiler.core.factory import TilerFactory
    # Set up TiTiler factory for serving COG tiles. `router_prefix` only affects
    # self-referencing links (e.g. tilejson URLs) — it does NOT add "/tiles" to
    # the router's own paths, so we mount it under an explicit prefix ourselves
    # to guarantee the final path is always /api/v1/tiles/... regardless of
    # whether titiler is installed (see the ImportError branch below).
    cog = TilerFactory(router_prefix="/tiles")
    titiler_router = APIRouter(prefix="/tiles")
    titiler_router.include_router(cog.router)
    _TITILER_AVAILABLE = True
except ImportError:
    # Fallback mock if titiler is not installed in the environment
    titiler_router = APIRouter(prefix="/tiles")
    _TITILER_AVAILABLE = False

    @titiler_router.get("/{z}/{x}/{y}")
    def mock_tile(z: int, x: int, y: int, url: str):
        return {"message": "TiTiler tile endpoint mock", "z": z, "x": x, "y": y, "url": url}


def _resolve_artifact_path(image_id: str) -> Path:
    """Finds the raw uploaded raster for a given image_id under ./artifacts/."""
    artifact_dir = Path(f"./artifacts/{image_id}")
    matches = list(artifact_dir.glob("original.*"))
    if not matches:
        raise HTTPException(status_code=404, detail=f"No raster artifact found for image_id={image_id}")
    return matches[0]


@titiler_router.get("/resolve/{image_id}")
def resolve_tile_info(image_id: str):
    """
    Resolves an image_id to a ready-to-use TiTiler tile URL template and its
    geographic bounds (EPSG:4326), so the frontend can add a raster source to
    MapLibre GL without ever knowing the server's filesystem layout.

    Returns 404 (not a silent fallback) if the artifact is missing, and a
    422 if the raster has no CRS/transform to compute bounds from — georeferencing
    is verified, never assumed.
    """
    path = _resolve_artifact_path(image_id)

    try:
        with rasterio.open(path) as src:
            crs = src.crs
            bounds = src.bounds
    except rasterio.errors.RasterioIOError as e:
        raise HTTPException(status_code=422, detail=f"Could not open raster: {e}")

    if crs is None:
        raise HTTPException(
            status_code=422,
            detail="Raster has no CRS — cannot compute map bounds. Upload a georeferenced GeoTIFF.",
        )

    bounds_4326 = transform_bounds(crs, "EPSG:4326", *bounds)

    encoded_url = quote(str(path.resolve()), safe="")
    if _TITILER_AVAILABLE:
        raw_tile_template = f"/api/v1/tiles/WebMercatorQuad/{{z}}/{{x}}/{{y}}.png?url={encoded_url}"
    else:
        # Mock fallback still returns a usable template shape for frontend dev
        raw_tile_template = f"/api/v1/tiles/{{z}}/{{x}}/{{y}}?url={encoded_url}"

    return {
        "image_id": image_id,
        "tile_url_template": raw_tile_template,
        "bounds": list(bounds_4326),  # [west, south, east, north]
        "titiler_available": _TITILER_AVAILABLE,
    }
