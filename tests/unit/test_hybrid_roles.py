from unittest.mock import MagicMock, patch

import pytest

from backend.controller.visual_specialist import (
    VisualSpecialistError,
    collect_visual_evidence,
)
from backend.core.config import settings
from backend.services.providers.qwen_service import QwenService


def test_qwen_embeds_local_preview_as_data_url(tmp_path):
    preview = tmp_path / "preview.png"
    preview.write_bytes(b"preview-bytes")
    block = QwenService._image_block(str(preview))
    assert block["image_url"]["url"].startswith("data:image/png;base64,")


def test_qwen_uses_modal_proxy_headers(monkeypatch):
    monkeypatch.setattr(settings, "modal_proxy_token_id", "wk-test")
    monkeypatch.setattr(settings, "modal_proxy_token_secret", "ws-test")
    response = MagicMock()
    response.raise_for_status.return_value = None
    response.json.return_value = {"choices": [{"message": {"content": "A river-like feature is visible."}}]}
    response.elapsed.total_seconds.return_value = 0.2
    service = QwenService(endpoint="https://example.modal.run/v1")
    with patch("backend.services.providers.qwen_service.requests.post", return_value=response) as post:
        service.observe(["https://example.test/preview.png"], "Describe the scene")
    headers = post.call_args.kwargs["headers"]
    assert headers["Modal-Key"] == "wk-test"
    assert headers["Modal-Secret"] == "ws-test"
    assert "Proxy-Authorization" not in headers


def test_temporal_visual_evidence_selects_temporal_adapter(monkeypatch):
    captured = {}

    def fake_compare(**kwargs):
        captured.update(kwargs)
        return {
            "statement": "Water-like features appear more spatially extensive in the later scene.",
            "adapter": kwargs["adapter_id"],
            "model": "qwen-vlm",
            "confidence": None,
            "limitations": [],
        }

    monkeypatch.setattr("backend.controller.visual_specialist.compare_visual", fake_compare)
    observations = collect_visual_evidence(
        run_id="run",
        workflow="temporal",
        query="Compare flooding",
        image_ids=["before", "after"],
        previews=["before.png", "after.png"],
        external_image_consent=True,
    )
    assert captured["adapter_id"] == settings.lora_temporal
    assert observations[0].kind == "temporal"
    assert observations[0].source_images == ["before", "after"]


def test_visual_evidence_rejects_ungrounded_numbers(monkeypatch):
    monkeypatch.setattr(
        "backend.controller.visual_specialist.observe_visual",
        lambda **kwargs: {
            "statement": "Water covers 37 percent of the image.",
            "adapter": settings.lora_general,
            "model": "qwen-vlm",
        },
    )
    with pytest.raises(VisualSpecialistError, match="quantitative claims"):
        collect_visual_evidence(
            run_id="run",
            workflow="single",
            query="Describe flooding",
            image_ids=["scene"],
            previews=["scene.png"],
            external_image_consent=True,
        )
