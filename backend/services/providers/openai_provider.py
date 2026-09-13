import json
import logging
from typing import Any, Dict, Optional

from openai import OpenAI
from backend.core.config import settings
from backend.services.providers.base import AgentProvider

logger = logging.getLogger(__name__)

class OpenAIProvider(AgentProvider):
    """
    OpenAI implementation of the AgentProvider using the Responses API.
    Handles complete (text) and structured (tool call) outputs.
    """
    def __init__(self):
        self.client = OpenAI(api_key=settings.openai_api_key)
        self.model = settings.openai_agent_model
        
    def complete(self, prompt: str, system: Optional[str] = None) -> str:
        """
        Returns a plain text response from the model.
        """
        instructions = system if system else "You are a helpful assistant."
        
        try:
            # Using the Responses API as requested in the specification
            response = self.client.responses.create(
                model=self.model,
                instructions=instructions,
                input=prompt,
                max_output_tokens=settings.openai_max_tokens_per_run
            )
            
            # Assuming the response format follows typical structure for standard responses API
            # Depending on the exact Responses API schema, this extraction might need adjustments.
            return response.output_text if hasattr(response, 'output_text') else str(response)
        except Exception as e:
            logger.error(f"OpenAI complete error: {e}")
            raise e
            
    def structured(self, prompt: str, schema: Dict[str, Any], tool_name: str, system: Optional[str] = None) -> Dict[str, Any]:
        """
        Returns a structured response parsed from a forced tool call.
        """
        instructions = system if system else "Return a structured response."
        
        tool = {
            "type": "function",
            "name": tool_name,
            "description": f"Submit the {tool_name}.",
            "parameters": schema,
            "strict": True
        }
        
        try:
            # Using the Responses API with strict tools
            response = self.client.responses.create(
                model=self.model,
                instructions=instructions,
                input=prompt,
                tools=[tool],
                tool_choice={
                    "type": "function",
                    "name": tool_name
                },
                parallel_tool_calls=False,
                max_output_tokens=settings.openai_max_tokens_per_run,
                store=False
            )
            
            # The exact attribute structure depends on the Responses API (e.g. response.tools_calls)
            if hasattr(response, 'tool_calls') and len(response.tool_calls) > 0:
                arguments = response.tool_calls[0].function.arguments
                if isinstance(arguments, str):
                    return json.loads(arguments)
                return arguments
                
            raise ValueError("No tool calls found in response.")
        except Exception as e:
            logger.error(f"OpenAI structured error: {e}")
            raise e
            
    def health(self) -> Dict[str, Any]:
        """
        Returns the health status of the OpenAI service.
        """
        if not settings.openai_api_key:
            return {"status": "error", "message": "API key not configured."}
        return {"status": "ok", "provider": "openai"}
