from pydantic import BaseModel, ConfigDict
from typing import List, Optional, Dict, Any

class Claim(BaseModel):
    model_config = ConfigDict(extra='forbid')
    
    claim: str
    measurement: float
    region_id: str
    source_images: List[str]
    tool: str
    confidence: float

class EvidencePackage(BaseModel):
    model_config = ConfigDict(extra='forbid')
    
    run_id: str
    claims: List[Claim]
    masks_ref: Optional[Dict[str, str]] = None
    overlays_ref: Optional[Dict[str, str]] = None
    limitations: List[str]
    model_versions: Dict[str, str]
