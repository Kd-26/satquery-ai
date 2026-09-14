"""Execution adapters for non-segmentation Scientific IDE workflows.

Every value returned here is computed from raster pixels or verified metadata.
No LLM is allowed to manufacture a measurement.
"""

from __future__ import annotations

import time
import os
from pathlib import Path
from typing import Any

import numpy as np

from backend.controller.ingestion import resolve_metadata
from backend.controller.preprocessing import _find_band_index
from backend.schemas.input_profile import InputProfile
from backend.schemas.routing_decision import RoutingDecision
from backend.controller.tool_graph import build_tool_graph
from backend.schemas.tool_execution import ToolResult
from backend.scientific_tools.alignment import check_pair_compatibility
from backend.scientific_tools.indices import compute_mndwi, compute_ndbi, compute_ndvi, compute_ndwi
from backend.scientific_tools.preview import generate_preview
from backend.scientific_tools.quality import compute_valid_mask, detect_saturation, approximate_optical_cloud_shadow_mask, decode_quality_band
from backend.scientific_tools.raster_io import read_bands
from backend.scientific_tools.geospatial import write_georeferenced_raster
from affine import Affine


class ScientificToolError(Exception):
    pass


_INDEX_SPECS = {
    "NDVI": (("NIR", "R"), compute_ndvi),
    "NDWI": (("G", "NIR"), compute_ndwi),
    "MNDWI": (("G", "SWIR1"), compute_mndwi),
    "NDBI": (("SWIR1", "NIR"), compute_ndbi),
}


def _artifact_path(image_id: str) -> Path:
    matches = list((Path("artifacts") / image_id).glob("original.*"))
    if not matches:
        raise ScientificToolError(f"Original raster not found for image {image_id}.")
    return matches[0]


def _band_index(concept: str, profile: InputProfile) -> int:
    aliases = {"SWIR1": ("B11", "SWIR1", "BAND_11")}
    if concept in aliases:
        upper = [b.upper() for b in profile.band_identities]
        for alias in aliases[concept]:
            if alias in upper:
                return upper.index(alias)
        return max(0, profile.channels - 1)
    idx = _find_band_index(concept, profile.band_identities, profile.channels, profile.sensor_family)
    if idx is None:
        approximate = {"R": 0, "G": 1, "B": 2, "NIR": 3, "VV": 0, "VH": 1}
        return min(approximate.get(concept, 0), max(0, profile.channels - 1))
    return idx


def _summary(array: np.ndarray, valid_mask: np.ndarray) -> dict[str, float]:
    values = np.asarray(array, dtype=np.float64)[valid_mask & np.isfinite(array)]
    if not values.size:
        raise ScientificToolError("No valid pixels are available for this calculation.")
    return {
        "mean": float(np.mean(values)),
        "median": float(np.median(values)),
        "minimum": float(np.min(values)),
        "maximum": float(np.max(values)),
        "std": float(np.std(values)),
    }


def _calibrated_raster(raster: np.ndarray, profile: InputProfile) -> tuple[np.ndarray, list[str]]:
    result = raster.astype(np.float32, copy=True)
    notes: list[str] = []
    for idx in range(min(result.shape[0], len(profile.scale_factors))):
        scale = profile.scale_factors[idx]
        offset = profile.offsets[idx] if idx < len(profile.offsets) else 0.0
        if scale != 1.0 or offset != 0.0:
            result[idx] = result[idx] * scale + offset
            notes.append(f"band {idx + 1}: GeoTIFF scale={scale}, offset={offset}")
    reflectance_scale = profile.calibration.get("reflectance_scale")
    if reflectance_scale and all(value == 1.0 for value in profile.scale_factors or [1.0]):
        result *= float(reflectance_scale)
        notes.append(f"SAFE quantification scale={reflectance_scale}")
    landsat_mult = profile.calibration.get("landsat_reflectance_mult", {})
    landsat_add = profile.calibration.get("landsat_reflectance_add", {})
    if landsat_mult:
        for idx, identity in enumerate(profile.band_identities):
            match = str(identity).upper().replace("BAND_", "B")
            if match.startswith("B") and match[1:].isdigit():
                number = match[1:]
                mult_key = f"REFLECTANCE_MULT_BAND_{number}"
                add_key = f"REFLECTANCE_ADD_BAND_{number}"
                if mult_key in landsat_mult:
                    result[idx] = result[idx] * float(landsat_mult[mult_key]) + float(landsat_add.get(add_key, 0.0))
                    notes.append(f"{identity}: Landsat MTL reflectance calibration")
    return result, notes


def _measurement(claim: str, value: float, unit: str, tool: str, confidence: float = 1.0) -> dict:
    return {
        "measurement": value,
        "unit": unit,
        "claim": claim,
        "tool": tool,
        "confidence": confidence,
        "tool_version": "1.0.0",
        "derivation": [tool],
    }


def execute_scientific_route(
    route: RoutingDecision,
    image_ids: list[str],
    profiles: list[InputProfile],
    run_id: str | None = None,
) -> dict[str, Any]:
    if not image_ids:
        raise ScientificToolError(f"The {route.mode} route requires at least one image.")

    started = time.perf_counter()
    graph = build_tool_graph(route)
    tool_outputs: dict[str, Any] = {
        "metadata": [p.model_dump(mode="json") for p in profiles],
        "route": route.model_dump(),
        "tool_graph": graph.model_dump(),
    }
    measurements: dict[str, Any] = {}
    limitations: list[str] = []
    traces: list[dict[str, Any]] = []

    raw_rasters = [read_bands(str(_artifact_path(image_id))).astype(np.float32) for image_id in image_ids]
    calibrated = [_calibrated_raster(raster, profile) for raster, profile in zip(raw_rasters, profiles)]
    rasters = [item[0] for item in calibrated]
    tool_outputs["calibration"] = {image_id: notes for image_id, (_, notes) in zip(image_ids, calibrated)}
    valid_masks = []
    quality_outputs = {}
    for image_id, raster, profile in zip(image_ids, rasters, profiles):
        saturation = detect_saturation(raster)
        cloud = shadow = None
        quality_method = "nodata_and_saturation"
        upper_bands = [band.upper() for band in profile.band_identities]
        qa_name = next((name for name in ("SCL", "QA_PIXEL") if name in upper_bands), None)
        authoritative_invalid = None
        if qa_name:
            decoded = decode_quality_band(raster[upper_bands.index(qa_name)], qa_name)
            cloud, shadow = decoded["cloud_mask"], decoded["shadow_mask"]
            saturation |= decoded["saturation_mask"]
            authoritative_invalid = decoded["invalid_mask"]
            quality_method = decoded["method"]
        elif (profile.sensor_type or "").lower() != "sar" and raster.shape[0] >= 3:
            try:
                blue = raster[_band_index("B", profile)]
                green = raster[_band_index("G", profile)]
                red = raster[_band_index("R", profile)]
                nir_idx = _find_band_index("NIR", profile.band_identities, profile.channels, profile.sensor_family)
                cloud_result = approximate_optical_cloud_shadow_mask(blue, green, red, raster[nir_idx] if nir_idx is not None else None)
                cloud, shadow = cloud_result["cloud_mask"], cloud_result["shadow_mask"]
                quality_method = cloud_result["method"]
                limitations.append(f"Cloud/shadow mask for {image_id} is approximate; no authoritative quality band was supplied.")
            except Exception:
                pass
        invalid_quality = saturation.copy()
        if authoritative_invalid is not None:
            invalid_quality |= authoritative_invalid
        if cloud is not None:
            invalid_quality |= cloud | shadow
        valid = compute_valid_mask(raster, nodata_value=profile.nodata_value, cloud_mask=invalid_quality)
        valid_masks.append(valid)
        if run_id and profile.crs and profile.transform:
            try:
                write_georeferenced_raster(
                    Path("artifacts") / run_id / "derived" / "valid_mask.tif",
                    valid.astype(np.float32), Affine(*profile.transform[:6]), profile.crs, 0.0,
                )
            except Exception:
                pass
        quality_outputs[image_id] = {
            "valid_fraction": float(valid.mean()), "saturated_fraction": float(saturation.mean()),
            "cloud_fraction": float(cloud.mean()) if cloud is not None else None,
            "shadow_fraction": float(shadow.mean()) if shadow is not None else None,
            "method": quality_method,
        }
        if float(valid.mean()) < float(os.getenv("QUALITY_MIN_VALID_FRACTION", "0.2")):
            raise ScientificToolError(
                f"Quality gate failed for {image_id}: only {valid.mean():.1%} of pixels are usable."
            )
    tool_outputs["quality_gates"] = quality_outputs

    if any(profile.approximate_fields for profile in profiles):
        limitations.append(
            "One or more required bands were inferred approximately. Results are exploratory and must not be treated as calibrated measurements."
        )

    if route.mode == "quality_analysis":
        for image_id, raster, mask in zip(image_ids, rasters, valid_masks):
            valid_pct = float(mask.mean() * 100.0)
            measurements[f"{image_id}_valid_pixels"] = _measurement(
                "valid pixel coverage", valid_pct, "%", "quality.compute_valid_mask", profiles[image_ids.index(image_id)].metadata_confidence
            )
            measurements[f"{image_id}_nodata_pixels"] = _measurement(
                "nodata or invalid pixel coverage", 100.0 - valid_pct, "%", "quality.compute_valid_mask"
            )
            tool_outputs.setdefault("quality", {})[image_id] = {
                "valid_pixel_fraction": valid_pct / 100.0,
                "finite_fraction": float(np.isfinite(raster).mean()),
            }

    elif route.mode == "spectral_analysis":
        profile, raster, valid = profiles[0], rasters[0], valid_masks[0]
        requested = [tool.split(":", 1)[1] for tool in route.required_tools if tool.startswith("compute_spectral_index:")]
        for index_name in requested:
            concepts, function = _INDEX_SPECS[index_name]
            first_idx = _band_index(concepts[0], profile)
            second_idx = _band_index(concepts[1], profile)
            first = raster[first_idx]
            second = raster[second_idx]
            source_bands = [profile.band_identities[first_idx], profile.band_identities[second_idx]]
            index_raster = function(first, second)
            stats = _summary(index_raster, valid)
            artifact_ref = None
            if run_id and profile.crs and profile.transform:
                artifact_ref = write_georeferenced_raster(
                    Path("artifacts") / run_id / "derived" / f"{index_name.lower()}.tif",
                    index_raster.astype(np.float32), Affine(*profile.transform[:6]), profile.crs, np.nan,
                )
            tool_outputs[index_name] = {**stats, "artifact_ref": artifact_ref}
            for stat in ("mean", "median", "minimum", "maximum"):
                confidence = min(profile.metadata_confidence, 0.7 if quality_outputs[profile.image_id]["method"].startswith("approximate") else 1.0)
                measurements[f"{index_name.lower()}_{stat}"] = _measurement(
                    f"{index_name} {stat}", stats[stat], "index", f"indices.compute_{index_name.lower()}", confidence
                )
                measurements[f"{index_name.lower()}_{stat}"]["source_bands"] = source_bands
                measurements[f"{index_name.lower()}_{stat}"]["uncertainty"] = 0.25 if profile.approximate_fields else 0.05
                measurements[f"{index_name.lower()}_{stat}"]["artifact_ref"] = artifact_ref

    elif route.mode == "sar_analysis":
        profile, raster, valid = profiles[0], rasters[0], valid_masks[0]
        sar_outputs: dict[str, Any] = {}
        representation = str(profile.calibration.get("sar_representation", "unknown")).lower()
        filter_size = int(os.getenv("SAR_LEE_FILTER_SIZE", "5"))
        from backend.scientific_tools.sar_stats import calibrate_sar, lee_filter
        for polarization in ("VV", "VH"):
            idx = _band_index(polarization, profile)
            values = raster[idx]
            unit = "native raster units"
            processing = "unverified_representation_no_filter"
            if representation == "linear":
                calibrated_sar = calibrate_sar(
                    lee_filter(values, filter_size),
                    float(profile.calibration.get("sar_scale", 1.0)),
                    float(profile.calibration.get("sar_offset", 0.0)),
                    output="dB",
                )
                values = calibrated_sar["array"]
                unit = "dB"
                processing = f"Lee {filter_size}x{filter_size} in linear space, calibrated to dB"
            elif representation == "db":
                unit = "dB"
                processing = "calibrated dB supplied; no linear-space speckle filter applied"
            stats = _summary(values, valid)
            stats["processing"] = processing
            sar_outputs[polarization] = stats
            for stat in ("mean", "median", "std"):
                measurements[f"{polarization.lower()}_{stat}"] = _measurement(
                    f"{polarization} backscatter {stat}", stats[stat], unit, "sar.backscatter_statistics", 0.95 if representation in {"linear", "db"} else 0.6
                )
        tool_outputs["sar_statistics"] = sar_outputs
        if representation not in {"linear", "db"}:
            limitations.append("SAR values are reported in native raster units and left unfiltered because metadata does not verify linear versus dB representation.")

    elif route.mode == "temporal_analysis":
        if len(rasters) < 2:
            raise ScientificToolError("Temporal analysis requires at least two images.")
        compatibility = check_pair_compatibility(profiles[0], profiles[1])
        tool_outputs["alignment"] = compatibility
        if not compatibility["bounding_box_overlap"] or (not compatibility["crs_match"] and not compatibility["reprojectable"]):
            raise ScientificToolError("The image pair has no compatible geographic overlap.")
        if not compatibility["grid_match"] or rasters[0].shape[-2:] != rasters[1].shape[-2:]:
            from backend.scientific_tools.alignment import align_to_reference
            aligned = align_to_reference(rasters[1], profiles[1], profiles[0])
            rasters[1] = aligned["array"]
            valid_masks[1] = compute_valid_mask(rasters[1], nodata_value=profiles[1].nodata_value)
            compatibility["alignment_performed"] = True
            compatibility["resampling"] = aligned["resampling"]
        shared_valid = valid_masks[0] & valid_masks[1]
        requested_indices = [
            tool.split(":", 1)[1]
            for tool in route.required_tools
            if tool.startswith("compute_spectral_index:")
        ]
        if requested_indices:
            for index_name in requested_indices:
                concepts, function = _INDEX_SPECS[index_name]
                index_arrays = []
                for profile, raster in zip(profiles[:2], rasters[:2]):
                    first = raster[_band_index(concepts[0], profile)]
                    second = raster[_band_index(concepts[1], profile)]
                    index_arrays.append(function(first, second))
                difference = index_arrays[1] - index_arrays[0]
                stats = _summary(difference, shared_valid)
                artifact_ref = None
                if run_id and profiles[0].crs and profiles[0].transform:
                    artifact_ref = write_georeferenced_raster(
                        Path("artifacts") / run_id / "derived" / f"{index_name.lower()}_difference.tif",
                        difference.astype(np.float32), Affine(*profiles[0].transform[:6]), profiles[0].crs, np.nan,
                    )
                tool_outputs[f"{index_name}_difference"] = {**stats, "artifact_ref": artifact_ref}
                measurements[f"{index_name.lower()}_mean_change"] = _measurement(
                    f"{index_name} mean change", stats["mean"], "index", f"compare.{index_name.lower()}", 0.95
                )
                measurements[f"{index_name.lower()}_mean_change"]["artifact_ref"] = artifact_ref
                measurements[f"{index_name.lower()}_mean_absolute_change"] = _measurement(
                    f"{index_name} mean absolute change",
                    float(np.nanmean(np.abs(difference[shared_valid]))),
                    "index",
                    f"compare.{index_name.lower()}",
                    0.95,
                )
                measurements[f"{index_name.lower()}_mean_absolute_change"]["artifact_ref"] = artifact_ref
            limitations.append("Index differences can be influenced by atmospheric and seasonal conditions between acquisitions.")
        else:
            common_bands = min(rasters[0].shape[0], rasters[1].shape[0])
            difference = rasters[1][:common_bands] - rasters[0][:common_bands]
            per_band = {}
            for idx in range(common_bands):
                stats = _summary(difference[idx], shared_valid)
                band_name = profiles[0].band_identities[idx] if idx < len(profiles[0].band_identities) else f"band_{idx + 1}"
                per_band[band_name] = stats
            tool_outputs["raster_difference"] = per_band
            mean_abs = float(np.nanmean(np.abs(difference[:, shared_valid])))
            measurements["mean_absolute_raster_change"] = _measurement(
                "mean absolute raster change", mean_abs, "native raster units", "compare.raster_difference", 0.9
            )
            limitations.append("Raw raster differences are meaningful only when acquisition calibration and atmospheric conditions are comparable.")

    else:
        raise ScientificToolError(f"No deterministic executor is defined for route {route.mode}.")

    traces.append({
        "step": "scientific_tools",
        "route": route.mode,
        "tools": route.required_tools,
        "duration_s": time.perf_counter() - started,
        "status": "success",
    })
    tool_results = []
    for node in graph.nodes:
        value: Any = {"completed": True}
        upper_tool = node.tool.upper()
        if node.tool == "inspect_metadata":
            value = tool_outputs["metadata"]
        elif "VALID" in upper_tool or "QUALITY" in upper_tool:
            value = quality_outputs
        elif "ALIGN" in upper_tool:
            value = tool_outputs.get("alignment", {"not_required": True})
        elif "SAR" in upper_tool:
            value = tool_outputs.get("sar_statistics", {})
        elif "SPECTRAL_INDEX:" in upper_tool:
            value = tool_outputs.get(node.tool.split(":", 1)[1].upper(), {})
        elif "DIFFERENCE" in upper_tool:
            value = {key: item for key, item in tool_outputs.items() if "difference" in key.lower()}
        elif "SUMMARIZE" in upper_tool:
            value = measurements
        tool_results.append(ToolResult(
            node_id=node.id,
            tool=node.tool,
            status="success",
            required=node.required,
            value=value,
            crs=profiles[0].crs if profiles else None,
            source_images=image_ids,
            source_bands=profiles[0].band_identities if profiles else [],
            parameters=node.parameters,
            derivation=node.depends_on,
            warnings=list(dict.fromkeys(limitations)) if not node.required else [],
            duration_s=time.perf_counter() - started,
        ).model_dump(mode="json"))
    tool_outputs["tool_results"] = tool_results
    return {
        "masks": {},
        "scores": {},
        "measurements": measurements,
        "tool_outputs": tool_outputs,
        "limitations": limitations,
        "traces": traces,
        "tool_graph": graph.model_dump(),
    }


def ensure_preview(image_id: str) -> str:
    preview = Path("artifacts") / image_id / "preview.png"
    if not preview.exists():
        generate_preview(str(_artifact_path(image_id)), str(preview))
    return str(preview)
