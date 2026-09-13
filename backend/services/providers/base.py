from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional

class AgentProvider(ABC):
    """
    Central Agent Brain provider. Responsible for planning, intent resolution,
    and explaining evidence. Must not calculate remote-sensing measurements itself.
    """
    @abstractmethod
    def complete(self, prompt: str, system: Optional[str] = None) -> str:
        """Return a plain text response."""
        pass

    @abstractmethod
    def structured(self, prompt: str, schema: Dict[str, Any], tool_name: str, system: Optional[str] = None) -> Dict[str, Any]:
        """Return a structured response fulfilling the requested schema."""
        pass

    @abstractmethod
    def health(self) -> Dict[str, Any]:
        """Return health status of the provider."""
        pass

class VisualProvider(ABC):
    """
    Visual Specialist provider. Responsible for visual interpretations of optical
    and SAR data. Does not control workflow or produce precise georeferenced masks.
    """
    @abstractmethod
    def observe(self, images: List[str], prompt: str, adapter_id: Optional[str] = None) -> Dict[str, Any]:
        """Observe a scene and return a structured visual observation."""
        pass

    @abstractmethod
    def compare(self, image_t1: str, image_t2: str, prompt: str, adapter_id: Optional[str] = None) -> Dict[str, Any]:
        """Compare two scenes temporally."""
        pass

    @abstractmethod
    def ground(self, image: str, prompt: str, adapter_id: Optional[str] = None) -> Dict[str, Any]:
        """Provide region grounding or prompts for a segmentation model."""
        pass

    @abstractmethod
    def health(self) -> Dict[str, Any]:
        """Return health status of the visual provider."""
        pass

class SegmentationProvider(ABC):
    """
    Dedicated Segmentation provider. Only invoked when bounding boxes, masks,
    or feature-specific areas are requested.
    """
    @abstractmethod
    def segment(self, image: str, target_classes: List[str], prompt: Optional[str] = None) -> Dict[str, Any]:
        """Produce a georeferenced mask and confidence raster."""
        pass

    @abstractmethod
    def health(self) -> Dict[str, Any]:
        """Return health status of the segmentation provider."""
        pass
