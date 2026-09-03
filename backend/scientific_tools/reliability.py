import numpy as np

def estimate_optical_reliability(image_array: np.ndarray, cloud_mask: np.ndarray) -> np.ndarray:
    """
    Estimates optical reliability per-pixel in [0, 1].
    Lower where cloud_mask flags cloud/shadow or where pixel saturation is detected.
    """
    if image_array.ndim == 3:
        spatial_shape = image_array.shape[1:]
    else:
        spatial_shape = image_array.shape
        
    reliability = np.ones(spatial_shape, dtype=np.float32)
    
    if cloud_mask is not None:
        reliability[cloud_mask > 0] = 0.1
        
    if image_array.ndim == 3:
        if np.issubdtype(image_array.dtype, np.floating):
            saturated = np.all(image_array >= 0.99, axis=0)
        else:
            max_val = np.iinfo(image_array.dtype).max
            saturated = np.all(image_array == max_val, axis=0)
    else:
        if np.issubdtype(image_array.dtype, np.floating):
            saturated = (image_array >= 0.99)
        else:
            max_val = np.iinfo(image_array.dtype).max
            saturated = (image_array == max_val)
            
    reliability[saturated] = 0.2
    
    result = np.broadcast_to(reliability, image_array.shape).astype(np.float32)
    return np.clip(result, 0.0, 1.0)

def estimate_sar_reliability(sar_array: np.ndarray, layover_shadow_mask: np.ndarray = None) -> np.ndarray:
    """
    Estimates SAR reliability per-pixel in [0, 1].
    Lower where speckle-affected regions or provided layover/shadow mask indicates unreliable data.
    
    ASSUMPTION: If no layover/shadow mask is provided, the function defaults to 
    a uniform moderate score (0.6) for non-extreme pixels. This is a baseline 
    approximation, as calculating true layover/shadow without a DEM and precise 
    sensor geometry is impossible.
    """
    if sar_array.ndim == 3:
        spatial_shape = sar_array.shape[1:]
    else:
        spatial_shape = sar_array.shape
        
    reliability = np.ones(spatial_shape, dtype=np.float32)
    
    if layover_shadow_mask is not None:
        reliability[layover_shadow_mask > 0] = 0.1
    else:
        # Default to a uniform moderate score if no mask is available
        reliability.fill(0.6)
        
    # Heuristic for speckle/noise: extreme values in SAR (very high or very low) are less reliable
    if sar_array.ndim == 3:
        # Check standard deviation across channels if available, or just extreme values
        extreme = np.any((sar_array < -30) | (sar_array > 10), axis=0) # Assuming dB scale
    else:
        extreme = (sar_array < -30) | (sar_array > 10)
        
    reliability[extreme] = np.minimum(reliability[extreme], 0.3)
    
    result = np.broadcast_to(reliability, sar_array.shape).astype(np.float32)
    return np.clip(result, 0.0, 1.0)
