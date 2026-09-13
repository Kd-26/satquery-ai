from typing import Literal

from pydantic import BaseModel, ConfigDict


AnalysisMode = Literal[
    "general_knowledge",
    "visual_interpretation",
    "quality_analysis",
    "spectral_analysis",
    "sar_analysis",
    "temporal_analysis",
    "segmentation",
]


class RoutingDecision(BaseModel):
    """Deterministic, auditable decision made before the LLM planner."""

    model_config = ConfigDict(extra="forbid")

    mode: AnalysisMode
    requires_segmentation: bool
    required_tools: list[str]
    claim_policy: Literal["conversational", "qualitative_only", "computed", "model_inference"]
    reason: str
