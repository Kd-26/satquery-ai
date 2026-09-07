"""
backend/services/vlm_service.py
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Central VLM adapter for SatQuery AI.

Uses NVIDIA NIM — nvidia/nemotron-3-nano-omni-30b-a3b-reasoning.
This model supports:
  • Native reasoning (reasoning_budget)
  • Vision / multimodal (image_url in message content)
  • Tool / function calling (used by the planner for structured output)
  • Streaming (available but not used in synchronous pipeline calls)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FINE-TUNED LORA SWAP (when ready)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
When the fine-tuned LoRA is ready, make ONLY these changes:
  1.  Set VLM_MODEL_ID=<your-fine-tuned-model-id>  in .env
  2.  Set VLM_LORA_ADAPTER=<adapter-id>             in .env
  3.  Uncomment the single line marked ← UNCOMMENT FOR LORA below
  4.  Update registry/adapters/*.yaml with real endpoint/version
Nothing else in the pipeline changes.
"""

import os
import json
import time
import logging
from typing import Any, Optional

import requests

logger = logging.getLogger(__name__)

# ── Model / endpoint config ──────────────────────────────────────────────────
INVOKE_URL   = os.getenv("NIM_API_BASE", "https://integrate.api.nvidia.com/v1") + "/chat/completions"
API_KEY      = os.getenv("NIM_API_KEY",  "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")
MODEL_ID     = os.getenv("VLM_MODEL_ID", "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning")
LORA_ADAPTER = os.getenv("VLM_LORA_ADAPTER", "")   # blank until fine-tuned model is ready

# ── Generation defaults ───────────────────────────────────────────────────────
MAX_TOKENS       = int(os.getenv("VLM_MAX_TOKENS",       "8192"))
REASONING_BUDGET = int(os.getenv("VLM_REASONING_BUDGET", "4096"))
TEMPERATURE      = float(os.getenv("VLM_TEMPERATURE",    "0.3"))
TOP_P            = float(os.getenv("VLM_TOP_P",          "0.95"))

# ── Retry config ─────────────────────────────────────────────────────────────
MAX_RETRIES   = 3
RETRY_BACKOFF = 2.0   # seconds; doubles each retry


# ─────────────────────────────────────────────────────────────────────────────
# Public: plain text generation (used by answerer, executor class scoring, etc.)
# ─────────────────────────────────────────────────────────────────────────────

def generate(
    prompt: str,
    images: list[str] | None = None,
    adapter: str | None = None,
    system: str | None = None,
    max_tokens: int | None = None,
    reasoning_budget: int | None = None,
) -> str:
    """
    Send a prompt to the VLM and return the plain text response.

    Args:
        prompt:           User-turn text.
        images:           Optional list of public image URLs to pass as vision content.
                          Currently used for low-res overlay previews in the answerer.
        adapter:          LoRA adapter id from the registry (None = base model).
                          Kept blank until fine-tuned model exists.
        system:           Optional system-turn text prepended before the user message.
        max_tokens:       Override default MAX_TOKENS.
        reasoning_budget: Override default REASONING_BUDGET.

    Returns:
        The model's text response (stripped).
    """
    messages = _build_messages(prompt, images=images, system=system)
    raw = _call_nim(
        messages=messages,
        tools=None,
        adapter=adapter,
        max_tokens=max_tokens or MAX_TOKENS,
        reasoning_budget=reasoning_budget or REASONING_BUDGET,
    )
    return _extract_text(raw)


# ─────────────────────────────────────────────────────────────────────────────
# Public: tool-call generation (used by the planner for structured JSON output)
# ─────────────────────────────────────────────────────────────────────────────

def generate_with_tool_call(
    prompt: str,
    tool_name: str,
    tool_schema: dict,
    images: list[str] | None = None,
    system: str | None = None,
    adapter: str | None = None,
) -> dict:
    """
    Send a prompt and force the model to respond by calling `tool_name`.
    Returns the parsed arguments dict from the tool call.

    This is how the planner gets a guaranteed-structured ExecutionPlan instead
    of relying on free-form JSON parsing.  The model's reasoning budget is used
    internally before it commits to the tool call, so output quality is high.

    Args:
        prompt:      User-turn text (the planning prompt).
        tool_name:   Name of the tool to define (e.g. "create_execution_plan").
        tool_schema: JSON-Schema dict for the tool's `parameters` field.
        images:      Optional image URLs (vision content).
        system:      Optional system prompt.
        adapter:     LoRA adapter id (None until fine-tuned model exists).

    Returns:
        dict — the parsed `arguments` from the model's tool call.

    Raises:
        VLMToolCallError if the model doesn't return the expected tool call.
    """
    tools = [
        {
            "type": "function",
            "function": {
                "name": tool_name,
                "description": (
                    "Call this function with the exact structured plan. "
                    "Do NOT return plain text — always call this function."
                ),
                "parameters": tool_schema,
            },
        }
    ]
    tool_choice = {"type": "function", "function": {"name": tool_name}}

    messages = _build_messages(prompt, images=images, system=system)
    raw = _call_nim(
        messages=messages,
        tools=tools,
        tool_choice=tool_choice,
        adapter=adapter,
        max_tokens=MAX_TOKENS,
        reasoning_budget=REASONING_BUDGET,
    )
    return _extract_tool_args(raw, tool_name)


# ─────────────────────────────────────────────────────────────────────────────
# Internal helpers
# ─────────────────────────────────────────────────────────────────────────────

def _build_messages(
    prompt: str,
    images: list[str] | None = None,
    system: str | None = None,
) -> list[dict]:
    """Assemble the messages list with optional system turn and image URLs."""
    messages: list[dict] = []

    if system:
        messages.append({"role": "system", "content": system})

    # Build user content — text + optional vision blocks
    content: list[dict] = [{"type": "text", "text": prompt}]
    if images:
        for url in images:
            if url.startswith("http"):
                # Remote URL — pass directly
                content.append({"type": "image_url", "image_url": {"url": url}})
            # Local file paths / base64 can be added here when needed

    messages.append({"role": "user", "content": content})
    return messages


def _call_nim(
    messages: list[dict],
    tools: list[dict] | None = None,
    tool_choice: dict | None = None,
    adapter: str | None = None,
    max_tokens: int = MAX_TOKENS,
    reasoning_budget: int = REASONING_BUDGET,
) -> dict:
    """
    Make the HTTP request to NVIDIA NIM with retry logic.
    Returns the raw response JSON dict.
    """
    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Accept": "application/json",
        "Content-Type": "application/json",
    }

    payload: dict[str, Any] = {
        "model":           MODEL_ID,
        "messages":        messages,
        "max_tokens":      max_tokens,
        "reasoning_budget": reasoning_budget,
        "temperature":     TEMPERATURE,
        "top_p":           TOP_P,
        "stream":          False,
    }

    if tools:
        payload["tools"] = tools
    if tool_choice:
        payload["tool_choice"] = tool_choice

    # ── TO SWAP TO FINE-TUNED LORA:
    # effective_adapter = adapter or LORA_ADAPTER or None
    # if effective_adapter:
    #     payload["lora_adapter"] = effective_adapter    ← UNCOMMENT FOR LORA

    last_exc: Exception | None = None
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            t0 = time.perf_counter()
            resp = requests.post(
                INVOKE_URL,
                headers=headers,
                json=payload,
                timeout=120,
            )
            elapsed = time.perf_counter() - t0

            if resp.status_code == 429:
                # Rate-limited — back off
                wait = RETRY_BACKOFF * (2 ** (attempt - 1))
                logger.warning("NIM rate-limited (attempt %d/%d). Retrying in %.1fs", attempt, MAX_RETRIES, wait)
                time.sleep(wait)
                continue

            resp.raise_for_status()
            result = resp.json()
            logger.info(
                "NIM call ok | model=%s attempt=%d elapsed=%.2fs tokens_used=%s",
                MODEL_ID,
                attempt,
                elapsed,
                result.get("usage", {}).get("total_tokens", "?"),
            )
            return result

        except requests.exceptions.Timeout as e:
            last_exc = e
            logger.warning("NIM timeout (attempt %d/%d)", attempt, MAX_RETRIES)
        except requests.exceptions.HTTPError as e:
            last_exc = e
            logger.error("NIM HTTP error %s (attempt %d/%d): %s", resp.status_code, attempt, MAX_RETRIES, resp.text[:300])
            if resp.status_code < 500:
                # 4xx — don't retry
                raise VLMError(f"NIM API error {resp.status_code}: {resp.text[:300]}") from e
        except Exception as e:
            last_exc = e
            logger.error("NIM unexpected error (attempt %d/%d): %s", attempt, MAX_RETRIES, e)

        if attempt < MAX_RETRIES:
            time.sleep(RETRY_BACKOFF * attempt)

    raise VLMError(f"NIM call failed after {MAX_RETRIES} attempts. Last error: {last_exc}") from last_exc


def _extract_text(raw: dict) -> str:
    """Pull the assistant's text content from a standard chat completion response."""
    try:
        msg = raw["choices"][0]["message"]
        # Some reasoning models put thinking in a separate field
        return (msg.get("content") or "").strip()
    except (KeyError, IndexError) as e:
        raise VLMError(f"Unexpected NIM response shape — cannot extract text: {raw}") from e


def _extract_tool_args(raw: dict, expected_tool_name: str) -> dict:
    """
    Pull the function-call arguments from a tool-call response.
    Returns the parsed dict.  Raises VLMToolCallError on any mismatch.
    """
    try:
        msg = raw["choices"][0]["message"]
        tool_calls = msg.get("tool_calls") or []
        if not tool_calls:
            # Model returned text instead of a tool call — attempt JSON parse as fallback
            content = (msg.get("content") or "").strip()
            logger.warning("Model returned text instead of tool call; attempting JSON fallback parse.")
            return _fallback_json_parse(content)

        call = tool_calls[0]
        if call["function"]["name"] != expected_tool_name:
            raise VLMToolCallError(
                f"Expected tool '{expected_tool_name}' but model called '{call['function']['name']}'"
            )
        raw_args = call["function"]["arguments"]
        if isinstance(raw_args, str):
            return json.loads(raw_args)
        return raw_args  # already a dict in some NIM versions

    except (KeyError, IndexError, json.JSONDecodeError) as e:
        raise VLMToolCallError(f"Failed to parse tool call arguments: {e}\nRaw response: {raw}") from e


def _fallback_json_parse(text: str) -> dict:
    """
    Last-resort parser: strip markdown fences and parse as JSON.
    Used when the model ignores tool_choice and returns raw JSON text.
    """
    import re
    cleaned = re.sub(r"```(?:json)?\s*|\s*```", "", text).strip()
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError as e:
        raise VLMToolCallError(f"Fallback JSON parse also failed: {e}\nText was: {text[:400]}") from e


# ─────────────────────────────────────────────────────────────────────────────
# Custom exceptions
# ─────────────────────────────────────────────────────────────────────────────

class VLMError(Exception):
    """Raised on transport or API-level failures."""


class VLMToolCallError(VLMError):
    """Raised when the model does not return the expected tool call structure."""
