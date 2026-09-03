import numpy as np

def compare_dates(mask_t1: np.ndarray, mask_t2: np.ndarray, valid_mask: np.ndarray) -> dict:
    if not (mask_t1.shape == mask_t2.shape == valid_mask.shape):
        raise ValueError("Shapes of T1 mask, T2 mask, and valid_mask must match.")
        
    t1 = (mask_t1 > 0) & valid_mask
    t2 = (mask_t2 > 0) & valid_mask
    
    gain = (~t1) & t2
    loss = t1 & (~t2)
    net_change = gain | loss
    
    return {
        "gain": gain,
        "loss": loss,
        "net_change": net_change
    }
