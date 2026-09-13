"""
backend/api/pixel_inspect.py
━━━━━━━━━━━━━━━━━━━━━━━━━━━
Pixel-level inspection endpoint for the Inspect Pixel map tool.

GET /api/v1/tiles/inspect?image_id=<id>&lat=<lat>&lon=<lon>

Reads the source raster at the requested coordinate and resolves band labels
through the same GeoTIFF/STAC/SAFE/MTL metadata path as scientific tools.

If the raster has no CRS (plain JPEG/PNG), falls back to interpreting
lat/lon as pixel-space row/col — the frontend will warn the user.
"""
from pathlib import Path
from fastapi import APIRouter, HTTPException, Query
import rasterio
from rasterio.transform import rowcol
from rasterio.warp import transform as transform_coordinates

from backend.controller.ingestion import inspect_image

router = APIRouter(tags=["tiles"])


def _resolve_artifact_path(image_id: str) -> Path:
    artifact_dir = Path(f"./artifacts/{image_id}")
    matches = list(artifact_dir.glob("original.*"))
    if not matches:
        raise HTTPException(status_code=404, detail=f"No raster artifact found for image_id={image_id}")
    return matches[0]


@router.get("/tiles/inspect")
def inspect_pixel(
    image_id: str = Query(..., description="image_id from upload"),
    lat: float = Query(..., description="Latitude (WGS-84) or pixel row if no CRS"),
    lon: float = Query(..., description="Longitude (WGS-84) or pixel col if no CRS"),
):
    """
    Return the raw band values at a clicked map coordinate.
    Used by the MapCanvas Inspect Pixel tool.

    Response shape:
    {
      "image_id": "...",
      "lat": 23.01,
      "lon": 72.57,
      "pixel_row": 412,
      "pixel_col": 873,
      "bands": [
        {"label": "R", "value": 142},
        {"label": "G", "value": 98},
        {"label": "B", "value": 67}
      ],
      "no_crs": false,
      "crs_warning": null
    }
    """
    path = _resolve_artifact_path(image_id)
    try:
        metadata = inspect_image(image_id)
    except (FileNotFoundError, OSError, ValueError, rasterio.errors.RasterioError) as exc:
        raise HTTPException(status_code=422, detail=f"Could not resolve raster metadata: {exc}") from exc

    try:
        with rasterio.open(path) as src:
            crs = src.crs
            transform = src.transform
            band_count = src.count

            band_labels = metadata["band_identities"]

            if crs is None:
                # No CRS — treat lat/lon as pixel row/col (best effort)
                pixel_row = int(lat)
                pixel_col = int(lon)
                no_crs = True
                crs_warning = "Raster has no CRS — coordinates interpreted as pixel row/col."
            else:
                # Browser clicks are WGS-84; transform them into the raster CRS.
                raster_x, raster_y = transform_coordinates("EPSG:4326", crs, [lon], [lat])
                pixel_row, pixel_col = rowcol(transform, raster_x[0], raster_y[0])
                no_crs = False
                crs_warning = None

            pixel_row = int(pixel_row)
            pixel_col = int(pixel_col)
            if not (0 <= pixel_row < src.height and 0 <= pixel_col < src.width):
                raise HTTPException(status_code=422, detail="Clicked coordinate is outside the raster extent")

            # Read all bands at this single pixel using a 1×1 window
            from rasterio.windows import Window
            window = Window(pixel_col, pixel_row, 1, 1)
            data = src.read(window=window)  # shape: (bands, 1, 1)
            pixel_values = [float(data[i, 0, 0]) for i in range(band_count)]

    except rasterio.errors.RasterioIOError as e:
        raise HTTPException(status_code=422, detail=f"Could not read raster: {e}") from e

    bands = [
        {"label": band_labels[i] if i < len(band_labels) else f"Band {i + 1}", "value": v}
        for i, v in enumerate(pixel_values)
    ]

    return {
        "image_id": image_id,
        "lat": lat,
        "lon": lon,
        "pixel_row": pixel_row,
        "pixel_col": pixel_col,
        "bands": bands,
        "no_crs": no_crs,
        "crs_warning": crs_warning,
        "band_identity_source": metadata["band_identity_source"],
        "metadata_confidence": metadata["metadata_confidence"],
    }
