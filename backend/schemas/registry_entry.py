from pydantic import BaseModel, ConfigDict
from typing import Optional, List, Dict, Any, Union

class RegistryEntry(BaseModel):
    model_config = ConfigDict(extra='forbid')
    
    id: str
    type: str
    modality: str
    input_contract: Dict[str, Any]
    classes: Optional[List[str]] = None
    resolution_range_m: Optional[List[float]] = None
    endpoint: Optional[str] = None
    task: Optional[str] = None
    version: str
    adapter_compatible: bool
    calibrated_confidence: Optional[bool] = None
    trained_on: Optional[Union[str, List[str]]] = None
    eval_summary: Optional[Union[str, Dict[str, Any]]] = None
    known_domain_shift_sensors: Optional[List[str]] = None
    notes: Optional[str] = None
