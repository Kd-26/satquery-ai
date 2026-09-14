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
        return self._impl.health()


@dataclass
class ModalProviderFacade:
    name: str = "modal"
    external: bool = True
    _impl: QwenService = QwenService()

    def generate(self, prompt: str, images=None, system=None, max_tokens=None, **kwargs) -> str:
        return self._impl.generate(prompt, images=images, system=system, max_tokens=max_tokens or 2048, **kwargs)

    def generate_with_tool_call(self, **kwargs) -> dict:
        # If tool calling is requested directly on Modal, parse or delegate to OpenAI
        tool_name = kwargs["tool_name"]
        schema = kwargs["tool_schema"]
        prompt = kwargs["prompt"]
        system = kwargs.get("system", "")
        # Construct explicit JSON formatting instructions for VLM
        full_prompt = (
            f"{system}\n\n{prompt}\n\n"
            f"You MUST call the tool '{tool_name}' and respond ONLY with a valid JSON object adhering to this schema:\n"
            f"{schema}"
        )
        raw_text = self._impl.generate(full_prompt)
        import re, json
        cleaned = re.sub(r"```(?:json)?\s*|\s*```", "", raw_text).strip()
        return json.loads(cleaned)

    def health(self) -> dict:
        return self._impl.health()


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
    errors = []
    for provider in _ordered_providers():
        try:
            return provider.generate_with_tool_call(**kwargs)
        except Exception as exc:
            errors.append(f"{provider.name}: {type(exc).__name__}: {exc}")
    raise ProviderError("All configured structured-output providers failed: " + "; ".join(errors))


def provider_health() -> list[dict]:
    return [provider.health() for provider in _ordered_providers()]
