import json
from backend.schemas.input_profile import InputProfile
from backend.schemas.execution_plan import ExecutionPlan
from backend.registry import registry_loader

class PlannerParseError(Exception):
    pass

class VLMServiceStub:
    @staticmethod
    def generate(prompt: str, images: list, adapter: str = None) -> str:
        return "{}"

try:
    from model_services.vlm_service import inference
except ImportError:
    inference = VLMServiceStub()

def _build_planner_prompt(query: str, input_profiles: list[InputProfile]) -> str:
    registry_entries = registry_loader.query()
    registry_summary = []
    for entry in registry_entries:
        registry_summary.append({
            "id": entry.id,
            "type": entry.type,
            "modality": entry.modality,
            "task": getattr(entry, "task", None),
            "classes": entry.classes
        })
        
    profiles_summary = [p.model_dump() for p in input_profiles]
    
    schema_json = ExecutionPlan.model_json_schema()
    
    prompt = (
        "You are the SatQuery AI Planning Agent.\n"
        "Your task is to select the appropriate models and tools to answer the user's query based on the available input profiles and the registry of capabilities.\n\n"
        f"USER QUERY: {query}\n\n"
        f"INPUT PROFILES:\n{json.dumps(profiles_summary, indent=2)}\n\n"
        f"CAPABILITY REGISTRY:\n{json.dumps(registry_summary, indent=2)}\n\n"
        "INSTRUCTIONS:\n"
        "Respond ONLY with a valid JSON object that exactly matches the following JSON Schema.\n"
        "Do not include markdown blocks, explanations, or any other text outside the JSON object.\n\n"
        f"JSON SCHEMA:\n{json.dumps(schema_json, indent=2)}\n"
    )
    return prompt

def plan(query: str, image_ids: list[str], input_profiles: list[InputProfile]) -> ExecutionPlan:
    prompt = _build_planner_prompt(query, input_profiles)
    
    response_text = inference.generate(prompt=prompt, images=image_ids, adapter=None)
    
    try:
        return ExecutionPlan.model_validate_json(response_text)
    except Exception as e:
        parse_error = str(e)
        
    retry_prompt = (
        f"{prompt}\n\n"
        "ATTENTION: Your previous response failed to parse as valid JSON matching the schema.\n"
        f"ERROR DETAILS: {parse_error}\n"
        "Please fix the error and respond ONLY with the valid JSON object."
    )
    
    retry_response = inference.generate(prompt=retry_prompt, images=image_ids, adapter=None)
    
    try:
        return ExecutionPlan.model_validate_json(retry_response)
    except Exception as e:
        raise PlannerParseError(f"Failed to parse ExecutionPlan after retry. Final error: {e}")
