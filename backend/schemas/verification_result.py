from pydantic import BaseModel, ConfigDict
from typing import List

class VerificationResult(BaseModel):
    model_config = ConfigDict(extra='forbid')
    
    passed: bool
    flagged_claims: List[str]
    notes: List[str]
