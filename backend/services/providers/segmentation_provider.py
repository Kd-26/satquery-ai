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

        if not self.endpoint:
            raise RuntimeError("A deployed segmentation endpoint is required.")
        try:
            resp = requests.post(
                f"{self.endpoint.rstrip('/')}/segment",
                json=payload,
                timeout=settings.segmentation_attempt_timeout_s,
            )
            resp.raise_for_status()
            result = resp.json()
        except (requests.RequestException, ValueError) as exc:
            raise RuntimeError(
                f"Deployed segmentation call failed: {type(exc).__name__}"
            ) from exc
        if not isinstance(result, dict) or not (
            "masks" in result or "mask_ref" in result
        ):
            raise RuntimeError("Deployed segmentation returned an invalid response contract.")
        return result

    def health(self) -> Dict[str, Any]:
        """
        Return health status of the segmentation provider.
        """
        return {
            "status": "configured" if self.endpoint else "unconfigured",
            "provider": "deployed_segmentation",
            "endpoint": self.endpoint,
        }
