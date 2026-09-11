import os
from pathlib import Path
import numpy as np

class IncompatibleInputError(Exception):
    pass

def _find_band_index(rb: str, actual_bands: list[str], file_channels: int) -> int | None:
    rb_upper = rb.upper()
    # 1. Exact match
    for i, b in enumerate(actual_bands):
        if b.upper() == rb_upper:
            return i

    # 2. Optical RGB / Sentinel-2 band mappings (B4=Red, B3=Green, B2=Blue, B8=NIR)
    if rb_upper in ("R", "RED"):
        for i, b in enumerate(actual_bands):
            if b.upper() in ("B4", "RED", "BAND_4", "R"):
                return i
        if file_channels in (3, 4) and len(actual_bands) >= 1:
            return 0
    elif rb_upper in ("G", "GREEN"):
        for i, b in enumerate(actual_bands):
            if b.upper() in ("B3", "GREEN", "BAND_3", "G"):
                return i
        if file_channels in (3, 4) and len(actual_bands) >= 2:
            return 1
    elif rb_upper in ("B", "BLUE"):
        for i, b in enumerate(actual_bands):
            if b.upper() in ("B2", "BLUE", "BAND_2", "B"):
                return i
        if file_channels in (3, 4) and len(actual_bands) >= 3:
            return 2
    elif rb_upper in ("NIR", "NEAR_INFRARED"):
        for i, b in enumerate(actual_bands):
            if b.upper() in ("B8", "B8A", "NIR", "BAND_8", "BAND_4"):
                return i
        if file_channels == 4 and len(actual_bands) >= 4:
            return 3
    elif rb_upper in ("SWIR1", "SWIR_1", "SHORTWAVE_INFRARED_1"):
        # Sentinel-2 B11 (1610 nm) — used by MNDWI, NDBI
        for i, b in enumerate(actual_bands):
            if b.upper() in ("B11", "SWIR1", "SWIR_1", "BAND_11"):
                return i
    elif rb_upper in ("SWIR2", "SWIR_2", "SHORTWAVE_INFRARED_2"):
        # Sentinel-2 B12 (2190 nm) — used by NBR, burn-area indices
        for i, b in enumerate(actual_bands):
            if b.upper() in ("B12", "SWIR2", "SWIR_2", "BAND_12"):
                return i
    # 3. SAR VV / VH mappings
    elif rb_upper == "VV":
        for i, b in enumerate(actual_bands):
            if b.upper() in ("VV", "BAND_1"):
                return i
        if file_channels in (1, 2) and len(actual_bands) >= 1:
            return 0
    elif rb_upper == "VH":
        for i, b in enumerate(actual_bands):
            if b.upper() in ("VH", "BAND_2"):
                return i
        if file_channels == 2 and len(actual_bands) >= 2:
            return 1

    return None

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
        matched_idx = _find_band_index(rb, actual_band_identities, profile.channels)
        if matched_idx is not None:
            band_indices.append(matched_idx)
        else:
            raise IncompatibleInputError(f"Required band/polarization '{rb}' is missing from the image's InputProfile.")
            
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
            
    # Tiling
    tile_transforms = []
    min_res = contract.get("min_resolution_px")
    if min_res and (tensor.shape[1] > min_res[0] or tensor.shape[2] > min_res[1]):
        tile_h, tile_w = min_res
        tiles = []
        for y in range(0, tensor.shape[1], tile_h):
            for x in range(0, tensor.shape[2], tile_w):
                y_end = min(y + tile_h, tensor.shape[1])
                x_end = min(x + tile_w, tensor.shape[2])
                
                tile = tensor[:, y:y_end, x:x_end]
                
                pad_h = tile_h - tile.shape[1]
                pad_w = tile_w - tile.shape[2]
                if pad_h > 0 or pad_w > 0:
                    tile = np.pad(tile, ((0, 0), (0, pad_h), (0, pad_w)), mode='constant')
                    
                tiles.append(tile)
                tile_transforms.append({
                    "y_offset": y,
                    "x_offset": x,
                    "orig_h": y_end - y,
                    "orig_w": x_end - x,
                    "pad_h": pad_h,
                    "pad_w": pad_w
                })
        tensor = np.stack(tiles)
    else:
        # Add batch dimension
        tensor = np.expand_dims(tensor, axis=0)
        tile_transforms.append({
            "y_offset": 0,
            "x_offset": 0,
            "orig_h": tensor.shape[2], # axis 2 is height because of batch dim
            "orig_w": tensor.shape[3], # axis 3 is width
            "pad_h": 0,
            "pad_w": 0
        })
            
    return {
        "tensor_or_path": tensor,
        "tile_transforms": tile_transforms,
        "band_order_used": band_order_used
    }
