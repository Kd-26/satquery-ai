"""
OpenAI implementation of AgentProvider.
Handles complete (text) and structured (tool call) outputs using standard OpenAI API.
"""
import json
import logging
from typing import Any, Dict, Optional

from backend.core.config import settings
from backend.services.providers.base import AgentProvider

logger = logging.getLogger(__name__)


class OpenAIProvider(AgentProvider):
    """
    OpenAI implementation of the AgentProvider.
    Powers intent classification, DAG workflow planning, and evidence verification.
    """
    def __init__(self, api_key: Optional[str] = None, model: Optional[str] = None, base_url: Optional[str] = None):
        self.api_key = settings.openai_api_key if api_key is None else api_key
        self.model = settings.openai_agent_model if model is None else model
        self.base_url = settings.openai_api_base if base_url is None else base_url

    def _get_client(self):
        if not self.api_key:
            raise ValueError("OPENAI_API_KEY is not configured.")
        try:
            from openai import OpenAI
            return OpenAI(api_key=self.api_key, base_url=self.base_url)
        except ImportError as e:
            raise ImportError("The 'openai' package is required. Install it via `pip install openai`.") from e

    def complete(self, prompt: str, system: Optional[str] = None, max_tokens: Optional[int] = None) -> str:
        """
        Returns a plain text response from the model.
        """
        client = self._get_client()
        messages = []
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({"role": "user", "content": prompt})

        try:
            response = client.chat.completions.create(
                model=self.model,
                messages=messages,
                max_tokens=max_tokens or settings.openai_max_tokens_per_run,
                temperature=0.2,
            )
            return response.choices[0].message.content or ""
        except Exception as e:
            logger.error(f"OpenAI complete error: {e}")
            raise e

    def structured(
        self,
        prompt: str,
        schema: Dict[str, Any],
        tool_name: str,
        system: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Returns a structured response parsed from a forced function/tool call.
        """
        client = self._get_client()
        messages = []
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({"role": "user", "content": prompt})

        func_def = {
            "name": tool_name,
            "description": f"Submit the {tool_name}.",
            "parameters": schema,
            "strict": True,
        }

        tools = [{"type": "function", "function": func_def}]

        try:
            response = client.chat.completions.create(
                model=self.model,
                messages=messages,
                tools=tools,
                tool_choice={"type": "function", "function": {"name": tool_name}},
                max_tokens=settings.openai_max_tokens_per_run,
                temperature=0.1,
            )

            message = response.choices[0].message
            if message.tool_calls and len(message.tool_calls) > 0:
                tool_call = message.tool_calls[0]
                if tool_call.function.name != tool_name:
                    raise ValueError(
                        f"Expected tool {tool_name}, received {tool_call.function.name}."
                    )
                arguments = tool_call.function.arguments
                if isinstance(arguments, str):
                    arguments = json.loads(arguments)
                if not isinstance(arguments, dict):
                    raise ValueError(f"Tool {tool_name} returned non-object arguments.")
                return arguments

            raise ValueError(f"No tool calls found in OpenAI response for tool {tool_name}.")
        except Exception as e:
            logger.error(f"OpenAI structured tool call error: {e}")
            raise e

    def health(self) -> Dict[str, Any]:
        """
        Returns the health status of the OpenAI service.
        """
        configured = bool(self.api_key and self.api_key != "replace-with-your-openai-api-key")
        return {
            "status": "ok" if configured else "unconfigured",
            "provider": "openai",
            "model": self.model,
            "configured": configured,
        }
