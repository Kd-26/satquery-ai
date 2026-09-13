import json

import numpy as np

from backend.controller.answerer import _serialise_evidence
from backend.controller.intent import route_query
from backend.controller.scientific_tool_executor import execute_scientific_route
from backend.schemas.evidence_package import Claim, EvidencePackage
from backend.schemas.input_profile import InputProfile
from backend.services.vlm_service import _build_messages
from backend.controller.verifier import verify_answer
from backend.scientific_tools.alignment import check_pair_compatibility
from backend.controller import pipeline, run_state


def _profile(image_id="img", sensor="sentinel-2", bands=None):
    bands = bands or ["B1", "B2", "B3", "B4", "B5", "B6", "B7", "B8", "B8A", "B9", "B10", "B11", "B12"]
    return InputProfile(
        image_id=image_id,
        format="tif",
        dimensions=[16, 16],
        channels=len(bands),
        band_identities=bands,
        sensor_type="sar" if sensor == "sentinel-1" else "optical",
        sensor_family=sensor,
        crs="EPSG:32643",
        pixel_spacing_m=10,
        acquisition_date=None,
        sar_polarization="VV,VH" if sensor == "sentinel-1" else None,
        nodata_value=0,
        valid_pixel_fraction=1,
        verified_fields=["crs", "pixel_spacing_m"],
        missing_fields=[],
        capability_restrictions=[],
    )


def test_router_sends_general_knowledge_directly_to_vlm():
    route = route_query("What is NDVI?", [])
    assert route.mode == "general_knowledge"
    assert route.required_tools == []


def test_router_does_not_treat_missing_raster_as_general_knowledge():
    route = route_query("Calculate NDVI for this image", [])
    assert route.mode != "general_knowledge"


def test_router_visual_interpretation_does_not_segment():
    route = route_query("Describe anything unusual in this image", [_profile()])
    assert route.mode == "visual_interpretation"
    assert route.requires_segmentation is False
    assert "vision_vlm_interpret" in route.required_tools


def test_router_index_uses_deterministic_tools_without_segmentation():
    route = route_query("Calculate NDWI for this image", [_profile()])
    assert route.mode == "spectral_analysis"
    assert route.requires_segmentation is False
    assert "compute_spectral_index:NDWI" in route.required_tools


def test_router_area_request_requires_segmentation():
    route = route_query("Measure the area of water in this image", [_profile()])
    assert route.mode == "segmentation"
    assert route.requires_segmentation is True


def test_router_comparative_index_uses_temporal_tools_not_segmentation():
    route = route_query("Compare NDVI between these images", [_profile("a"), _profile("b")])
    assert route.mode == "temporal_analysis"
    assert route.requires_segmentation is False
    assert "compute_spectral_index:NDVI" in route.required_tools


def test_evidence_serialiser_preserves_percent_unit():
    evidence = EvidencePackage(
        run_id="run",
        claims=[Claim(claim="water coverage", measurement=20, unit="%", region_id="r", source_images=["i"], tool="pixel_fraction", confidence=.8)],
        limitations=[],
        model_versions={},
    )
    text = _serialise_evidence(evidence)
    assert "20 %" in text
    assert "20 ha" not in text


def test_local_preview_is_embedded_in_vlm_message(tmp_path):
    image = tmp_path / "preview.png"
    image.write_bytes(b"not-a-real-png-but-valid-for-encoding")
    messages = _build_messages("describe", images=[str(image)])
    url = messages[0]["content"][1]["image_url"]["url"]
    assert url.startswith("data:image/png;base64,")


def test_verifier_accepts_grounded_negative_index_value():
    evidence = EvidencePackage(
        run_id="run",
        claims=[Claim(claim="NDWI mean", measurement=-0.394, unit="index", region_id="r", source_images=["i"], tool="ndwi", confidence=1)],
        limitations=[],
        model_versions={},
    )
    assert verify_answer("Mean NDWI was -0.39.", evidence).passed


def test_alignment_rejects_non_overlapping_rasters():
    a = _profile("a").model_copy(update={"bounds": [0, 0, 10, 10], "transform": [1, 0, 0, 0, -1, 10]})
    b = _profile("b").model_copy(update={"bounds": [20, 20, 30, 30], "transform": [1, 0, 20, 0, -1, 30]})
    result = check_pair_compatibility(a, b)
    assert result["bounding_box_overlap"] is False
    assert result["compatible"] is False


def test_general_pipeline_bypasses_planner_and_tools(monkeypatch):
    monkeypatch.setattr(
        pipeline,
        "generate_direct_answer",
        lambda query: {"technical": "NDVI is a vegetation index.", "plain_language": "NDVI is a vegetation index."},
    )
    monkeypatch.setattr(
        pipeline,
        "planner_plan",
        lambda *args, **kwargs: (_ for _ in ()).throw(AssertionError("planner must not run")),
    )
    run_id = "general-routing-test"
    run_state.create_run(run_id, [])
    pipeline.run_query_pipeline(run_id, "What is NDVI?", [])
    state = run_state.get_run(run_id)
    assert state.status == run_state.RunStatus.done
    assert state.result["route"]["mode"] == "general_knowledge"


def test_raster_operation_without_image_fails_clearly():
    run_id = "missing-image-routing-test"
    run_state.create_run(run_id, [])
    pipeline.run_query_pipeline(run_id, "Calculate NDVI for this image", [])
    state = run_state.get_run(run_id)
    assert state.status == run_state.RunStatus.failed
    assert "uploaded image" in state.error
