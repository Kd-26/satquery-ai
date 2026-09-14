"""
Provider abstractions for SatQuery AI.
"""
from backend.services.providers.base import AgentProvider, VisualProvider, SegmentationProvider
from backend.services.providers.openai_provider import OpenAIProvider
from backend.services.providers.qwen_service import QwenService
from backend.services.providers.segmentation_provider import LocalSegmentationProvider

__all__ = [
    "AgentProvider",
    "VisualProvider",
    "SegmentationProvider",
    "OpenAIProvider",
    "QwenService",
    "LocalSegmentationProvider",
]
