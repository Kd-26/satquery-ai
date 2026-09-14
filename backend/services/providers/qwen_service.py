"""
Visual Specialist implementation using fine-tuned VLM (e.g. Qwen / Custom VLM on Modal).
Handles Multi-LoRA routing per-request and satellite image visual observations.
"""
import base64
import logging
import mimetypes
import os
import time
from pathlib import Path
import requests
from typing import Any, Dict, List, Optional

from backend.core.config import settings
from backend.services.providers.base import VisualProvider

logger = logging.getLogger(__name__)


class QwenServiceError(RuntimeError):
    """Raised when the Modal visual-specialist contract cannot be satisfied."""


class QwenService(VisualProvider):
    """
    Visual Specialist implementation.
    Connects to Modal / hosted VLM endpoint and handles dynamic Multi-LoRA switching.
    """
    def __init__(
        self,
        endpoint: Optional[str] = None,
        base_model: Optional[str] = None,
        api_key: Optional[str] = None,
    ):
        configured_endpoint = (
            settings.modal_vlm_api_base
            or settings.visual_model_endpoint
            or os.getenv("MODAL_VLM_API_BASE", "")
        )
        self.endpoint = (configured_endpoint if endpoint is None else endpoint).rstrip("/")
        self.base_model = (
            settings.modal_vlm_model_id or settings.qwen_base_model_path
            if base_model is None
            else base_model
        )
        self.api_key = settings.modal_vlm_api_key if api_key is None else api_key

    def _get_modal_credentials(self) -> tuple[Optional[str], Optional[str]]:
        """Return Modal *proxy* credentials, never Modal CLI API credentials."""
        token_id = settings.modal_proxy_token_id or os.getenv("MODAL_PROXY_TOKEN_ID")
        token_secret = settings.modal_proxy_token_secret or os.getenv("MODAL_PROXY_TOKEN_SECRET")
        if bool(token_id) != bool(token_secret):
            raise QwenServiceError(
                "Both MODAL_PROXY_TOKEN_ID and MODAL_PROXY_TOKEN_SECRET must be configured together."
            )
        return token_id or None, token_secret or None

    @staticmethod
    def _image_block(image: str) -> Dict[str, Any]:
        if image.startswith(("http://", "https://", "data:")):
            url = image
        else:
            path = Path(image)
            if not path.is_file():
                raise QwenServiceError(f"Visual input does not exist: {image}")
            mime = mimetypes.guess_type(path.name)[0] or "image/png"
            encoded = base64.b64encode(path.read_bytes()).decode("ascii")
            url = f"data:{mime};base64,{encoded}"
        return {"type": "image_url", "image_url": {"url": url}}

    @staticmethod
    def _completion_url(endpoint: str) -> str:
        endpoint = endpoint.rstrip("/")
        if endpoint.endswith("/chat/completions"):
            return endpoint
        return f"{endpoint}/chat/completions"

    @staticmethod
    def _final_answer_text(text: str) -> str:
        """Remove Qwen's visible reasoning block and return only its final answer."""
        if "</think>" in text:
            text = text.rsplit("</think>", 1)[1]
        elif text.lstrip().startswith(("<think>", "Thinking Process:")):
            raise QwenServiceError(
                "Modal VLM response ended during reasoning before a final answer."
            )
        return text.strip()

    def _call_vlm(
        self,
        prompt: str,
        images: Optional[List[str]] = None,
        adapter_id: Optional[str] = None,
        system: Optional[str] = None,
        max_tokens: int = 2048,
    ) -> Dict[str, Any]:
        """
        Invoke the fine-tuned VLM endpoint on Modal or local cluster.
        Supports passing image URLs / base64 strings and dynamic adapter_id.
        """
        images = images or []
        content = [{"type": "text", "text": prompt}]
        for img in images:
            content.append(self._image_block(img))

        messages = []
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({"role": "user", "content": content})
        # The deployed fine-tuned Qwen3.5 checkpoint can ignore the request-
        # level non-thinking flag for complex evidence prompts and loop until
        # max_tokens. vLLM supports continuing an assistant prefill; placing an
        # already-closed thinking block there forces generation to begin with
        # the final answer while retaining the standard chat template.
        messages.append({"role": "assistant", "content": "<think>\n\n</think>\n\n"})

        payload = {
            "model": self.base_model,
            "messages": messages,
            # Qwen3.5 defaults to an often very long thinking block. Use its
            # documented non-thinking request contract for bounded, direct
            # production answers; _final_answer_text remains a safety net for
            # deployments whose tokenizer template ignores this flag.
            "temperature": 0.7,
            "top_p": 0.8,
            "top_k": 20,
            "presence_penalty": 1.5,
            "chat_template_kwargs": {"enable_thinking": False},
            "continue_final_message": True,
            "add_generation_prompt": False,
            "max_tokens": max_tokens,
        }
        if adapter_id:
            payload["adapter_id"] = adapter_id

        headers = {"Content-Type": "application/json"}
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"

        # Modal proxy tokens use Modal-Key/Modal-Secret. MODAL_VLM_API_KEY is
        # reserved for an endpoint-defined bearer token or the combined
        # wk-...ws-... proxy-token form.
        token_id, token_secret = self._get_modal_credentials()
        if token_id and token_secret:
            headers["Modal-Key"] = token_id
            headers["Modal-Secret"] = token_secret

        if not self.endpoint:
            raise QwenServiceError("MODAL_VLM_API_BASE is not configured.")

        # Modal Servers return 503 while scaling from zero. The first request
        # triggers startup, so retry only that status with bounded exponential
        # backoff until the configured total cold-start budget is exhausted.
        deadline = time.monotonic() + settings.modal_request_timeout_s
        delay_s = 1.0
        attempts = 0
        try:
            while True:
                attempts += 1
                remaining_s = deadline - time.monotonic()
                if remaining_s <= 0:
                    raise QwenServiceError(
                        f"Modal VLM was not ready after {attempts - 1} attempts."
                    )
                resp = requests.post(
                    self._completion_url(self.endpoint),
                    json=payload,
                    headers=headers,
                    timeout=min(60.0, remaining_s),
                    allow_redirects=True,
                )
                if resp.status_code != 503:
                    break
                sleep_s = min(delay_s, max(0.0, deadline - time.monotonic()))
                if sleep_s <= 0:
                    raise QwenServiceError(
                        f"Modal VLM remained unavailable after {attempts} attempts."
                    )
                logger.info(
                    "Modal Server is scaling from zero; retrying in %.1fs (attempt %d).",
                    sleep_s,
                    attempts,
                )
                time.sleep(sleep_s)
                delay_s = min(delay_s * 2.0, 10.0)
            resp.raise_for_status()
            data = resp.json()
        except QwenServiceError:
            raise
        except (requests.RequestException, ValueError) as exc:
            # A requests exception retains its PreparedRequest, including auth
            # headers. Suppress exception chaining so proxy secrets cannot be
            # exposed by a traceback or upstream exception logger.
            raise QwenServiceError(
                f"Modal VLM request failed: {type(exc).__name__}"
            ) from None

        text: Any = ""
        if isinstance(data.get("choices"), list) and data["choices"]:
            text = data["choices"][0].get("message", {}).get("content", "")
        elif "text" in data:
            text = data["text"]
        elif "statement" in data:
            text = data["statement"]
        if isinstance(text, list):
            text = "".join(
                part.get("text", "") for part in text if isinstance(part, dict)
            )
        if not isinstance(text, str):
            raise QwenServiceError("Modal VLM returned an empty or invalid text response.")
        text = self._final_answer_text(text)
        if not text:
            raise QwenServiceError("Modal VLM returned an empty or invalid final answer.")

        confidence = data.get("confidence")
        if confidence is not None:
            try:
                confidence = min(1.0, max(0.0, float(confidence)))
            except (TypeError, ValueError):
                confidence = None
        return {
            "statement": text,
            "latency": resp.elapsed.total_seconds(),
            "adapter": adapter_id,
            "model": data.get("model") or self.base_model,
            "confidence": confidence,
            "limitations": data.get("limitations", []),
        }

    def observe(self, images: List[str], prompt: str, adapter_id: Optional[str] = None) -> Dict[str, Any]:
        """Observe a scene (optical or SAR) using the appropriate optical/SAR LoRA adapter."""
        eff_adapter = adapter_id or settings.lora_optical
        return self._call_vlm(prompt, images, adapter_id=eff_adapter)

    def compare(self, image_t1: str, image_t2: str, prompt: str, adapter_id: Optional[str] = None) -> Dict[str, Any]:
        """Compare two scenes temporally."""
        eff_adapter = adapter_id or settings.lora_temporal
        return self._call_vlm(prompt, [image_t1, image_t2], adapter_id=eff_adapter)

    def ground(self, image: str, prompt: str, adapter_id: Optional[str] = None) -> Dict[str, Any]:
        """Provide region grounding bounding boxes or prompts."""
        eff_adapter = adapter_id or settings.lora_grounding
        return self._call_vlm(prompt, [image], adapter_id=eff_adapter)

    def generate(self, prompt: str, images: Optional[List[str]] = None, system: Optional[str] = None, **kwargs) -> str:
        """Standard text generation facade."""
        res = self._call_vlm(prompt, images=images, system=system, **kwargs)
        return res.get("statement", "")

    def health(self) -> Dict[str, Any]:
        """Return health status."""
        configured = bool(self.endpoint)
        try:
            proxy_id, proxy_secret = self._get_modal_credentials()
            credential_error = None
        except QwenServiceError as exc:
            proxy_id, proxy_secret = None, None
            credential_error = str(exc)
        if proxy_id and proxy_secret:
            auth_mode = "modal_proxy_token"
        elif self.api_key:
            auth_mode = "bearer_token"
        else:
            auth_mode = "none"
        return {
            "status": "misconfigured" if credential_error else ("ok" if configured else "unconfigured"),
            "provider": "modal_vlm",
            "endpoint": self.endpoint or "not set",
            "model": self.base_model,
            "configured": configured,
            "authenticated": auth_mode != "none",
            "auth_mode": auth_mode,
            "credential_error": credential_error,
        }
