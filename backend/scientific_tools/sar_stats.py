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
