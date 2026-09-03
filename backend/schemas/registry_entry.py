from pydantic import BaseModel, ConfigDict
from typing import Optional, List, Dict, Any

class RegistryEntry(BaseModel):
    model_config = ConfigDict(extra='forbid')
    
    id: str
    type: str
    modality: str
    input_contract: Dict[str, Any]
    classes: Optional[List[str]] = None
    resolution_range_m: Optional[List[float]] = None
    endpoint: str
    version: str
    adapter_compatible: bool
    calibrated_confidence: Optional[bool] = None
    trained_on: Optional[str] = None
    eval_summary: Optional[str] = None
    known_domain_shift_sensors: Optional[List[str]] = None
    notes: Optional[str] = None
