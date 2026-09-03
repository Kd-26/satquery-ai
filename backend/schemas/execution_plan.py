from pydantic import BaseModel, ConfigDict
from typing import List, Optional

class ExecutionPlan(BaseModel):
    model_config = ConfigDict(extra='forbid')
    
    workflow: str
    images: List[str]
    target_classes: List[str]
    required_models: List[str]
    optional_tools: List[str]
    requested_outputs: List[str]
    final_adapter: Optional[str]
    fallback: Optional[str]
