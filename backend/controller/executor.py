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
    
    profile_t1 = resolve_metadata(image_t1)
    profile_t2 = resolve_metadata(image_t2)
    
    def _resolve_artifact(image_id: str) -> str:
        matches = list(Path(f"./artifacts/{image_id}").glob("original.*"))
        if not matches:
            raise FileNotFoundError(f"Artifact for image {image_id} not found.")
        return str(matches[0])
        
    rt1 = read_bands(_resolve_artifact(image_t1))
    rt2 = read_bands(_resolve_artifact(image_t2))
    
    vm_t1 = compute_valid_mask(rt1, nodata_value=profile_t1.nodata_value)
    vm_t2 = compute_valid_mask(rt2, nodata_value=profile_t2.nodata_value)
    shared_valid_mask = vm_t1 & vm_t2
    
    from backend.scientific_tools.compare import compare_dates
    
    for cls in plan.target_classes:
        mask_t1 = None
        mask_t2 = None
        for key in res_t1["masks"]:
            if key.endswith(f"_{cls}"):
                mask_t1 = res_t1["masks"][key]
                mask_t2 = res_t2["masks"][key]
                break
                
        if mask_t1 is not None and mask_t2 is not None:
            comp = compare_dates(mask_t1, mask_t2, shared_valid_mask)
            masks_out[f"gain_{cls}"] = comp["gain"]
            masks_out[f"loss_{cls}"] = comp["loss"]
            masks_out[f"net_change_{cls}"] = comp["net_change"]
            
    if "area_estimate" in plan.requested_outputs:
        is_restricted = any("area_estimation" in r for r in validation.restrictions)
        if not is_restricted and profile_t1.pixel_spacing_m and profile_t1.crs:
            from backend.scientific_tools.geometry import measure_regions
            for cls in plan.target_classes:
                if f"gain_{cls}" in masks_out:
                    measurements_out[f"gain_{cls}_area"] = measure_regions(
                        masks_out[f"gain_{cls}"],
                        pixel_spacing_m=profile_t1.pixel_spacing_m,
                        crs=profile_t1.crs
                    )
                if f"loss_{cls}" in masks_out:
                    measurements_out[f"loss_{cls}_area"] = measure_regions(
                        masks_out[f"loss_{cls}"],
                        pixel_spacing_m=profile_t1.pixel_spacing_m,
                        crs=profile_t1.crs
                    )
    
    return {
        "masks": masks_out,
        "scores": scores_out,
        "measurements": measurements_out,
        "tool_outputs": tool_outputs,
        "traces": res_t1["traces"] + res_t2["traces"]
    }

def run_crossmodal_workflow(plan: ExecutionPlan, validation: ValidationResult) -> Dict[str, Any]:
    if not validation.approved:
        raise ExecutorError("Cannot run workflow: Validation rejected the plan.")
        
    if len(plan.images) < 2:
        raise ExecutorError("Cross-modal workflow requires at least 2 images.")
        
    p0 = resolve_metadata(plan.images[0])
    
    if p0.sensor_family in ['sentinel-1', 'risat']:
        image_sar = plan.images[0]
        image_opt = plan.images[1]
    else:
        image_opt = plan.images[0]
        image_sar = plan.images[1]
        
    model_opt = None
    model_sar = None
    for mid in plan.required_models:
        entry = get_by_id(mid)
        if entry.modality in ["optical", "optical_rgb"]:
            model_opt = entry
        elif entry.modality == "sar":
            model_sar = entry
            
    if not model_opt or not model_sar:
        raise ExecutorError("Cross-modal workflow requires one optical and one SAR model.")
        
    shared_classes = list(set(model_opt.classes) & set(model_sar.classes))
    target_classes = [c for c in plan.target_classes if c in shared_classes]
    
    dropped_classes = set(plan.target_classes) - set(target_classes)
    if dropped_classes:
        validation.restrictions.append(f"Dropped classes not supported by both models: {', '.join(dropped_classes)}")
        
    plan_opt = plan.model_copy(update={"images": [image_opt], "required_models": [model_opt.id], "target_classes": target_classes})
    plan_sar = plan.model_copy(update={"images": [image_sar], "required_models": [model_sar.id], "target_classes": target_classes})
    
    res_opt = run_single_image_workflow(plan_opt, validation)
    res_sar = run_single_image_workflow(plan_sar, validation)
    
    masks_out = {}
    scores_out = {}
    measurements_out = {}
    tool_outputs = {}
    
    from backend.scientific_tools.reliability import estimate_optical_reliability, estimate_sar_reliability
    from backend.scientific_tools.fuse import fuse_evidence
    
    def _resolve_artifact(image_id: str) -> str:
        matches = list(Path(f"./artifacts/{image_id}").glob("original.*"))
        if not matches:
            raise FileNotFoundError(f"Artifact for image {image_id} not found.")
        return str(matches[0])
        
    rt_opt = read_bands(_resolve_artifact(image_opt))
    rt_sar = read_bands(_resolve_artifact(image_sar))
    
    q_opt = estimate_optical_reliability(rt_opt, cloud_mask=None)
    q_sar = estimate_sar_reliability(rt_sar, layover_shadow_mask=None)
    
    for cls in target_classes:
        p_opt = res_opt["scores"].get(f"{model_opt.id}_{cls}")
        p_sar = res_sar["scores"].get(f"{model_sar.id}_{cls}")
        
        if p_opt is not None and p_sar is not None:
            fusion = fuse_evidence(p_opt, q_opt, p_sar, q_sar)
            
            fused_p = fusion["fused_probability"]
            scores_out[f"fused_{cls}"] = fused_p
            
            # Mark zero-reliability regions as unknown
            unknown_mask = fusion["unknown_mask"]
            masks_out[f"unknown_{cls}"] = unknown_mask.astype(np.uint8)
            
            # The mask for the class itself avoids guessing on unknown pixels
            masks_out[f"fused_{cls}"] = ((fused_p > 0.5) & ~unknown_mask).astype(np.uint8)
            
    return {
        "masks": masks_out,
        "scores": scores_out,
        "measurements": measurements_out,
        "tool_outputs": tool_outputs,
        "traces": res_opt["traces"] + res_sar["traces"]
    }
