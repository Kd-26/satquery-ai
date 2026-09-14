from unittest.mock import MagicMock, patch

import httpx
import numpy as np
import pytest

from backend.controller.answerer import generate_direct_answer
from backend.controller.executor import (
    ExecutorError,
    _post_segmentation_with_retry,
    _run_model_inference,
)
from backend.core.config import settings
from backend.services.providers.qwen_service import QwenService


def test_segmentation_cold_start_retries_same_deployment(monkeypatch):
    unavailable = MagicMock(status_code=503)
    ready = MagicMock(status_code=200)
    monkeypatch.setattr("backend.controller.executor.time.sleep", lambda _: None)
    with patch(
        "backend.controller.executor.httpx.post",
        side_effect=[unavailable, ready],
    ) as post:
        response = _post_segmentation_with_retry("https://segmentation.test/infer")
    assert response is ready
    assert response.satquery_attempts == 2
    assert post.call_count == 2


def test_segmentation_requires_a_real_deployment(monkeypatch):
    monkeypatch.setattr(settings, "satquery_segmentation_base_url", "")
    with pytest.raises(ExecutorError, match="No deployed endpoint"):
        _run_model_inference(
            np.zeros((1, 3, 4, 4), dtype=np.float32),
            "SEG_RGB_v1",
            None,
            {},
            ["water"],
            "image-id",
        )


def test_managed_segmentation_response_records_deployment(monkeypatch, tmp_path):
    monkeypatch.chdir(tmp_path)
    artifact_dir = tmp_path / "artifacts" / "image-id"
    artifact_dir.mkdir(parents=True)
    (artifact_dir / "original.tif").write_bytes(b"raster")
    monkeypatch.setattr(
        settings, "satquery_segmentation_base_url", "https://segmentation.test"
    )
    response = httpx.Response(
        200,
        json={
            "masks": {"water": [[1, 0], [0, 1]]},
            "scores": {"water": [[0.9, 0.1], [0.2, 0.8]]},
        },
    )
    with patch(
        "backend.controller.executor._post_segmentation_with_retry",
        return_value=response,
    ) as post:
        result = _run_model_inference(
            np.zeros((1, 3, 2, 2), dtype=np.float32),
            "SEG_RGB_v1",
            "http://unused.test/infer",
            {},
            ["water"],
            "image-id",
            external_image_consent=False,
        )
    assert result["deployment"]["provider"] == "managed"
    assert result["deployment"]["model_id"] == "SEG_RGB_v1"
    assert post.call_args.args[0].endswith("/v1/segment/landcover")


def test_general_answer_is_pinned_to_fine_tuned_qwen(monkeypatch):
    captured = {}

    def fake_generate(**kwargs):
        captured.update(kwargs)
        return "Qwen answer"

    monkeypatch.setattr(
        "backend.controller.answerer.generate_domain_text", fake_generate
    )
    result = generate_direct_answer("What is NDVI?")
    assert result["plain_language"] == "Qwen answer"
    assert captured["adapter"] == settings.lora_general


def test_qwen_retries_transient_gateway_response(monkeypatch):
    service = QwenService(endpoint="https://modal-app.modal.direct/v1")
    unavailable = MagicMock(status_code=502)
    ready = MagicMock(status_code=200)
    ready.raise_for_status.return_value = None
    ready.json.return_value = {
        "choices": [{"message": {"content": "Fine-tuned response."}}]
    }
    ready.elapsed.total_seconds.return_value = 0.2
    monkeypatch.setattr(
        "backend.services.providers.qwen_service.time.sleep", lambda _: None
    )
    with patch(
        "backend.services.providers.qwen_service.requests.post",
        side_effect=[unavailable, ready],
    ) as post:
        assert service.generate("test", adapter_id="lora_general_v1") == "Fine-tuned response."
    assert post.call_count == 2
