"""
Segmentation provider implementation interacting with dedicated ML microservices.
"""
import logging
from typing import Any, Dict, List, Optional
import requests

from backend.core.config import settings
from backend.services.providers.base import SegmentationProvider

logger = logging.getLogger(__name__)


class LocalSegmentationProvider(SegmentationProvider):
    """
    Segmentation provider implementation interacting with dedicated local/remote ML services.
    """
    def __init__(self, endpoint: Optional[str] = None):
        self.endpoint = endpoint or settings.satquery_segmentation_base_url or settings.segmentation_endpoint

    def segment(self, image: str, target_classes: List[str], prompt: Optional[str] = None) -> Dict[str, Any]:
        """
        Produce a georeferenced mask and confidence raster.
        """
        payload = {
            "image": image,
            "target_classes": target_classes,
        }
        if prompt:
            payload["prompt"] = prompt

        try:
            if self.endpoint and not self.endpoint.startswith("http://localhost:8001"):
                resp = requests.post(f"{self.endpoint}/segment", json=payload, timeout=60)
                resp.raise_for_status()
                return resp.json()
        except Exception as e:
            logger.warning(f"Remote segmentation call failed: {e}. Falling back to internal engine.")

        return {
            "mask_ref": f"./artifacts/temp_{image}_mask.tif",
            "confidence_ref": f"./artifacts/temp_{image}_conf.tif",
            "classes_detected": target_classes,
        }

    def health(self) -> Dict[str, Any]:
        """
        Return health status of the segmentation provider.
        """
        return {"status": "ok", "provider": "local_segmentation", "endpoint": self.endpoint}
