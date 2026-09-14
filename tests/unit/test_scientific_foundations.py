import json

import numpy as np
import pytest
import rasterio
from affine import Affine

from backend.controller.metadata_resolver import inspect_raster, load_sidecar
from backend.controller.tool_graph import build_tool_graph
from backend.schemas.routing_decision import RoutingDecision
from backend.schemas.tool_execution import ToolGraph, ToolNode
from backend.scientific_tools.geometry import measure_regions
from backend.scientific_tools.geospatial import clip_to_aoi, validate_crs, zonal_statistics
from backend.scientific_tools.quality import decode_quality_band
from backend.scientific_tools.sar_stats import db_to_linear, lee_filter, linear_to_db
from backend.services import provider_service
from backend.controller.executor import _run_model_inference, ExecutorError


def _write_raster(path, descriptions=None):
    data = np.arange(3 * 4 * 4, dtype=np.uint16).reshape(3, 4, 4)
    with rasterio.open(path, "w", driver="GTiff", height=4, width=4, count=3, dtype=data.dtype, crs="EPSG:32643", transform=Affine(10, 0, 500000, 0, -10, 2000000)) as dst:
        dst.write(data)
        if descriptions:
            dst.descriptions = descriptions
    return data


def test_geotiff_band_descriptions_are_authoritative(tmp_path):
    path = tmp_path / "scene.tif"
    _write_raster(path, ("Red", "Green", "Blue"))
    metadata = inspect_raster(path)
    assert metadata["band_identities"] == ["Red", "Green", "Blue"]
    assert metadata["band_identity_source"] == "geotiff_band_descriptions"
    assert metadata["metadata_confidence"] == pytest.approx(0.98)


def test_stac_eo_bands_override_approximation(tmp_path):
    path = tmp_path / "scene.tif"
    _write_raster(path)
    metadata = inspect_raster(path, {"eo:bands": [{"name": "B4"}, {"name": "B3"}, {"name": "B2"}]})
    assert metadata["band_identities"] == ["B4", "B3", "B2"]
    assert metadata["band_identity_source"] == "stac_eo_bands"


def test_landsat_mtl_filename_maps_single_band(tmp_path):
    path = tmp_path / "original.tif"
    data = np.ones((1, 4, 4), dtype=np.uint16)
    with rasterio.open(path, "w", driver="GTiff", height=4, width=4, count=1, dtype=data.dtype) as dst:
        dst.write(data)
    metadata = inspect_raster(path, {"original_filename": "LC09_scene_B5.TIF", "FILE_NAME_BAND_5": "LC09_scene_B5.TIF"})
    assert metadata["band_identities"] == ["B5"]
    assert metadata["band_identity_source"] == "landsat_mtl_file_mapping"


def test_projected_area_uses_affine_determinant():
    mask = np.ones((10, 10), dtype=np.uint8)
    result = measure_regions(mask, pixel_spacing_m=999, crs="EPSG:32643", transform=Affine(10, 0, 0, 0, -10, 0))
    assert result["area_m2"] == pytest.approx(10_000)
    assert result["area_hectares"] == pytest.approx(1)
    assert result["method"] == "projected_affine"


def test_geographic_area_uses_geodesic_polygon_without_pixel_spacing():
    mask = np.ones((1, 1), dtype=np.uint8)
    result = measure_regions(
        mask,
        pixel_spacing_m=None,
        crs="EPSG:4326",
        transform=Affine(1, 0, 0, 0, -1, 1),
    )
    assert result["method"] == "geodesic_polygon"
    assert result["is_geographic"] is True
    assert result["area_m2"] == pytest.approx(12_308_778_361, rel=0.01)


def test_aoi_clip_and_zonal_statistics():
    array = np.arange(16, dtype=np.float32).reshape(4, 4)
    geometry = {"type": "Polygon", "coordinates": [[[0, 4], [2, 4], [2, 2], [0, 2], [0, 4]]]}
    transform = Affine(1, 0, 0, 0, -1, 4)
    clipped = clip_to_aoi(array, transform, geometry)
    assert int(clipped["aoi_mask"].sum()) == 4
    assert zonal_statistics(array, transform, geometry)["count"] == 4


def test_tool_graph_is_validated_and_cycle_rejected():
    route = RoutingDecision(mode="quality_analysis", requires_segmentation=False, required_tools=["inspect_metadata", "compute_valid_mask"], claim_policy="computed", reason="test")
    graph = build_tool_graph(route)
    assert graph.nodes[1].depends_on == [graph.nodes[0].id]
    with pytest.raises(ValueError, match="cycle"):
        ToolGraph(nodes=[ToolNode(id="a", tool="a", depends_on=["b"]), ToolNode(id="b", tool="b", depends_on=["a"])])


def test_sar_conversion_and_filter_contracts():
    linear = np.array([[1.0, 10.0], [2.0, 4.0]], dtype=np.float32)
    assert np.allclose(db_to_linear(linear_to_db(linear)), linear)
    filtered = lee_filter(np.pad(linear, 2, mode="edge"), size=3)
    assert filtered.shape == (6, 6)


def test_crs_validation():
    assert validate_crs("EPSG:4326")["valid"] is True
    assert validate_crs(None)["valid"] is False


def test_external_provider_requires_image_consent(monkeypatch):
    class ExternalProvider:
        name = "external"
        external = True
        def generate(self, **kwargs):
            return "should not run"
    monkeypatch.setattr(provider_service, "_ordered_providers", lambda: [ExternalProvider()])
    with pytest.raises(provider_service.ProviderError, match="consent not granted"):
        provider_service.generate(prompt="describe", images=["preview.png"])


def test_external_segmentation_endpoint_requires_image_consent():
    with pytest.raises(ExecutorError, match="explicit image-upload consent"):
        _run_model_inference(
            np.zeros((1, 3, 4, 4), dtype=np.float32),
            "external-segmenter", "https://example.invalid/infer", {}, ["water"], "image-id",
        )


def test_authoritative_quality_band_decoding():
    scl = np.array([[4, 8], [3, 1]], dtype=np.uint8)
    decoded = decode_quality_band(scl, "SCL")
    assert decoded["invalid_mask"].tolist() == [[False, True], [True, True]]
    landsat = np.array([[0, 1 << 3], [1 << 4, 1 << 5]], dtype=np.uint16)
    assert decode_quality_band(landsat, "QA_PIXEL")["invalid_mask"].sum() == 3
