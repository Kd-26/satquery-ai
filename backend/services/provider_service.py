"""Provider-neutral VLM facade (NVIDIA NIM and optional local endpoint)."""

from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Protocol

import requests

from backend.services import vlm_service as nvidia


class ProviderError(Exception):
    pass


class Provider(Protocol):
    name: str
    external: bool
    def generate(self, **kwargs) -> str: ...
    def generate_with_tool_call(self, **kwargs) -> dict: ...
    def health(self) -> dict: ...


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


_PROVIDERS = {"nvidia": NvidiaProvider(), "local": LocalProvider()}


def _ordered_providers() -> list[Provider]:
    order = [value.strip().lower() for value in os.getenv("VLM_PROVIDER_ORDER", "nvidia,local").split(",") if value.strip()]
    return [_PROVIDERS[name] for name in order if name in _PROVIDERS]


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
