"""Authoritative-first raster metadata and band identity resolution."""

from __future__ import annotations

import json
import re
import xml.etree.ElementTree as ET
from pathlib import Path
from typing import Any

import rasterio


SENTINEL2_DESIGNATIONS = ["B1", "B2", "B3", "B4", "B5", "B6", "B7", "B8", "B8A", "B9", "B10", "B11", "B12"]
LANDSAT_DESIGNATIONS = {1: "B1", 2: "B2", 3: "B3", 4: "B4", 5: "B5", 6: "B6", 7: "B7", 8: "B8", 9: "B9", 10: "B10", 11: "B11"}


def load_sidecar(artifact_dir: Path) -> dict[str, Any]:
    """Load explicit JSON/STAC, Landsat MTL, or Sentinel SAFE XML metadata."""
    merged: dict[str, Any] = {}
    for path in sorted(artifact_dir.iterdir() if artifact_dir.exists() else []):
        name = path.name.lower()
        try:
            if path.suffix.lower() == ".json" and ("sidecar" in name or "stac" in name or "metadata" in name):
                data = json.loads(path.read_text(encoding="utf-8"))
                props = data.get("properties", {}) if data.get("type") == "Feature" else data
                merged.update(props)
                if "eo:bands" in data:
                    merged["eo:bands"] = data["eo:bands"]
                elif data.get("assets"):
                    bands = []
                    for asset in data["assets"].values():
                        bands.extend(asset.get("eo:bands", []))
                    if bands:
                        merged["eo:bands"] = bands
            elif "mtl" in name and path.suffix.lower() in (".txt", ".met"):
                for line in path.read_text(errors="ignore").splitlines():
                    if "=" in line:
                        key, value = (part.strip() for part in line.split("=", 1))
                        merged[key] = value.strip('"')
            elif path.suffix.lower() == ".xml" and ("mtd" in name or "manifest" in name or "safe" in name):
                root = ET.parse(path).getroot()
                for elem in root.iter():
                    tag = elem.tag.rsplit("}", 1)[-1]
                    if elem.text and elem.text.strip() and tag in {
                        "PRODUCT_START_TIME", "SENSING_TIME", "SPACECRAFT_NAME",
                        "QUANTIFICATION_VALUE", "PROCESSING_LEVEL",
                    }:
                        merged[tag] = elem.text.strip()
        except (OSError, ValueError, ET.ParseError):
            continue
    return merged


def inspect_raster(path: Path, sidecar: dict[str, Any] | None = None) -> dict[str, Any]:
    sidecar = sidecar or {}
    with rasterio.open(path) as src:
        descriptions = list(src.descriptions)
        tags = src.tags()
        per_band_tags = [src.tags(i) for i in src.indexes]
        scales = [float(x) for x in (src.scales or [1.0] * src.count)]
        offsets = [float(x) for x in (src.offsets or [0.0] * src.count)]
        units = list(src.units or [None] * src.count)
        meta = {
            "dimensions": [src.height, src.width], "dtype": src.dtypes[0],
            "channel_count": src.count, "driver": src.driver,
            "crs": src.crs.to_string() if src.crs else None,
            "transform": list(src.transform)[:6],
            "bounds": [src.bounds.left, src.bounds.bottom, src.bounds.right, src.bounds.top],
            "nodata": src.nodata, "descriptions": descriptions, "tags": tags,
            "band_tags": per_band_tags, "scales": scales, "offsets": offsets, "units": units,
        }

    explicit = sidecar.get("band_identities")
    stac_bands = sidecar.get("eo:bands", [])
    tagged_bands = [
        band_tags.get("BAND_NAME") or band_tags.get("NAME") or band_tags.get("DESCRIPTION") or band_tags.get("long_name")
        for band_tags in meta["band_tags"]
    ]
    original_filename = Path(str(sidecar.get("original_filename", ""))).name.lower()
    landsat_mtl_band = None
    if original_filename:
        for key, value in sidecar.items():
            match = re.fullmatch(r"FILE_NAME_BAND_(\d+)", str(key))
            if match and Path(str(value)).name.lower() == original_filename:
                landsat_mtl_band = f"B{match.group(1)}"
                break
    if explicit:
        bands, source, confidence = list(explicit), "user_sidecar", 1.0
    elif stac_bands:
        bands = [str(b.get("name") or b.get("common_name") or f"band_{i+1}") for i, b in enumerate(stac_bands)]
        source, confidence = "stac_eo_bands", 1.0
    elif descriptions and all(descriptions):
        bands = [str(value) for value in descriptions]
        source, confidence = "geotiff_band_descriptions", 0.98
    elif tagged_bands and all(tagged_bands):
        bands = [str(value) for value in tagged_bands]
        source, confidence = "geotiff_band_tags", 0.98
    elif landsat_mtl_band and meta["channel_count"] == 1:
        bands, source, confidence = [landsat_mtl_band], "landsat_mtl_file_mapping", 1.0
    else:
        sensor = str(sidecar.get("sensor_family") or tags.get("SPACECRAFT_NAME") or "").lower()
        if src_count := meta["channel_count"]:
            if src_count == 13 and ("sentinel" in sensor or "s2" in path.name.lower()):
                bands, source, confidence = SENTINEL2_DESIGNATIONS.copy(), "sensor_specification_approximation", 0.8
            elif src_count == 2 and ("sentinel-1" in sensor or "s1" in path.name.lower() or sidecar.get("sensor_type") == "sar"):
                bands, source, confidence = ["VV", "VH"], "sensor_specification_approximation", 0.75
            elif "landsat" in sensor and src_count <= 11:
                bands = [LANDSAT_DESIGNATIONS.get(i + 1, f"B{i+1}") for i in range(src_count)]
                source, confidence = "landsat_mtl_band_order", 0.9
            elif src_count in (3, 4):
                bands = ["R", "G", "B"] + (["unknown_band_4"] if src_count == 4 else [])
                source, confidence = "channel_order_approximation", 0.55
            else:
                bands = [f"unknown_band_{i+1}" for i in range(src_count)]
                source, confidence = "unknown_approximation", 0.25
    meta.update({"band_identities": bands, "band_identity_source": source, "metadata_confidence": confidence})
    return meta


def calibration_from_metadata(meta: dict[str, Any], sidecar: dict[str, Any]) -> dict[str, Any]:
    calibration: dict[str, Any] = {"scale_applied": False}
    quant = sidecar.get("QUANTIFICATION_VALUE") or sidecar.get("quantification_value")
    if quant:
        try:
            q = float(quant)
            if q:
                calibration.update({"reflectance_scale": 1.0 / q, "source": "sentinel_safe"})
        except ValueError:
            pass
    landsat_mult = {k: float(v) for k, v in sidecar.items() if re.fullmatch(r"REFLECTANCE_MULT_BAND_\d+", k) and _is_float(v)}
    landsat_add = {k: float(v) for k, v in sidecar.items() if re.fullmatch(r"REFLECTANCE_ADD_BAND_\d+", k) and _is_float(v)}
    if landsat_mult:
        calibration.update({"landsat_reflectance_mult": landsat_mult, "landsat_reflectance_add": landsat_add, "source": "landsat_mtl"})
    sar_representation = sidecar.get("sar_representation") or sidecar.get("backscatter_representation")
    if sar_representation:
        calibration.update({
            "sar_representation": str(sar_representation).lower(),
            "sar_scale": float(sidecar.get("sar_scale", 1.0)),
            "sar_offset": float(sidecar.get("sar_offset", 0.0)),
            "sar_calibration_source": sidecar.get("sar_calibration_source", "user_sidecar"),
        })
    return calibration


def _is_float(value: Any) -> bool:
    try:
        float(value)
        return True
    except (TypeError, ValueError):
        return False
