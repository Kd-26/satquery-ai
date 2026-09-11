"""
backend/api/pixel_inspect.py
━━━━━━━━━━━━━━━━━━━━━━━━━━━
Pixel-level inspection endpoint for the Inspect Pixel map tool.

GET /api/v1/tiles/inspect?image_id=<id>&lat=<lat>&lon=<lon>

Uses rasterio.dataset.sample() to extract the raw band values at the
given geographic coordinate. Returns band labels (R/G/B, VV/VH, etc.)
alongside the pixel values so the frontend popup can be descriptive.

If the raster has no CRS (plain JPEG/PNG), falls back to interpreting
lat/lon as pixel-space row/col — the frontend will warn the user.
"""
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, HTTPException, Query
import rasterio
from rasterio.transform import rowcol

router = APIRouter(tags=["tiles"])


def _resolve_artifact_path(image_id: str) -> Path:
    artifact_dir = Path(f"./artifacts/{image_id}")
    matches = list(artifact_dir.glob("original.*"))
    if not matches:
        raise HTTPException(status_code=404, detail=f"No raster artifact found for image_id={image_id}")
    return matches[0]


def _guess_band_labels(band_count: int, filename: str) -> list[str]:
    """Heuristic band labelling matching ingestion.py logic."""
    name = filename.lower()
    if band_count == 2 or ("s1" in name or "sar" in name):
        return ["VV", "VH"]
    if band_count == 3:
        return ["R", "G", "B"]
    if band_count == 4:
        return ["R", "G", "B", "NIR"]
    if band_count == 13:
        return ["B1", "B2(B)", "B3(G)", "B4(R)", "B5", "B6", "B7", "B8(NIR)", "B8A", "B9", "B10", "B11(SWIR1)", "B12(SWIR2)"]
    return [f"Band {i + 1}" for i in range(band_count)]


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
        with rasterio.open(path) as src:
            crs = src.crs
            transform = src.transform
            band_count = src.count

            orig_name = ""
            name_file = Path(f"./artifacts/{image_id}/filename.txt")
            if name_file.exists():
                try:
                    orig_name = name_file.read_text()
                except Exception:
                    pass

            band_labels = _guess_band_labels(band_count, orig_name or str(path.name))

            if crs is None:
                # No CRS — treat lat/lon as pixel row/col (best effort)
                pixel_row = int(lat)
                pixel_col = int(lon)
                no_crs = True
                crs_warning = "Raster has no CRS — coordinates interpreted as pixel row/col."
            else:
                # Geographic coordinate → pixel coordinate
                pixel_row, pixel_col = rowcol(transform, lon, lat)
                no_crs = False
                crs_warning = None

            # Clamp to valid pixel bounds
            pixel_row = max(0, min(int(pixel_row), src.height - 1))
            pixel_col = max(0, min(int(pixel_col), src.width - 1))

            # Read all bands at this single pixel using a 1×1 window
            from rasterio.windows import Window
            window = Window(pixel_col, pixel_row, 1, 1)
            data = src.read(window=window)  # shape: (bands, 1, 1)
            pixel_values = [float(data[i, 0, 0]) for i in range(band_count)]

    except rasterio.errors.RasterioIOError as e:
        raise HTTPException(status_code=422, detail=f"Could not read raster: {e}")

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
    }
