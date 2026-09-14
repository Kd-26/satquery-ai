"""
Live testing script for OpenAI, Modal VLM, and Segmentation pipeline.
"""
import sys
import json
import logging
from pathlib import Path

# Setup logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger("live_test")

from backend.core.config import settings
from backend.services.providers.openai_provider import OpenAIProvider
from backend.services.providers.qwen_service import QwenService
from backend.services.providers.segmentation_provider import LocalSegmentationProvider
from backend.controller.planner import plan, _EXECUTION_PLAN_TOOL_SCHEMA
from backend.controller.ingestion import ingest_upload, resolve_metadata
from backend.controller.pipeline import run_query_pipeline
from backend.controller import run_state

def test_openai():
    log.info("=" * 60)
    log.info("1. TESTING OPENAI AGENT BRAIN (gpt-4o)")
    log.info("=" * 60)
    log.info(f"OpenAI Model: {settings.openai_agent_model}")
    log.info(f"API Key configured: {'YES' if settings.openai_api_key else 'NO'}")

    provider = OpenAIProvider()
    health = provider.health()
    log.info(f"OpenAI Health: {health}")

    try:
        text_resp = provider.complete("Say 'SatQuery Agent Brain is online' in 5 words or less.")
        log.info(f"OpenAI Complete Output: {text_resp}")
    except Exception as e:
        log.error(f"OpenAI Complete Failed: {e}")

    try:
        sample_schema = {
            "type": "object",
            "required": ["workflow", "target_classes"],
            "properties": {
                "workflow": {"type": "string", "enum": ["single", "temporal", "crossmodal"]},
                "target_classes": {"type": "array", "items": {"type": "string"}},
            }
        }
        struct_resp = provider.structured(
            prompt="Analyze flood in a single Sentinel-2 image.",
            schema=sample_schema,
            tool_name="create_execution_plan"
        )
        log.info(f"OpenAI Structured Output: {struct_resp}")
    except Exception as e:
        log.error(f"OpenAI Structured Tool Call Failed: {e}")

def test_modal_vlm():
    log.info("=" * 60)
    log.info("2. TESTING FINE-TUNED VLM ON MODAL")
    log.info("=" * 60)
    log.info(f"Modal Endpoint: {settings.modal_vlm_api_base}")
    log.info(f"Modal Token ID: {settings.modal_proxy_token_id[:8]}... (truncated)")

    service = QwenService()
    health = service.health()
    log.info(f"Modal Health: {health}")

    sample_preview = Path("data/samples/Bolivia_Flood_RGB_TrueColor_preview.png")
    if not sample_preview.exists():
        sample_preview = Path("data/samples/Bolivia_Flood_RGB_TrueColor.tif")

    try:
        log.info("Sending visual observation request to Modal VLM...")
        obs = service.observe(
            images=[str(sample_preview.resolve())],
            prompt="Describe what you see in this satellite image regarding water bodies, flooding, or land cover."
        )
        log.info(f"Modal VLM Observation Result:\n{json.dumps(obs, indent=2)}")
    except Exception as e:
        log.error(f"Modal VLM Call Failed: {e}", exc_info=True)

def test_segmentation_and_pipeline():
    log.info("=" * 60)
    log.info("3. TESTING SEGMENTATION MODELS & FULL PIPELINE")
    log.info("=" * 60)

    # Ingest a real sample image
    sample_tif = Path("data/samples/Bolivia_Flood_RGB_TrueColor.tif")
    if not sample_tif.exists():
        log.error(f"Sample file {sample_tif} not found!")
        return

    file_bytes = sample_tif.read_bytes()
    image_id, has_preview = ingest_upload(file_bytes, sample_tif.name)
    log.info(f"Ingested test image: image_id={image_id}, has_preview={has_preview}")

    profile = resolve_metadata(image_id)
    log.info(f"Image Profile: channels={profile.channels}, sensor_family={profile.sensor_family}, crs={profile.crs}")

    # Run End-to-End Pipeline
    run_id = "test-live-run-" + image_id[:8]
    query = "Detect water and calculate flooded area in hectares for this image."
    log.info(f"Running pipeline for query: '{query}'")

    run_state.create_run(run_id, [image_id])
    run_query_pipeline(run_id, query, [image_id], external_image_consent=True)

    state = run_state.get_run(run_id)
    log.info(f"Pipeline Execution Status: status={state.status}, stage={state.stage}, progress={state.progress}")
    if state.result:
        log.info(f"Pipeline Result Answer: {state.result.get('answer')}")
        log.info(f"Pipeline Claims: {json.dumps(state.result.get('claims'), indent=2)}")
    elif state.error:
        log.error(f"Pipeline Error: {state.error}")

if __name__ == "__main__":
    test_openai()
    test_modal_vlm()
    test_segmentation_and_pipeline()
