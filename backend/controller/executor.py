import time
import httpx
import numpy as np
from typing import Dict, Any

from backend.schemas.execution_plan import ExecutionPlan
from backend.schemas.validation_result import ValidationResult
from backend.controller.preprocessing import prepare_model_input
from backend.registry.registry_loader import get_by_id

class ExecutorError(Exception):
    pass

def _mock_model_inference(tensor: np.ndarray, model_id: str, contract: dict, classes: list) -> dict:
    # A mocked inference returning masks and scores
    # tensor shape is (batch, channels, h, w)
    batch, c, h, w = tensor.shape
    classes = classes or ["mock_class"]
    
    masks = {}
    scores = {}
    for cls in classes:
        # Mock values
        mask = (np.random.rand(batch, h, w) > 0.5).astype(np.uint8)
        score = np.random.rand(batch, h, w).astype(np.float32)
        masks[cls] = mask
        scores[cls] = score
        
    return {"masks": masks, "scores": scores}

from backend.scientific_tools.quality import compute_valid_mask
from backend.controller.ingestion import resolve_metadata
from backend.scientific_tools.raster_io import read_bands
from pathlib import Path

def _stitch_tiles(batch_tensor: np.ndarray, tile_transforms: list, dtype=np.float32) -> np.ndarray:
    if not tile_transforms:
        return batch_tensor[0]
        
    max_h = max(t["y_offset"] + t["orig_h"] for t in tile_transforms)
    max_w = max(t["x_offset"] + t["orig_w"] for t in tile_transforms)
    
    stitched = np.zeros((max_h, max_w), dtype=dtype)
    for i, t in enumerate(tile_transforms):
        y, x = t["y_offset"], t["x_offset"]
        oh, ow = t["orig_h"], t["orig_w"]
        stitched[y:y+oh, x:x+ow] = batch_tensor[i, :oh, :ow]
    return stitched

def run_single_image_workflow(plan: ExecutionPlan, validation: ValidationResult) -> Dict[str, Any]:
    if not validation.approved:
        raise ExecutorError("Cannot run workflow: Validation rejected the plan.")
        
    if not plan.images:
        raise ExecutorError("No images provided in ExecutionPlan.")
        
    image_id = plan.images[0]
    traces = []
    
    masks_out = {}
    scores_out = {}
    measurements_out = {}
    tool_outputs = {}
    
    # Compute valid mask for the entire image
    profile = resolve_metadata(image_id)
    artifact_dir = Path(f"./artifacts/{image_id}")
    files = list(artifact_dir.glob("original.*"))
    file_path = str(files[0])
    raw_raster = read_bands(file_path)
    
    valid_mask = compute_valid_mask(raw_raster, nodata_value=profile.nodata_value)
    
    for model_id in plan.required_models:
        start_t = time.time()
        
        prep_res = prepare_model_input(image_id, model_id)
        tensor = prep_res["tensor_or_path"]
        tile_transforms = prep_res["tile_transforms"]
        
        entry = get_by_id(model_id)
        endpoint = entry.endpoint
        contract = entry.input_contract
        classes = entry.classes
        
        try:
            # We mock the response if the service isn't up
            result = _mock_model_inference(tensor, model_id, contract, classes)
        except Exception as e:
            raise ExecutorError(f"Model service {model_id} failed: {e}")
            
        dur = time.time() - start_t
        traces.append({
            "step": "model_inference",
            "model_id": model_id,
            "duration_s": dur,
            "status": "success"
        })
        
        for cls, mask in result["masks"].items():
            # Stitch tiles
            stitched_mask = _stitch_tiles(mask, tile_transforms, dtype=np.uint8)
            stitched_score = _stitch_tiles(result["scores"][cls], tile_transforms, dtype=np.float32)
            
            # Apply valid mask
            stitched_mask &= valid_mask
            stitched_score[~valid_mask] = 0.0
            
            masks_out[f"{model_id}_{cls}"] = stitched_mask
            scores_out[f"{model_id}_{cls}"] = stitched_score
            
    # Process optional tools
    for tool_call in plan.optional_tools:
        if tool_call.startswith("compute_spectral_index:"):
            index_name = tool_call.split(":")[1].upper()
            start_t = time.time()
            
            try:
                if index_name == "NDWI":
                    green_idx = profile.band_identities.index("G")
                    nir_idx = profile.band_identities.index("NIR")
                    
                    from backend.scientific_tools.indices import compute_ndwi
                    result = compute_ndwi(raw_raster[green_idx], raw_raster[nir_idx])
                    
                elif index_name == "NDVI":
                    red_idx = profile.band_identities.index("R")
                    nir_idx = profile.band_identities.index("NIR")
                    
                    from backend.scientific_tools.indices import compute_ndvi
                    result = compute_ndvi(raw_raster[nir_idx], raw_raster[red_idx])
                else:
                    raise ValueError(f"Unsupported spectral index: {index_name}")
                    
                result[~valid_mask] = np.nan
                tool_outputs[index_name] = result
                
                dur = time.time() - start_t
                traces.append({
                    "step": "tool_execution",
                    "tool": tool_call,
                    "duration_s": dur,
                    "status": "success"
                })
            except ValueError as e:
                traces.append({
                    "step": "tool_execution",
                    "tool": tool_call,
                    "duration_s": time.time() - start_t,
                    "status": "failed",
                    "reason": str(e)
                })
            
    return {
        "masks": masks_out,
        "scores": scores_out,
        "measurements": measurements_out,
        "tool_outputs": tool_outputs,
        "traces": traces
    }

def run_temporal_workflow(plan: ExecutionPlan, validation: ValidationResult) -> Dict[str, Any]:
    if not validation.approved:
        raise ExecutorError("Cannot run workflow: Validation rejected the plan.")
        
    if len(plan.images) < 2:
        raise ExecutorError("Temporal workflow requires at least 2 images.")
        
    image_t1 = plan.images[0]
    image_t2 = plan.images[1]
    
    plan_t1 = plan.model_copy(update={"images": [image_t1]})
    plan_t2 = plan.model_copy(update={"images": [image_t2]})
    
    res_t1 = run_single_image_workflow(plan_t1, validation)
    res_t2 = run_single_image_workflow(plan_t2, validation)
    
    masks_out = {}
    scores_out = {}
    measurements_out = {}
    tool_outputs = {}
    
    # We will populate these in subsequent commits
    
    return {
        "masks": masks_out,
        "scores": scores_out,
        "measurements": measurements_out,
        "tool_outputs": tool_outputs,
        "traces": res_t1["traces"] + res_t2["traces"]
    }
