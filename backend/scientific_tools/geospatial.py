"""CRS-aware raster operations used by the Scientific IDE."""

from __future__ import annotations

from pathlib import Path
from typing import Any

import numpy as np
import rasterio
from rasterio.features import geometry_mask
from rasterio.io import MemoryFile
from rasterio.warp import Resampling, calculate_default_transform, reproject


def validate_crs(crs: str | None) -> dict[str, Any]:
    if not crs:
        return {"valid": False, "reason": "missing", "is_geographic": None}
    try:
        parsed = rasterio.crs.CRS.from_user_input(crs)
        return {"valid": True, "canonical": parsed.to_string(), "is_geographic": parsed.is_geographic}
    except Exception as exc:
        return {"valid": False, "reason": str(exc), "is_geographic": None}


def reproject_raster(
    array: np.ndarray,
    src_transform,
    src_crs: str,
    dst_crs: str,
    dst_resolution: float | None = None,
    categorical: bool = False,
) -> dict[str, Any]:
    bands = array[np.newaxis, ...] if array.ndim == 2 else array
    height, width = bands.shape[-2:]
    left, bottom, right, top = rasterio.transform.array_bounds(height, width, src_transform)
    dst_transform, dst_width, dst_height = calculate_default_transform(
        src_crs, dst_crs, width, height, left, bottom, right, top,
        resolution=dst_resolution,
    )
    destination = np.zeros((bands.shape[0], dst_height, dst_width), dtype=bands.dtype)
    method = Resampling.nearest if categorical else Resampling.bilinear
    for index in range(bands.shape[0]):
        reproject(
            bands[index], destination[index], src_transform=src_transform,
            src_crs=src_crs, dst_transform=dst_transform, dst_crs=dst_crs,
            resampling=method,
        )
    return {"array": destination if array.ndim == 3 else destination[0], "transform": dst_transform, "crs": dst_crs}


def clip_to_aoi(array: np.ndarray, transform, geometry_geojson: dict) -> dict[str, Any]:
    spatial_shape = array.shape[-2:]
    inside = geometry_mask([geometry_geojson], out_shape=spatial_shape, transform=transform, invert=True)
    clipped = np.where(inside if array.ndim == 2 else inside[np.newaxis, ...], array, np.nan)
    return {"array": clipped, "aoi_mask": inside}


def zonal_statistics(array: np.ndarray, transform, geometry_geojson: dict) -> dict[str, float]:
    clipped = clip_to_aoi(array, transform, geometry_geojson)["array"]
    values = clipped[np.isfinite(clipped)]
    if not values.size:
        raise ValueError("AOI contains no valid raster pixels")
    return {
        "count": int(values.size), "mean": float(values.mean()),
        "median": float(np.median(values)), "minimum": float(values.min()),
        "maximum": float(values.max()), "std": float(values.std()),
    }


def write_georeferenced_raster(
    output_path: str | Path,
    array: np.ndarray,
    transform,
    crs: str,
    nodata: float | int | None = None,
) -> str:
    path = Path(output_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    bands = array[np.newaxis, ...] if array.ndim == 2 else array
    with rasterio.open(
        path, "w", driver="GTiff", height=bands.shape[1], width=bands.shape[2],
        count=bands.shape[0], dtype=bands.dtype, crs=crs, transform=transform,
        nodata=nodata, compress="deflate",
    ) as dst:
        dst.write(bands)
    return str(path)
