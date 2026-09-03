import numpy as np

class MissingBandError(Exception):
    pass

def _validate_inputs(band1: np.ndarray, band2: np.ndarray):
    if band1 is None or band2 is None:
        raise MissingBandError("A required band array is missing (None).")
    if band1.shape != band2.shape:
        raise ValueError(f"Shape mismatch: {band1.shape} vs {band2.shape}")
    if not np.issubdtype(band1.dtype, np.floating) or not np.issubdtype(band2.dtype, np.floating):
        raise TypeError("Input arrays must be of a float dtype.")

def _compute_normalized_difference(b1: np.ndarray, b2: np.ndarray) -> np.ndarray:
    _validate_inputs(b1, b2)
    # Handle near-zero denominators by returning NaN
    denominator = b1 + b2
    with np.errstate(divide='ignore', invalid='ignore'):
        result = np.where(np.abs(denominator) > 1e-8, (b1 - b2) / denominator, np.nan)
    return result

def compute_ndvi(nir: np.ndarray, red: np.ndarray) -> np.ndarray:
    return _compute_normalized_difference(nir, red)

def compute_ndwi(green: np.ndarray, nir: np.ndarray) -> np.ndarray:
    return _compute_normalized_difference(green, nir)

def compute_mndwi(green: np.ndarray, swir1: np.ndarray) -> np.ndarray:
    return _compute_normalized_difference(green, swir1)

def compute_ndbi(swir1: np.ndarray, nir: np.ndarray) -> np.ndarray:
    return _compute_normalized_difference(swir1, nir)
