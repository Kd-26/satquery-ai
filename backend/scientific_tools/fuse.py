import numpy as np

def fuse_evidence(p_opt: np.ndarray, q_opt: np.ndarray, p_sar: np.ndarray, q_sar: np.ndarray) -> dict:
    if not (p_opt.shape == q_opt.shape == p_sar.shape == q_sar.shape):
        raise ValueError("All input arrays must have the same shape.")
        
    denominator = q_opt + q_sar
    
    with np.errstate(divide='ignore', invalid='ignore'):
        p_fused = (q_opt * p_opt + q_sar * p_sar) / denominator
        
    p_fused = np.where(denominator > 0, p_fused, np.nan)
    
    return {
        "fused_probability": p_fused,
        "unknown_mask": denominator <= 0
    }
