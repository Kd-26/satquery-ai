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
