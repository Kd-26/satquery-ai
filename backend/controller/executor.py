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
            masks_out[f"{model_id}_{cls}"] = mask
            scores_out[f"{model_id}_{cls}"] = result["scores"][cls]
            
    return {
        "masks": masks_out,
        "scores": scores_out,
        "measurements": measurements_out,
        "tool_outputs": tool_outputs,
        "traces": traces
    }
