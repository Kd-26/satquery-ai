import numpy as np
from backend.schemas.sar_raster import SARRaster

def backscatter_stats(sar: SARRaster, region_mask: np.ndarray = None) -> dict:
    arr = sar.array
    
    # If a region mask is provided, use only those pixels, else use all valid (non-NaN) pixels
    if region_mask is not None:
        if region_mask.shape != arr.shape:
            raise ValueError(f"Region mask shape {region_mask.shape} does not match SAR array shape {arr.shape}")
        valid_pixels = arr[region_mask & ~np.isnan(arr)]
    else:
        valid_pixels = arr[~np.isnan(arr)]
        
    if valid_pixels.size == 0:
        return {"mean": float('nan'), "median": float('nan'), "std": float('nan')}
        
    return {
        "mean": float(np.mean(valid_pixels)),
        "median": float(np.median(valid_pixels)),
        "std": float(np.std(valid_pixels))
    }

def vv_vh_ratio(vv: SARRaster, vh: SARRaster) -> np.ndarray:
    if vv.representation != 'linear' or vh.representation != 'linear':
        raise ValueError(
            f"vv_vh_ratio requires linear representation; got "
            f"vv={vv.representation}, vh={vh.representation}. "
            "dB subtraction is already a log-ratio — do not divide dB values."
        )
        
    if vv.polarization != 'VV' or vh.polarization != 'VH':
        raise ValueError(f"Expected VV and VH polarizations, got {vv.polarization} and {vh.polarization}")
        
    if vv.array.shape != vh.array.shape:
        raise ValueError(f"Shape mismatch: {vv.array.shape} vs {vh.array.shape}")
        
    with np.errstate(divide='ignore', invalid='ignore'):
        # avoid division by zero
        ratio = np.where(np.abs(vh.array) > 1e-8, vv.array / vh.array, np.nan)
    return ratio

def temporal_backscatter_diff(sar_t1: SARRaster, sar_t2: SARRaster) -> np.ndarray:
    if sar_t1.representation != sar_t2.representation:
        raise ValueError(
            f"Cannot compare different SAR representations: "
            f"T1 is {sar_t1.representation}, T2 is {sar_t2.representation}"
        )
        
    if sar_t1.array.shape != sar_t2.array.shape:
        raise ValueError(f"Shape mismatch: {sar_t1.array.shape} vs {sar_t2.array.shape}")
        
    return sar_t2.array - sar_t1.array


def linear_to_db(array: np.ndarray, floor: float = 1e-10) -> np.ndarray:
    with np.errstate(divide="ignore", invalid="ignore"):
        return 10.0 * np.log10(np.maximum(array.astype(np.float32), floor))


def db_to_linear(array: np.ndarray) -> np.ndarray:
    return np.power(10.0, array.astype(np.float32) / 10.0)


def calibrate_sar(array: np.ndarray, scale: float = 1.0, offset: float = 0.0, output: str = "dB") -> dict:
    linear = np.maximum(array.astype(np.float32) * scale + offset, 0.0)
    calibrated = linear_to_db(linear) if output == "dB" else linear
    return {"array": calibrated, "representation": output, "scale": scale, "offset": offset}


def lee_filter(array: np.ndarray, size: int = 5) -> np.ndarray:
    """Small dependency-free Lee speckle filter."""
    if size < 3 or size % 2 == 0:
        raise ValueError("Lee window size must be an odd integer >= 3")
    pad = size // 2
    padded = np.pad(array.astype(np.float32), pad, mode="reflect")
    windows = np.lib.stride_tricks.sliding_window_view(padded, (size, size))
    local_mean = windows.mean(axis=(-2, -1))
    local_var = windows.var(axis=(-2, -1))
    noise_var = float(np.nanmedian(local_var))
    weight = local_var / (local_var + noise_var + 1e-8)
    return local_mean + weight * (array - local_mean)
