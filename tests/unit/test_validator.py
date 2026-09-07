"""
tests/unit/test_validator.py
━━━━━━━━━━━━━━━━━━━━━━━━━━━
Unit tests for the deterministic plan validator (backend/controller/validator.py).

Covers:
  - Single / temporal / crossmodal workflow type enforcement
  - Modality mismatch detection (SAR vs Optical)
  - Band-compatibility superset mapping (Sentinel-2 B1..B12 ⊇ {R, G, B})
  - Resolution range gating (5× tolerance factor)
  - area_estimate capability restriction pass-through
  - final_adapter registry lookup
"""

import pytest

from backend.schemas.execution_plan import ExecutionPlan
from backend.schemas.input_profile import InputProfile
from backend.controller.validator import validate_plan


# ─────────────────────────────────────────────────────────────────────────────
# Test fixtures: pre-built InputProfile objects for the benchmark datasets
# ─────────────────────────────────────────────────────────────────────────────

def _make_profile(
    image_id: str,
    sensor_family: str,
    band_identities: list[str],
    pixel_spacing_m: float = 10.0,
    crs: str = "EPSG:4326",
    dimensions: list[int] = None,
    capability_restrictions: list[str] = None,
) -> InputProfile:
    """Convenience factory for InputProfile test objects."""
    sensor_type = "sar" if sensor_family in ("sentinel-1", "risat") else "optical"
    return InputProfile(
        image_id=image_id,
        format="tif",
        dimensions=dimensions or [512, 512],
        channels=len(band_identities),
        band_identities=band_identities,
        sensor_type=sensor_type,
        sensor_family=sensor_family,
        crs=crs,
        pixel_spacing_m=pixel_spacing_m,
        acquisition_date=None,
        sar_polarization=None,
        nodata_value=0.0,
        valid_pixel_fraction=1.0,
        verified_fields=["crs", "pixel_spacing_m"],
        missing_fields=[],
        capability_restrictions=capability_restrictions or [],
    )


S2_13BAND = _make_profile(
    "img_s2",
    "sentinel-2",
    ["B1","B2","B3","B4","B5","B6","B7","B8","B8A","B9","B10","B11","B12"],
    pixel_spacing_m=10.0,
)

S1_SAR = _make_profile(
    "img_s1",
    "sentinel-1",
    ["VV", "VH"],
    pixel_spacing_m=10.0,
)

RGB_3BAND = _make_profile(
    "img_rgb",
    "unknown",
    ["R", "G", "B"],
    pixel_spacing_m=10.0,
)

# Second time-step S2 for temporal workflow
S2_13BAND_T2 = _make_profile(
    "img_s2_t2",
    "sentinel-2",
    ["B1","B2","B3","B4","B5","B6","B7","B8","B8A","B9","B10","B11","B12"],
    pixel_spacing_m=10.0,
)


def _make_plan(**kwargs) -> ExecutionPlan:
    defaults = dict(
        workflow="single",
        images=["img_s2"],
        target_classes=["water"],
        required_models=["SEG_RGB_v1"],
        optional_tools=[],
        requested_outputs=["masks"],
        final_adapter=None,
        fallback=None,
    )
    defaults.update(kwargs)
    return ExecutionPlan(**defaults)


# ─────────────────────────────────────────────────────────────────────────────
# 1. Single workflow — happy paths
# ─────────────────────────────────────────────────────────────────────────────

class TestSingleWorkflow:
    def test_s2_13band_vs_seg_rgb_v1_passes(self):
        """13-band Sentinel-2 is compatible with SEG_RGB_v1 via superset mapping."""
        plan = _make_plan(workflow="single", images=["img_s2"])
        res = validate_plan(plan, [S2_13BAND])
        assert res.approved is True, f"Unexpected errors: {res.errors}"

    def test_3band_rgb_vs_seg_rgb_v1_passes(self):
        """Explicit 3-band [R,G,B] image is compatible with SEG_RGB_v1."""
        plan = _make_plan(workflow="single", images=["img_rgb"], required_models=["SEG_RGB_v1"])
        res = validate_plan(plan, [RGB_3BAND])
        assert res.approved is True, f"Unexpected errors: {res.errors}"

    def test_s1_sar_vs_seg_sar_v1_passes(self):
        """2-band Sentinel-1 [VV,VH] is compatible with SEG_SAR_VV_VH_v1."""
        plan = _make_plan(workflow="single", images=["img_s1"], required_models=["SEG_SAR_VV_VH_v1"])
        res = validate_plan(plan, [S1_SAR])
        assert res.approved is True, f"Unexpected errors: {res.errors}"

    def test_s1_sar_vs_seg_rgb_v1_fails(self):
        """Sentinel-1 SAR image is not compatible with SEG_RGB_v1 (no RGB bands)."""
        plan = _make_plan(workflow="single", images=["img_s1"], required_models=["SEG_RGB_v1"])
        res = validate_plan(plan, [S1_SAR])
        assert res.approved is False
        assert any("missing" in e.lower() for e in res.errors)


# ─────────────────────────────────────────────────────────────────────────────
# 2. Temporal workflow
# ─────────────────────────────────────────────────────────────────────────────

class TestTemporalWorkflow:
    def test_two_s2_images_approved(self):
        """Two Sentinel-2 images of the same area at different dates: temporal OK."""
        plan = _make_plan(
            workflow="temporal",
            images=["img_s2", "img_s2_t2"],
            required_models=["SEG_RGB_v1"],
        )
        res = validate_plan(plan, [S2_13BAND, S2_13BAND_T2])
        assert res.approved is True, f"Unexpected errors: {res.errors}"

    def test_single_image_temporal_rejected(self):
        """Temporal workflow with only 1 image must be rejected with a clear message."""
        plan = _make_plan(workflow="temporal", images=["img_s2"])
        res = validate_plan(plan, [S2_13BAND])
        assert res.approved is False
        assert any("2 images" in e or "at least" in e.lower() for e in res.errors)

    def test_s1_s2_pair_temporal_rejected_with_crossmodal_hint(self):
        """SAR + Optical pair should NOT be accepted as temporal — modality mismatch."""
        plan = _make_plan(
            workflow="temporal",
            images=["img_s1", "img_s2"],
            required_models=["SEG_RGB_v1"],
        )
        res = validate_plan(plan, [S1_SAR, S2_13BAND])
        assert res.approved is False
        assert any("crossmodal" in e.lower() or "modality" in e.lower() for e in res.errors)


# ─────────────────────────────────────────────────────────────────────────────
# 3. Cross-modal workflow
# ─────────────────────────────────────────────────────────────────────────────

class TestCrossmodalWorkflow:
    def test_s1_s2_crossmodal_approved(self):
        """S1 SAR + S2 Optical pair with correct models passes crossmodal validation."""
        plan = _make_plan(
            workflow="crossmodal",
            images=["img_s1", "img_s2"],
            required_models=["SEG_SAR_VV_VH_v1", "SEG_RGB_v1"],
        )
        res = validate_plan(plan, [S1_SAR, S2_13BAND])
        assert res.approved is True, f"Unexpected errors: {res.errors}"

    def test_crossmodal_missing_sar_model_rejected(self):
        """Cross-modal plan without a SAR model must be rejected."""
        plan = _make_plan(
            workflow="crossmodal",
            images=["img_s1", "img_s2"],
            required_models=["SEG_RGB_v1"],  # missing SAR model
        )
        res = validate_plan(plan, [S1_SAR, S2_13BAND])
        assert res.approved is False
        assert any("sar" in e.lower() or "optical" in e.lower() or "missing" in e.lower() for e in res.errors)

    def test_crossmodal_single_image_rejected(self):
        """Cross-modal workflow with only 1 image must be rejected."""
        plan = _make_plan(
            workflow="crossmodal",
            images=["img_s2"],
            required_models=["SEG_SAR_VV_VH_v1", "SEG_RGB_v1"],
        )
        res = validate_plan(plan, [S2_13BAND])
        assert res.approved is False
        assert any("2 images" in e or "at least" in e.lower() for e in res.errors)


# ─────────────────────────────────────────────────────────────────────────────
# 4. Resolution range gating
# ─────────────────────────────────────────────────────────────────────────────

class TestResolutionGating:
    def test_resolution_in_range_passes(self):
        """10m pixel spacing falls within SEG_RGB_v1 range [0.3, 30m]."""
        plan = _make_plan()
        res = validate_plan(plan, [S2_13BAND])
        assert res.approved is True
        assert not any("resolution" in e.lower() for e in res.errors)

    def test_resolution_out_of_tolerance_rejected(self):
        """500m pixel spacing is > 30m * 5 = 150m, strictly incompatible."""
        too_coarse = _make_profile("img_coarse", "sentinel-2",
                                   ["B1","B2","B3","B4","B5","B6","B7","B8","B8A","B9","B10","B11","B12"],
                                   pixel_spacing_m=500.0)
        plan = _make_plan()
        res = validate_plan(plan, [too_coarse])
        assert res.approved is False
        assert any("resolution" in e.lower() for e in res.errors)

    def test_resolution_in_tolerance_extrapolation_warning(self):
        """35m pixel spacing > 30m max but within 5x tolerance; allowed with a restriction."""
        slightly_coarse = _make_profile("img_slightly_coarse", "sentinel-2",
                                        ["B1","B2","B3","B4","B5","B6","B7","B8","B8A","B9","B10","B11","B12"],
                                        pixel_spacing_m=35.0)
        plan = _make_plan()
        res = validate_plan(plan, [slightly_coarse])
        assert res.approved is True
        assert any("extrapolated" in r.lower() for r in res.restrictions)


# ─────────────────────────────────────────────────────────────────────────────
# 5. Miscellaneous checks
# ─────────────────────────────────────────────────────────────────────────────

class TestMiscChecks:
    def test_area_estimate_restriction_passed_through(self):
        """area_estimation restriction is surfaced but does NOT block approval."""
        profile_no_crs = _make_profile(
            "img_no_crs", "sentinel-2",
            ["B1","B2","B3","B4","B5","B6","B7","B8","B8A","B9","B10","B11","B12"],
            capability_restrictions=["area_estimation: unavailable without CRS"],
            crs=None,
        )
        plan = _make_plan(requested_outputs=["masks", "area_estimate"])
        res = validate_plan(plan, [profile_no_crs])
        assert res.approved is True  # Not a hard block
        assert any("area_estimate" in r.lower() for r in res.restrictions)

    def test_unknown_model_id_rejected(self):
        """A model_id not in the registry must cause approved=False."""
        plan = _make_plan(required_models=["NONEXISTENT_MODEL_v99"])
        res = validate_plan(plan, [S2_13BAND])
        assert res.approved is False
        assert any("not found" in e.lower() for e in res.errors)

    def test_s2_sensor_family_unknown_gives_restriction(self):
        """Unknown sensor family is a restriction (domain-shift risk), not a hard error."""
        res = validate_plan(_make_plan(), [S2_13BAND])
        # S2 is NOT unknown - no domain-shift restriction
        assert not any("unverified" in r for r in res.restrictions)

    def test_unknown_sensor_family_gives_restriction(self):
        """Unknown sensor family triggers a domain-shift risk restriction."""
        plan = _make_plan(images=["img_rgb"])
        res = validate_plan(plan, [RGB_3BAND])  # RGB_3BAND has sensor_family="unknown"
        assert any("unverified" in r.lower() for r in res.restrictions)
