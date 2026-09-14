"""
Unit tests for the Provider System:
- OpenAIProvider (Agent Brain)
- QwenService / Modal VLM (Visual Specialist)
- LocalSegmentationProvider (Segmentation)
- ProviderService facade & health checking
"""
import pytest
from unittest.mock import MagicMock, patch

from backend.services.providers.openai_provider import OpenAIProvider
from backend.services.providers.qwen_service import QwenService
from backend.services.providers.segmentation_provider import LocalSegmentationProvider
from backend.services.provider_service import provider_health, _ordered_providers


def test_openai_provider_health_unconfigured():
    provider = OpenAIProvider(api_key="")
    health = provider.health()
    assert health["provider"] == "openai"
    assert health["configured"] is False


def test_openai_provider_complete_mock():
    provider = OpenAIProvider(api_key="sk-test-key", model="gpt-4o")
    with patch("openai.OpenAI") as mock_openai_cls:
        mock_client = MagicMock()
        mock_openai_cls.return_value = mock_client
        mock_choice = MagicMock()
        mock_choice.message.content = "Satellite flood analysis response."
        mock_client.chat.completions.create.return_value = MagicMock(choices=[mock_choice])

        res = provider.complete("Analyze this scene", system="You are an expert.")
        assert res == "Satellite flood analysis response."
        mock_client.chat.completions.create.assert_called_once()


def test_openai_provider_structured_tool_call_mock():
    provider = OpenAIProvider(api_key="sk-test-key", model="gpt-4o")
    with patch("openai.OpenAI") as mock_openai_cls:
        mock_client = MagicMock()
        mock_openai_cls.return_value = mock_client
        mock_tool_call = MagicMock()
        mock_tool_call.function.arguments = '{"workflow": "single", "target_classes": ["water"]}'
        mock_choice = MagicMock()
        mock_choice.message.tool_calls = [mock_tool_call]
        mock_client.chat.completions.create.return_value = MagicMock(choices=[mock_choice])

        schema = {"type": "object", "properties": {"workflow": {"type": "string"}}}
        res = provider.structured("Plan query", schema, "create_execution_plan")
        assert res == {"workflow": "single", "target_classes": ["water"]}


def test_qwen_service_health():
    service = QwenService(endpoint="https://modal-app.modal.run/v1")
    health = service.health()
    assert health["provider"] == "modal_vlm"
    assert health["configured"] is True


def test_qwen_service_observe_and_compare_mock():
    service = QwenService(endpoint="")  # offline / mock mode
    obs = service.observe(["http://example.com/img.png"], "Observe water coverage")
    assert "statement" in obs
    assert obs["confidence"] >= 0.8

    comp = service.compare("http://example.com/t1.png", "http://example.com/t2.png", "Compare flood extent")
    assert "statement" in comp
    assert comp["adapter"] == "lora_temporal_v1"


def test_segmentation_provider():
    seg = LocalSegmentationProvider()
    res = seg.segment("test_chip_123", ["water", "vegetation"])
    assert "mask_ref" in res
    assert "confidence_ref" in res
    assert res["classes_detected"] == ["water", "vegetation"]


def test_provider_health_facade():
    health_list = provider_health()
    assert isinstance(health_list, list)
    names = [h.get("provider") for h in health_list]
    assert "openai" in names
    assert "modal_vlm" in names or "nvidia" in names
