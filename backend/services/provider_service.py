"""
Provider-neutral LLM/VLM facade supporting:
  • openai  — OpenAI Agent Brain (structured planning, intent, verifier)
  • modal   — Fine-Tuned VLM on Modal (satellite visual specialist & answerer)
  • nvidia  — NVIDIA NIM fallback
  • local   — Self-hosted local endpoint
"""
from __future__ import annotations

import logging
import os
from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Protocol

import requests

from backend.core.config import settings
from backend.services import vlm_service as nvidia
from backend.services.providers.openai_provider import OpenAIProvider
from backend.services.providers.qwen_service import QwenService

logger = logging.getLogger(__name__)


class ProviderError(Exception):
    pass


class Provider(Protocol):
    name: str
    external: bool
    def generate(self, **kwargs) -> str: ...
    def generate_with_tool_call(self, **kwargs) -> dict: ...
    def health(self) -> dict: ...


@dataclass
class OpenAIProviderFacade:
    name: str = "openai"
    external: bool = True
    _impl: OpenAIProvider = OpenAIProvider()

    def generate(self, prompt: str, system: Optional[str] = None, max_tokens: Optional[int] = None, **kwargs) -> str:
        return self._impl.complete(prompt, system=system, max_tokens=max_tokens)

    def generate_with_tool_call(self, **kwargs) -> dict:
        return self._impl.structured(
            prompt=kwargs["prompt"],
            schema=kwargs["tool_schema"],
            tool_name=kwargs["tool_name"],
            system=kwargs.get("system"),
        )

    def health(self) -> dict:
        result = self._impl.health()
        result["roles"] = ["intent", "planning", "replanning", "semantic_verification"]
        return result


@dataclass
class ModalProviderFacade:
    name: str = "modal"
    external: bool = True
    _impl: QwenService = QwenService()

    def generate(self, prompt: str, images=None, system=None, max_tokens=None, adapter=None, **kwargs) -> str:
        return self._impl.generate(
            prompt,
            images=images,
            system=system,
            max_tokens=max_tokens or 2048,
            adapter_id=adapter,
            **kwargs,
        )

    def generate_with_tool_call(self, **kwargs) -> dict:
        raise ProviderError("Modal Qwen is not permitted to perform agent planning or tool calls.")

    def health(self) -> dict:
        result = self._impl.health()
        result["roles"] = ["visual_observation", "visual_comparison", "answer_synthesis"]
        return result


@dataclass
class NvidiaProvider:
    name: str = "nvidia"
    external: bool = True

    def generate(self, **kwargs) -> str:
        return nvidia.generate(**kwargs)

    def generate_with_tool_call(self, **kwargs) -> dict:
        return nvidia.generate_with_tool_call(**kwargs)

    def health(self) -> dict:
        return {"provider": self.name, "configured": bool(nvidia._KEY_POOL), "model": nvidia.MODEL_ID}


@dataclass
class LocalProvider:
    name: str = "local"
    external: bool = False

    @property
    def base_url(self) -> str:
        return os.getenv("LOCAL_VLM_API_BASE", "").rstrip("/")

    def generate(self, prompt: str, images=None, system=None, max_tokens=None, **kwargs) -> str:
        if not self.base_url:
            raise ProviderError("LOCAL_VLM_API_BASE is not configured")
        messages = nvidia._build_messages(prompt, images=images, system=system)
        response = requests.post(
            f"{self.base_url}/chat/completions",
            json={"model": os.getenv("LOCAL_VLM_MODEL_ID", "local-vlm"), "messages": messages, "max_tokens": max_tokens or 1024, "stream": False},
            timeout=120,
        )
        response.raise_for_status()
        return nvidia._extract_text(response.json())

    def generate_with_tool_call(self, **kwargs) -> dict:
        if not self.base_url:
            raise ProviderError("LOCAL_VLM_API_BASE is not configured")
        tool_name = kwargs["tool_name"]
        tools = [{"type": "function", "function": {
            "name": tool_name,
            "description": "Return the validated scientific execution plan.",
            "parameters": kwargs["tool_schema"],
        }}]
        response = requests.post(
            f"{self.base_url}/chat/completions",
            json={
                "model": os.getenv("LOCAL_VLM_MODEL_ID", "local-vlm"),
                "messages": nvidia._build_messages(kwargs["prompt"], system=kwargs.get("system")),
                "tools": tools,
                "tool_choice": {"type": "function", "function": {"name": tool_name}},
                "stream": False,
            },
            timeout=120,
        )
        response.raise_for_status()
        return nvidia._extract_tool_args(response.json(), tool_name)

    def health(self) -> dict:
        return {"provider": self.name, "configured": bool(self.base_url), "model": os.getenv("LOCAL_VLM_MODEL_ID", "local-vlm")}


_PROVIDERS: dict[str, Provider] = {
    "openai": OpenAIProviderFacade(),
    "modal": ModalProviderFacade(),
    "nvidia": NvidiaProvider(),
    "local": LocalProvider(),
}


def _ordered_providers() -> list[Provider]:
    raw_order = os.getenv("VLM_PROVIDER_ORDER") or settings.vlm_provider_order or "openai,modal,nvidia,local"
    order = [value.strip().lower() for value in raw_order.split(",") if value.strip()]
    providers = []
    for name in order:
        if name in _PROVIDERS and _PROVIDERS[name] not in providers:
            providers.append(_PROVIDERS[name])
    # Append any remaining providers
    for name, prov in _PROVIDERS.items():
        if prov not in providers:
            providers.append(prov)
    return providers


def generate(*, images=None, external_image_consent: bool = False, max_tokens=None, **kwargs) -> str:
    if max_tokens and max_tokens > int(os.getenv("VLM_REQUEST_TOKEN_LIMIT", "8192")):
        raise ProviderError("Requested token budget exceeds VLM_REQUEST_TOKEN_LIMIT")
    errors = []
    for provider in _ordered_providers():
        if images and provider.external and not external_image_consent:
            errors.append(f"{provider.name}: external image consent not granted")
            continue
        try:
            return provider.generate(images=images, max_tokens=max_tokens, **kwargs)
        except Exception as exc:
            errors.append(f"{provider.name}: {type(exc).__name__}: {exc}")
    raise ProviderError("All configured VLM providers failed: " + "; ".join(errors))


def generate_with_tool_call(**kwargs) -> dict:
    """Backward-compatible agent tool-call entry point; OpenAI-only by policy."""
    try:
        return _PROVIDERS["openai"].generate_with_tool_call(**kwargs)
    except Exception as exc:
        raise ProviderError(f"OpenAI structured agent call failed: {type(exc).__name__}: {exc}") from exc


# Role-bound entry points. Controllers should use these instead of the generic
# fallback functions above so a planner can never silently become a 9B VLM and
# an EO visual request can never silently become a frontier-model request.
def generate_agent_text(*, prompt: str, system: Optional[str] = None, max_tokens: Optional[int] = None) -> str:
    try:
        return _PROVIDERS["openai"].generate(
            prompt=prompt,
            system=system,
            max_tokens=max_tokens,
        )
    except Exception as exc:
        raise ProviderError(f"OpenAI agent call failed: {type(exc).__name__}: {exc}") from exc


def generate_agent_with_tool_call(**kwargs) -> dict:
    try:
        return _PROVIDERS["openai"].generate_with_tool_call(**kwargs)
    except Exception as exc:
        raise ProviderError(f"OpenAI structured agent call failed: {type(exc).__name__}: {exc}") from exc


def generate_domain_text(
    *,
    prompt: str,
    system: Optional[str] = None,
    max_tokens: Optional[int] = None,
    adapter: Optional[str] = None,
) -> str:
    try:
        return _PROVIDERS["modal"].generate(
            prompt=prompt,
            system=system,
            max_tokens=max_tokens,
            adapter=adapter,
            images=[],
        )
    except Exception as exc:
        raise ProviderError(f"Modal Qwen synthesis failed: {type(exc).__name__}: {exc}") from exc


def observe_visual(
    *,
    images: list[str],
    prompt: str,
    adapter_id: Optional[str] = None,
    external_image_consent: bool = False,
) -> dict:
    if not external_image_consent:
        raise ProviderError("External image consent is required for Modal visual observation.")
    try:
        return _PROVIDERS["modal"]._impl.observe(images, prompt, adapter_id=adapter_id)
    except Exception as exc:
        raise ProviderError(f"Modal Qwen observation failed: {type(exc).__name__}: {exc}") from exc


def compare_visual(
    *,
    image_t1: str,
    image_t2: str,
    prompt: str,
    adapter_id: Optional[str] = None,
    external_image_consent: bool = False,
) -> dict:
    if not external_image_consent:
        raise ProviderError("External image consent is required for Modal visual comparison.")
    try:
        return _PROVIDERS["modal"]._impl.compare(
            image_t1,
            image_t2,
            prompt,
            adapter_id=adapter_id,
        )
    except Exception as exc:
        raise ProviderError(f"Modal Qwen comparison failed: {type(exc).__name__}: {exc}") from exc


def provider_health() -> list[dict]:
    return [provider.health() for provider in _ordered_providers()]
