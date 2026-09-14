"""
Unit tests for the Provider System:
- OpenAIProvider (Agent Brain)
- QwenService / Modal VLM (Visual Specialist)
- LocalSegmentationProvider (Segmentation)
- ProviderService facade & health checking
"""
import pytest
from requests import ConnectionError as RequestsConnectionError
from unittest.mock import MagicMock, patch

from backend.services.providers.openai_provider import OpenAIProvider
from backend.services.providers.qwen_service import QwenService, QwenServiceError
from backend.services.providers.segmentation_provider import LocalSegmentationProvider
from backend.services.provider_service import provider_health, _ordered_providers
from backend.core.config import settings


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
        mock_tool_call.function.name = "create_execution_plan"
        mock_tool_call.function.arguments = '{"workflow": "single", "target_classes": ["water"]}'
        mock_choice = MagicMock()
        mock_choice.message.tool_calls = [mock_tool_call]
        mock_client.chat.completions.create.return_value = MagicMock(choices=[mock_choice])

        schema = {"type": "object", "properties": {"workflow": {"type": "string"}}}
        res = provider.structured("Plan query", schema, "create_execution_plan")
        assert res == {"workflow": "single", "target_classes": ["water"]}
        call = mock_client.chat.completions.create.call_args.kwargs
        assert call["tools"][0]["function"]["strict"] is True


def test_qwen_service_health():
    service = QwenService(endpoint="https://modal-app.modal.run/v1")
    health = service.health()
    assert health["provider"] == "modal_vlm"
    assert health["configured"] is True


def test_qwen_service_fails_loud_when_unconfigured():
    service = QwenService(endpoint="")
    with pytest.raises(QwenServiceError, match="MODAL_VLM_API_BASE"):
        service.observe(["http://example.com/img.png"], "Observe water coverage")


def test_qwen_service_observe_and_compare_contract():
    service = QwenService(endpoint="https://modal-app.modal.run/v1")
    response = MagicMock()
    response.raise_for_status.return_value = None
    response.json.return_value = {
        "model": "qwen-vlm",
        "choices": [{"message": {"content": "Visible water-like dark regions are present."}}],
    }
    response.elapsed.total_seconds.return_value = 0.5
    with patch("backend.services.providers.qwen_service.requests.post", return_value=response) as post:
        obs = service.observe(["http://example.com/img.png"], "Observe water coverage")
        assert obs["statement"].startswith("Visible water-like")
        assert post.call_args.kwargs["json"]["adapter_id"] == "lora_optical_v1"
        assert post.call_args.kwargs["json"]["chat_template_kwargs"] == {
            "enable_thinking": False
        }
        assert post.call_args.kwargs["json"]["continue_final_message"] is True
        assert post.call_args.kwargs["json"]["add_generation_prompt"] is False
        assert post.call_args.kwargs["json"]["messages"][-1] == {
            "role": "assistant",
            "content": "<think>\n\n</think>\n\n",
        }

        comp = service.compare(
            "http://example.com/t1.png",
            "http://example.com/t2.png",
            "Compare flood extent",
        )
        assert comp["adapter"] == "lora_temporal_v1"
        assert post.call_args.args[0].endswith("/v1/chat/completions")


def test_qwen_service_retries_modal_server_cold_start(monkeypatch):
    service = QwenService(endpoint="https://modal-app.modal.direct/v1")
    unavailable = MagicMock(status_code=503)
    ready = MagicMock(status_code=200)
    ready.raise_for_status.return_value = None
    ready.json.return_value = {
        "choices": [{"message": {"content": "Server is ready."}}],
    }
    ready.elapsed.total_seconds.return_value = 0.2
    monkeypatch.setattr("backend.services.providers.qwen_service.time.sleep", lambda _: None)
    with patch(
        "backend.services.providers.qwen_service.requests.post",
        side_effect=[unavailable, ready],
    ) as post:
        result = service.generate("health check")
    assert result == "Server is ready."
    assert post.call_count == 2


def test_qwen_service_removes_visible_reasoning():
    service = QwenService(endpoint="https://modal-app.modal.direct/v1")
    response = MagicMock(status_code=200)
    response.raise_for_status.return_value = None
    response.json.return_value = {
        "choices": [
            {
                "message": {
                    "content": "Thinking Process:\nprivate reasoning\n</think>\nFinal answer."
                }
            }
        ]
    }
    response.elapsed.total_seconds.return_value = 0.2
    with patch("backend.services.providers.qwen_service.requests.post", return_value=response):
        assert service.generate("test") == "Final answer."


def test_qwen_service_rejects_truncated_reasoning():
    service = QwenService(endpoint="https://modal-app.modal.direct/v1")
    response = MagicMock(status_code=200)
    response.raise_for_status.return_value = None
    response.json.return_value = {
        "choices": [{"message": {"content": "Thinking Process:\nunfinished"}}]
    }
    response.elapsed.total_seconds.return_value = 0.2
    with patch("backend.services.providers.qwen_service.requests.post", return_value=response):
        with pytest.raises(QwenServiceError, match="ended during reasoning"):
            service.generate("test")


def test_qwen_service_suppresses_http_exception_chain(monkeypatch):
    service = QwenService(endpoint="https://modal-app.modal.direct/v1")
    monkeypatch.setattr("backend.services.providers.qwen_service.time.sleep", lambda _: None)
    monkeypatch.setattr(settings, "modal_request_timeout_s", 0.001)
    with patch(
        "backend.services.providers.qwen_service.requests.post",
        side_effect=RequestsConnectionError("request details must remain private"),
    ):
        with pytest.raises(QwenServiceError) as raised:
            service.generate("test")
    assert raised.value.__cause__ is None


def test_segmentation_provider_calls_deployment():
    seg = LocalSegmentationProvider(endpoint="http://segmentation.test")
    response = MagicMock()
    response.raise_for_status.return_value = None
    response.json.return_value = {
        "mask_ref": "mask.tif",
        "confidence_ref": "confidence.tif",
        "classes_detected": ["water", "vegetation"],
    }
    with patch(
        "backend.services.providers.segmentation_provider.requests.post",
        return_value=response,
    ) as post:
        res = seg.segment("test_chip_123", ["water", "vegetation"])
    assert "mask_ref" in res
    assert "confidence_ref" in res
    assert res["classes_detected"] == ["water", "vegetation"]
    post.assert_called_once()


def test_segmentation_provider_never_fabricates_fallback():
    seg = LocalSegmentationProvider(endpoint="http://segmentation.test")
    with patch(
        "backend.services.providers.segmentation_provider.requests.post",
        side_effect=RequestsConnectionError("offline"),
    ):
        with pytest.raises(RuntimeError, match="Deployed segmentation call failed"):
            seg.segment("test_chip_123", ["water"])


def test_provider_health_facade():
    health_list = provider_health()
    assert isinstance(health_list, list)
    names = [h.get("provider") for h in health_list]
    assert "openai" in names
    assert "modal_vlm" in names or "nvidia" in names
