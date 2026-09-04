import uuid
from typing import Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from backend.db.models import Experiment
from backend.schemas.execution_plan import ExecutionPlan

async def create_experiment(session: AsyncSession, parent_run_id: str, parameter_overrides: Dict[str, Any], parent_plan_dict: dict) -> str:
    """
    Creates an experiment by overriding parameters of a parent run without mutating the original evidence.
    Determines the earliest affected stage so we don't rerun unnecessary upstream work.
    """
    experiment_id = str(uuid.uuid4())
    
    # Analyze the overrides to determine rerun_stage_from
    # Possible stages: "preprocessing", "model_inference", "tool_execution", "fusion"
    rerun_stage_from = "model_inference" # default assumption
    
    if "model_id" in parameter_overrides:
        rerun_stage_from = "model_inference"
        # Swap model in plan
        parent_plan_dict["required_models"] = [parameter_overrides["model_id"]]
        
    if "segmentation_threshold" in parameter_overrides:
        rerun_stage_from = "model_inference" # threshold usually applied in/after inference
        # In actual implementation, we pass this into the model kwargs
        parent_plan_dict["parameters"] = parent_plan_dict.get("parameters", {})
        parent_plan_dict["parameters"]["threshold"] = parameter_overrides["segmentation_threshold"]
        
    if "tool_toggle" in parameter_overrides:
        rerun_stage_from = "tool_execution"
        toggles = parameter_overrides["tool_toggle"]
        if parent_plan_dict.get("optional_tools"):
            parent_plan_dict["optional_tools"] = [
                tool for tool in parent_plan_dict["optional_tools"] 
                if toggles.get(tool, True)
            ]
            
    if "fusion_weight_override" in parameter_overrides:
        rerun_stage_from = "fusion"
        parent_plan_dict["parameters"] = parent_plan_dict.get("parameters", {})
        parent_plan_dict["parameters"]["fusion_weights"] = parameter_overrides["fusion_weight_override"]

    # We would theoretically call executor DAG here, starting from `rerun_stage_from`, 
    # reusing run_single_image_workflow or run_temporal_workflow on the mutated plan.
    
    # Write to DB
    exp_db = Experiment(
        id=uuid.UUID(experiment_id),
        parent_run_id=parent_run_id,
        parameter_overrides_json=parameter_overrides,
        rerun_stage_from=rerun_stage_from,
        status="running"
    )
    session.add(exp_db)
    await session.commit()
    
    return experiment_id
