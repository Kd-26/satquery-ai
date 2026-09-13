from pydantic import BaseModel, ConfigDict, Field
from typing import List, Optional, Dict, Any

class Claim(BaseModel):
    model_config = ConfigDict(extra='forbid')
    
    claim: str
    measurement: float
    # Unit is explicit so percentages and dimensionless indices can never be
    # serialized as physical area.
    unit: str = "ha"
    region_id: str
    source_images: List[str]
    tool: str
    confidence: float
    uncertainty: Optional[float] = None
    crs: Optional[str] = None
    source_bands: List[str] = Field(default_factory=list)
    parameters: Dict[str, Any] = Field(default_factory=dict)
    tool_version: str = "1.0.0"
    artifact_ref: Optional[str] = None
    derivation: List[str] = Field(default_factory=list)

class EvidencePackage(BaseModel):
    model_config = ConfigDict(extra='forbid')
    
    run_id: str
    claims: List[Claim]
    masks_ref: Optional[Dict[str, str]] = None
    overlays_ref: Optional[Dict[str, str]] = None
    limitations: List[str]
    model_versions: Dict[str, str]
