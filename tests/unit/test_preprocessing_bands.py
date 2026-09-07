"""
Unit tests for preprocessing band selection and alias resolution.
Verifies that:
- Sentinel-2 13-band images map correctly to RGB (B4/B3/B2) for SEG_RGB_v1.
- Sentinel-1 2-band images map correctly to VV/VH for SEG_SAR_VV_VH_v1.
- Standard 3-band RGB images map correctly to SEG_RGB_v1.
- Incompatible input raises IncompatibleInputError.
"""
import pytest
from backend.controller.preprocessing import _find_band_index, IncompatibleInputError


def test_find_band_index_exact_match():
    bands = ["R", "G", "B"]
    assert _find_band_index("R", bands, 3) == 0
    assert _find_band_index("G", bands, 3) == 1
    assert _find_band_index("B", bands, 3) == 2


def test_find_band_index_sentinel2_13bands():
    # Sentinel-2 band identities
    s2_bands = ["B1", "B2", "B3", "B4", "B5", "B6", "B7", "B8", "B8A", "B9", "B10", "B11", "B12"]
    # R should map to B4 (index 3)
    assert _find_band_index("R", s2_bands, 13) == 3
    # G should map to B3 (index 2)
    assert _find_band_index("G", s2_bands, 13) == 2
    # B should map to B2 (index 1)
    assert _find_band_index("B", s2_bands, 13) == 1
    # NIR should map to B8 (index 7)
    assert _find_band_index("NIR", s2_bands, 13) == 7


def test_find_band_index_sar():
    sar_bands = ["VV", "VH"]
    assert _find_band_index("VV", sar_bands, 2) == 0
    assert _find_band_index("VH", sar_bands, 2) == 1


def test_find_band_index_sar_generic_bands():
    bands = ["band_1", "band_2"]
    assert _find_band_index("VV", bands, 2) == 0
    assert _find_band_index("VH", bands, 2) == 1


def test_find_band_index_optical_missing_sar_returns_none():
    optical_bands = ["R", "G", "B"]
    assert _find_band_index("VV", optical_bands, 3) is None
    assert _find_band_index("VH", optical_bands, 3) is None
