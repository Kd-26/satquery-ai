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
