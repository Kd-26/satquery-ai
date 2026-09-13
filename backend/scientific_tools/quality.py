import numpy as np

def compute_valid_mask(raster: np.ndarray, nodata_value: float = None, cloud_mask: np.ndarray = None) -> np.ndarray:
    if raster.ndim == 3:
        valid_mask = np.ones(raster.shape[1:], dtype=bool)
    else:
        valid_mask = np.ones(raster.shape, dtype=bool)
        
    if raster.ndim == 3:
        valid_mask &= ~np.isnan(raster).any(axis=0)
    else:
        valid_mask &= ~np.isnan(raster)
        
    if nodata_value is not None:
        if raster.ndim == 3:
            valid_mask &= ~(raster == nodata_value).any(axis=0)
        else:
            valid_mask &= ~(raster == nodata_value)
            
    if cloud_mask is not None:
        valid_mask &= ~(cloud_mask > 0)
        
    return valid_mask


def detect_saturation(raster: np.ndarray) -> np.ndarray:
    """Flag pixels saturated in every supplied band."""
    if np.issubdtype(raster.dtype, np.integer):
        maximum = np.iinfo(raster.dtype).max
        minimum = np.iinfo(raster.dtype).min
    else:
        finite = raster[np.isfinite(raster)]
        if not finite.size:
            return np.ones(raster.shape[-2:], dtype=bool)
        minimum, maximum = np.percentile(finite, [0.1, 99.9])
    extreme = (raster <= minimum) | (raster >= maximum)
    return np.all(extreme, axis=0) if raster.ndim == 3 else extreme


def approximate_optical_cloud_shadow_mask(
    blue: np.ndarray,
    green: np.ndarray,
    red: np.ndarray,
    nir: np.ndarray | None = None,
) -> dict:
    """Conservative spectral heuristic when no authoritative cloud layer exists."""
    stack = np.stack([blue, green, red]).astype(np.float32)
    brightness = np.nanmean(stack, axis=0)
    finite = brightness[np.isfinite(brightness)]
    high = np.percentile(finite, 92) if finite.size else np.inf
    low = np.percentile(finite, 8) if finite.size else -np.inf
    whiteness = np.nanstd(stack, axis=0) / (np.abs(brightness) + 1e-6)
    cloud = (brightness >= high) & (whiteness < 0.25)
    shadow = brightness <= low
    if nir is not None:
        shadow &= nir <= np.nanpercentile(nir[np.isfinite(nir)], 20)
    return {"cloud_mask": cloud, "shadow_mask": shadow, "method": "approximate_spectral_heuristic", "confidence": 0.45}


def decode_quality_band(quality: np.ndarray, scheme: str) -> dict:
    """Decode authoritative Sentinel-2 SCL or Landsat Collection 2 QA_PIXEL."""
    qa = np.asarray(quality)
    normalized = scheme.upper()
    if normalized in {"SCL", "SENTINEL2_SCL"}:
        cloud = np.isin(qa, [8, 9, 10])
        shadow = qa == 3
        saturation = qa == 1
        invalid = np.isin(qa, [0, 1, 3, 8, 9, 10, 11])
        method = "sentinel2_scene_classification"
    elif normalized in {"QA_PIXEL", "LANDSAT_QA_PIXEL"}:
        values = qa.astype(np.uint32)
        bit = lambda index: (values & (1 << index)) != 0
        cloud = bit(1) | bit(2) | bit(3)
        shadow = bit(4)
        saturation = np.zeros(qa.shape, dtype=bool)
        invalid = bit(0) | cloud | shadow | bit(5)
        method = "landsat_collection2_qa_pixel"
    else:
        raise ValueError(f"Unsupported quality-band scheme: {scheme}")
    return {
        "invalid_mask": invalid,
        "cloud_mask": cloud,
        "shadow_mask": shadow,
        "saturation_mask": saturation,
        "method": method,
        "confidence": 1.0,
    }
