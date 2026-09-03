import os
from pathlib import Path
import numpy as np

class IncompatibleInputError(Exception):
    pass

def prepare_model_input(image_id: str, model_id: str) -> dict:
    from backend.registry.registry_loader import get_by_id
    from backend.controller.ingestion import resolve_metadata
    from backend.scientific_tools.raster_io import read_bands
    
    # Read registry contract
    entry = get_by_id(model_id)
    contract = entry.input_contract
    
    # Get image profile
    profile = resolve_metadata(image_id)
    
    # Find original image path
    artifact_dir = Path(f"./artifacts/{image_id}")
    files = list(artifact_dir.glob("original.*"))
    if not files:
        raise FileNotFoundError(f"Original file not found for image {image_id}")
    file_path = str(files[0])
    
    # Determine required bands/polarization
    required_bands = contract.get("bands") or contract.get("polarization_order", [])
    
    # Reorder/select bands
    band_indices = []
    actual_band_identities = profile.band_identities
    
    for rb in required_bands:
        if rb in actual_band_identities:
            band_indices.append(actual_band_identities.index(rb))
        else:
            # Fallback for missing bands before error handling is added in commit 3
            band_indices.append(0)
            
    # rasterio bands are 1-indexed
    tensor = read_bands(file_path, band_indices=[i + 1 for i in band_indices])
    
    band_order_used = [actual_band_identities[i] for i in band_indices]
    
    # Apply scale/normalization
    if contract.get("scale"):
        scale_min, scale_max = contract["scale"]
        tensor = np.clip(tensor, scale_min, scale_max)
        tensor = (tensor - scale_min) / (scale_max - scale_min)
        
    if contract.get("normalization") == "imagenet_mean_std":
        mean = np.array([0.485, 0.456, 0.406]).reshape(3, 1, 1)
        std = np.array([0.229, 0.224, 0.225]).reshape(3, 1, 1)
        if tensor.shape[0] == 3:
            tensor = (tensor - mean) / std
            
    return {
        "tensor_or_path": tensor,
        "tile_transforms": [],
        "band_order_used": band_order_used
    }
