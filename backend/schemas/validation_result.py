from pydantic import BaseModel, ConfigDict
from typing import List, Dict

class ValidationResult(BaseModel):
    model_config = ConfigDict(extra='forbid')
    
    approved: bool
    restrictions: List[str]
    errors: List[str]
    confidence_caps: Dict[str, float]
