"""
tests/unit/test_agentic_ai.py
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Unit test suite for the Agentic AI layer:
  - Verifier unit-normalization & qualitative hallucination checks
  - Query intent classification
  - Evidence serialisation & conservative fallbacks
  - Executor VLM spatial scoring
"""

import pytest
import numpy as np

from backend.schemas.evidence_package import EvidencePackage, Claim
from backend.schemas.execution_plan import ExecutionPlan
from backend.schemas.input_profile import InputProfile
from backend.controller.verifier import verify_answer, get_conservative_fallback
from backend.controller.intent import classify_intent
from backend.controller.answerer import _serialise_evidence, _conservative_text_answer
from backend.controller.executor import _vlm_class_scoring, ExecutorError


@pytest.fixture
def sample_evidence():
    return EvidencePackage(
        run_id="test_run_123",
        claims=[
            Claim(
                claim="water area measured",
                measurement=14.5,  # 14.5 hectares
                region_id="aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
                source_images=["img_s2_01"],
                tool="geometry.measure_regions",
                confidence=0.88,
            ),
            Claim(
                claim="vegetation area measured",
                measurement=50.0,  # 50 hectares
                region_id="ffffffff-1111-2222-3333-444444444444",
                source_images=["img_s2_01"],
                tool="geometry.measure_regions",
                confidence=0.92,
            ),
        ],
        masks_ref={"water": "/tmp/water.tif"},
        overlays_ref={},
        limitations=["Atmospheric interference over south edge"],
        model_versions={"SEG_RGB_v1": "1.0.0"},
    )


def test_verifier_exact_numeric_match(sample_evidence):
    text = "The satellite analysis indicates that the lake covers approximately 14.5 ha of surface water."
    res = verify_answer(text, sample_evidence)
    assert res.passed is True
    assert len(res.flagged_claims) == 0


def test_verifier_unit_conversion_hectares_to_m2(sample_evidence):
    # 14.5 ha = 145,000 m²
    text = "The measured water surface area is roughly 145,000 m² with high confidence."
    res = verify_answer(text, sample_evidence)
    assert res.passed is True
    assert len(res.flagged_claims) == 0


def test_verifier_unit_conversion_hectares_to_km2(sample_evidence):
    # 50.0 ha = 0.5 km²
    text = "Total vegetation coverage was calculated at 0.50 km²."
    res = verify_answer(text, sample_evidence)
    assert res.passed is True
    assert len(res.flagged_claims) == 0


def test_verifier_detects_hallucinated_number(sample_evidence):
    # 999.0 ha is nowhere in the evidence
    text = "The lake covers 999.0 hectares, causing severe issues."
    res = verify_answer(text, sample_evidence)
    assert res.passed is False
    assert any("999" in f for f in res.flagged_claims)


def test_verifier_detects_unknown_uuid(sample_evidence):
    text = "Feature detected in region 99999999-9999-9999-9999-999999999999 with 14.5 ha area."
    res = verify_answer(text, sample_evidence)
    assert res.passed is False
    assert any("99999999-9999-9999-9999-999999999999" in f for f in res.flagged_claims)


def test_verifier_qualitative_severity_check():
    # Low confidence evidence with extreme qualitative claim
    low_conf_evidence = EvidencePackage(
        run_id="run_low",
        claims=[
            Claim(
                claim="water area measured",
                measurement=10.0,
                region_id="11111111-2222-3333-4444-555555555555",
                source_images=["img_1"],
                tool="geometry.measure_regions",
                confidence=0.45,  # low confidence
            )
        ],
        masks_ref={},
        overlays_ref={},
        limitations=["Heavy cloud obstruction"],
        model_versions={"SEG_RGB_v1": "1.0.0"},
    )
    text = "A catastrophic flood event caused unprecedented damage covering 10.0 ha."
    res = verify_answer(text, low_conf_evidence)
    assert any("Qualitative severity term 'catastrophic'" in n for n in res.notes)


def test_conservative_fallback_structure(sample_evidence):
    fallback = get_conservative_fallback(sample_evidence)
    assert "Verified Scientific Analysis Report" in fallback
    assert "14.5" in fallback
    assert "50" in fallback
    assert "Atmospheric interference" in fallback


def test_intent_classification_heuristic():
    p1 = InputProfile(
        image_id="img_1",
        format="GeoTIFF",
        dimensions=[512, 512],
        channels=3,
        band_identities=["R", "G", "B"],
        sensor_type="optical",
        sensor_family="sentinel-2",
        crs="EPSG:32632",
        pixel_spacing_m=10.0,
        acquisition_date="2024-01-01T00:00:00Z",
        sar_polarization=None,
        nodata_value=0.0,
        valid_pixel_fraction=1.0,
        verified_fields=["crs"],
        missing_fields=[],
        capability_restrictions=[],
    )
    p2 = InputProfile(
        image_id="img_2",
        format="GeoTIFF",
        dimensions=[512, 512],
        channels=3,
        band_identities=["R", "G", "B"],
        sensor_type="optical",
        sensor_family="sentinel-2",
        crs="EPSG:32632",
        pixel_spacing_m=10.0,
        acquisition_date="2024-06-01T00:00:00Z",
        sar_polarization=None,
        nodata_value=0.0,
        valid_pixel_fraction=1.0,
        verified_fields=["crs"],
        missing_fields=[],
        capability_restrictions=[],
    )

    # 2 optical images over time -> temporal change detection
    intent = classify_intent("How much forest was lost between the two dates? Calculate the NDWI index.", [p1, p2])
    assert intent["workflow_hint"] == "temporal"
    assert "vegetation" in intent["target_classes_hint"] or "water" in intent["target_classes_hint"]


def test_executor_never_fabricates_segmentation_masks_with_vlm():
    with pytest.raises(ExecutorError, match="cannot be used to synthesize"):
        _vlm_class_scoring(
            image_id="test_img",
            classes=["water", "vegetation"],
            model_id="SEG_RGB_v1",
            tensor_shape=(1, 3, 128, 128),
        )


def test_answerer_conservative_text_passes_verifier(sample_evidence):
    conservative_text = _conservative_text_answer("Calculate water and vegetation", sample_evidence)
    v_res = verify_answer(conservative_text, sample_evidence)
    assert v_res.passed is True
    assert len(v_res.flagged_claims) == 0
