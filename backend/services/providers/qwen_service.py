import json
import logging
import time
import requests
from typing import Any, Dict, List, Optional

from backend.core.config import settings
from backend.services.providers.base import VisualProvider

logger = logging.getLogger(__name__)

class QwenService(VisualProvider):
    """
    Visual Specialist implementation using Qwen 9B.
    Handles Multi-LoRA routing per-request.
    """
    def __init__(self):
        self.endpoint = settings.visual_model_endpoint
        self.base_model = settings.qwen_base_model_path
        
    def _call_qwen(self, prompt: str, images: List[str], adapter_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Inner method to invoke the Qwen API. 
        Passes adapter_id to support dynamic Multi-LoRA switching.
        """
        messages = [{"role": "user", "content": [{"type": "text", "text": prompt}]}]
        for img in images:
            messages[0]["content"].append({"type": "image_url", "image_url": {"url": img}})
            
        payload = {
            "model": self.base_model,
            "messages": messages,
            "adapter_id": adapter_id, # Custom parameter for multi-LoRA setup
            "temperature": 0.2
        }
        
        try:
            # resp = requests.post(f"{self.endpoint}/chat/completions", json=payload, timeout=120)
            # resp.raise_for_status()
            # result = resp.json()
            # return {
            #     "statement": result["choices"][0]["message"]["content"],
            #     "latency": resp.elapsed.total_seconds(),
            #     "adapter": adapter_id,
            #     "model": self.base_model
            # }
            
            # MOCK IMPLEMENTATION
            logger.info(f"Mock Qwen call: adapter={adapter_id}")
            return {
                "statement": f"Visual observation from Qwen using adapter {adapter_id}: " + prompt[:30],
                "latency": 0.5,
                "adapter": adapter_id,
                "model": self.base_model,
                "confidence": 0.85,
                "limitations": ["Visual observation only; not georeferenced."]
            }
        except Exception as e:
            logger.error(f"Qwen API error: {e}")
            raise e

    def observe(self, images: List[str], prompt: str, adapter_id: Optional[str] = None) -> Dict[str, Any]:
        """Observe a scene (optical or SAR) using the appropriate adapter."""
        # Deterministic LoRA selection if none provided
        eff_adapter = adapter_id or settings.lora_optical
        return self._call_qwen(prompt, images, adapter_id=eff_adapter)

    def compare(self, image_t1: str, image_t2: str, prompt: str, adapter_id: Optional[str] = None) -> Dict[str, Any]:
        """Compare two scenes temporally."""
        eff_adapter = adapter_id or settings.lora_temporal
        return self._call_qwen(prompt, [image_t1, image_t2], adapter_id=eff_adapter)

    def ground(self, image: str, prompt: str, adapter_id: Optional[str] = None) -> Dict[str, Any]:
        """Provide region grounding bounding boxes or prompts."""
        eff_adapter = adapter_id or settings.lora_grounding
        return self._call_qwen(prompt, [image], adapter_id=eff_adapter)

    def health(self) -> Dict[str, Any]:
        """Return health status."""
        return {"status": "mock", "provider": "qwen_local"}
