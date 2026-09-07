"""
backend/scientific_tools/preview.py
────────────────────────────────────
Generates a display-ready RGB preview PNG from any uploaded satellite GeoTIFF.

Architecture §1.3 / §3.1: keeps the scientific raster (all bands, calibrated values)
strictly separate from the display preview. This module only reads the original
raster — it never modifies it.

Band-count dispatch table
─────────────────────────
 1  band  → grayscale (panchromatic, single-pol SAR)
 2  bands → SAR assumption (VV + VH): VV to grayscale RGB
 3  bands → standard RGB (most PNGs, Landsat natural-colour)
 4  bands → RGBN / RGBA: bands 1,2,3 → RGB (band 4 scientific only)
13  bands → Sentinel-2 L1C/L2A: bands 4,3,2 (R,G,B) → RGB
 N  bands → generic fallback: bands 1,2,3 → RGB with console warning

NoData / NaN values are masked before percentile calculation so edge-of-swath
black borders do not bias the stretch.
"""

from __future__ import annotations

import logging
import warnings
from pathlib import Path
from typing import Optional

import numpy as np
import rasterio
from PIL import Image, ImageFilter

log = logging.getLogger(__name__)

# ─── Constants ────────────────────────────────────────────────────────────────

# Percentile range for contrast stretching (2 % – 98 %)
_P_LO: float = 2.0
_P_HI: float = 98.0

# Output size (px) — matches the 512×512 benchmark chips; scales down large scenes
_PREVIEW_SIZE: int = 512

# PIL compression level (0 = fastest/largest, 9 = slowest/smallest)
_PNG_COMPRESS: int = 6


# ─── Public API ───────────────────────────────────────────────────────────────

def generate_preview(source_path: str, output_path: str) -> str:
    """
    Read *source_path* (any rasterio-readable raster) and write a display-ready
    RGB PNG to *output_path*.

    Returns *output_path* on success.

    Raises
    ------
    ValueError
        If the raster has zero bands or cannot be read meaningfully.
    OSError
        If writing the output PNG fails.
    """
    source_path = str(source_path)
    output_path = str(output_path)

    with rasterio.open(source_path) as src:
        n_bands: int = src.count
        nodata = src.nodatavals[0] if src.nodatavals else None
        dtype = src.dtypes[0]

        if n_bands == 0:
            raise ValueError(f"Raster has no bands: {source_path}")

        rgb_uint8 = _dispatch(src, n_bands, nodata, dtype)

    # Resize to _PREVIEW_SIZE × _PREVIEW_SIZE (preserves aspect ratio with
    # padding if image is not square — rare for chips, common for large scenes)
    img = Image.fromarray(rgb_uint8, mode="RGB")
    img = _resize_with_padding(img, _PREVIEW_SIZE)

    # Gentle unsharp mask to bring out satellite detail
    img = img.filter(ImageFilter.UnsharpMask(radius=0.8, percent=50, threshold=3))

    Path(output_path).parent.mkdir(parents=True, exist_ok=True)
    img.save(output_path, format="PNG", compress_level=_PNG_COMPRESS)
    log.info("preview saved → %s  (bands=%d)", output_path, n_bands)
    return output_path


# ─── Band dispatch ────────────────────────────────────────────────────────────

def _dispatch(
    src: rasterio.DatasetReader,
    n_bands: int,
    nodata,
    dtype: str,
) -> np.ndarray:
    """Return a (H, W, 3) uint8 numpy array for the given raster."""

    if n_bands == 1:
        return _single_band(src, nodata)

    if n_bands == 2:
        # Assume Sentinel-1 VV / VH: use VV (band 1) as grayscale
        return _sar_vv(src, nodata)

    if n_bands == 3:
        # Standard RGB
        return _rgb_stretch(src, [1, 2, 3], nodata)

    if n_bands == 4:
        # RGBN / RGBA — use first three bands as RGB
        return _rgb_stretch(src, [1, 2, 3], nodata)

    if n_bands == 13:
        # Sentinel-2 L1C / L2A band order:
        # 1=B1(Coastal), 2=B2(Blue), 3=B3(Green), 4=B4(Red),
        # 5=B5, 6=B6, 7=B7, 8=B8(NIR), 9=B8A, 10=B9, 11=B10,
        # 12=B11(SWIR1), 13=B12(SWIR2)
        # Natural colour: B4(4)=R, B3(3)=G, B2(2)=B
        return _rgb_stretch(src, [4, 3, 2], nodata)

    # Generic fallback for any other band count (e.g. 6-band Landsat, 8-band
    # WorldView-3, etc.) — use bands 1, 2, 3
    log.warning(
        "Unknown band count %d for %s — using bands 1,2,3 as RGB (scientific "
        "analysis will use all bands from the original raster).",
        n_bands,
        src.name,
    )
    return _rgb_stretch(src, [1, 2, 3], nodata)


# ─── Per-case implementations ─────────────────────────────────────────────────

def _single_band(src: rasterio.DatasetReader, nodata) -> np.ndarray:
    """1-band → grayscale → RGB."""
    band = src.read(1).astype(np.float32)
    band = _mask_nodata(band, nodata)
    stretched = _stretch(band)
    return np.stack([stretched, stretched, stretched], axis=-1)


def _sar_vv(src: rasterio.DatasetReader, nodata) -> np.ndarray:
    """
    2-band SAR (VV=1, VH=2) → VV channel visualised as grayscale RGB.

    SAR values are typically in linear power or dB. We apply the stretch
    directly to whatever unit is stored; the percentile operation is
    unit-agnostic and produces a reasonable visual regardless.
    """
    vv = src.read(1).astype(np.float32)
    vv = _mask_nodata(vv, nodata)
    stretched = _stretch(vv)
    return np.stack([stretched, stretched, stretched], axis=-1)


def _rgb_stretch(
    src: rasterio.DatasetReader,
    band_indices: list[int],
    nodata,
) -> np.ndarray:
    """
    Read the specified bands, apply independent per-band percentile stretch,
    and return a (H, W, 3) uint8 array.

    Independent per-band stretching (not joint) avoids colour casts when one
    channel has a very different dynamic range from the others (common in
    multispectral).
    """
    channels = []
    for bi in band_indices:
        raw = src.read(bi).astype(np.float32)
        raw = _mask_nodata(raw, nodata)
        channels.append(_stretch(raw))
    return np.stack(channels, axis=-1)


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _mask_nodata(arr: np.ndarray, nodata) -> np.ndarray:
    """
    Replace nodata / NaN / Inf values with NaN so they are excluded from the
    percentile calculation.
    """
    arr = arr.copy()
    # Replace IEEE special values
    arr[~np.isfinite(arr)] = np.nan
    # Replace explicit nodata sentinel
    if nodata is not None:
        try:
            nd = float(nodata)
            arr[arr == nd] = np.nan
        except (TypeError, ValueError):
            pass
    return arr


def _stretch(arr: np.ndarray) -> np.ndarray:
    """
    Apply a 2 %–98 % percentile contrast stretch to *arr* (float32, may
    contain NaNs) and return a (H, W) uint8 array in [0, 255].
    """
    valid = arr[np.isfinite(arr)]
    if valid.size == 0:
        # All NoData — return black channel
        return np.zeros(arr.shape, dtype=np.uint8)

    lo = float(np.percentile(valid, _P_LO))
    hi = float(np.percentile(valid, _P_HI))

    if hi == lo:
        # Constant band (e.g. all zeros) — return mid-grey so it's visible
        out = np.full(arr.shape, 128, dtype=np.uint8)
        out[~np.isfinite(arr)] = 0
        return out

    scaled = (arr - lo) / (hi - lo) * 255.0
    # NaN → 0 (black), clip to [0, 255]
    scaled = np.where(np.isfinite(scaled), scaled, 0.0)
    return np.clip(scaled, 0, 255).astype(np.uint8)


def _resize_with_padding(img: Image.Image, target: int) -> Image.Image:
    """
    Resize *img* to fit within a *target* × *target* square, maintaining
    aspect ratio. Pads with black if the image is not square.
    """
    w, h = img.size
    if w == h:
        return img.resize((target, target), Image.LANCZOS)

    scale = target / max(w, h)
    new_w, new_h = int(w * scale), int(h * scale)
    img = img.resize((new_w, new_h), Image.LANCZOS)

    canvas = Image.new("RGB", (target, target), (0, 0, 0))
    offset_x = (target - new_w) // 2
    offset_y = (target - new_h) // 2
    canvas.paste(img, (offset_x, offset_y))
    return canvas
