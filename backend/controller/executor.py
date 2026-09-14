import json
import logging
import time
import os
import io
import zipfile
import httpx
import rasterio
import numpy as np
from pathlib import Path
from typing import Dict, Any
from urllib.parse import urlparse

from backend.core.config import settings
from backend.schemas.execution_plan import ExecutionPlan
from backend.schemas.validation_result import ValidationResult
from backend.controller.preprocessing import prepare_model_input
from backend.registry.registry_loader import get_by_id

logger = logging.getLogger(__name__)

class ExecutorError(Exception):
    pass


def _post_segmentation_with_retry(url: str, **kwargs) -> httpx.Response:
    """POST to a model deployment, tolerating bounded cold-start failures."""
    retryable_statuses = {408, 425, 429, 500, 502, 503, 504}
    retryable_errors = (
        httpx.TimeoutException,
        httpx.ConnectError,
        httpx.RemoteProtocolError,
        httpx.NetworkError,
    )
    deadline = time.monotonic() + settings.segmentation_request_timeout_s
    delay_s = 1.0
    attempts = 0
    last_error = "deployment unavailable"

    while True:
        attempts += 1
        remaining_s = deadline - time.monotonic()
        if remaining_s <= 0:
            raise ExecutorError(
                f"Segmentation deployment was not ready after {attempts - 1} attempts: {last_error}."
            )
        kwargs["timeout"] = min(settings.segmentation_attempt_timeout_s, remaining_s)
        for file_value in kwargs.get("files", {}).values():
            if isinstance(file_value, tuple) and hasattr(file_value[1], "seek"):
                file_value[1].seek(0)
        try:
            response = httpx.post(url, **kwargs)
            if response.status_code not in retryable_statuses:
                setattr(response, "satquery_attempts", attempts)
                return response
            last_error = f"HTTP {response.status_code}"
        except retryable_errors as exc:
            last_error = type(exc).__name__

        remaining_s = deadline - time.monotonic()
        sleep_s = min(delay_s, max(0.0, remaining_s))
        if sleep_s <= 0:
            raise ExecutorError(
                f"Segmentation deployment was not ready after {attempts} attempts: {last_error}."
            )
        logger.warning(
            "Segmentation deployment cold-start retry url=%s attempt=%d reason=%s wait=%.1fs",
            url, attempts, last_error, sleep_s,
        )
        time.sleep(sleep_s)
        delay_s = min(delay_s * 2.0, 10.0)


def _run_model_inference(
    tensor: np.ndarray,
    model_id: str,
    endpoint: str | None,
    contract: dict,
    classes: list,
    image_id: str | None = None,
    external_image_consent: bool = False,
) -> dict:
    """
    Run inference only through the configured deployed segmentation service.

    No heuristic or fabricated-mask fallback is permitted. If the deployment
    cannot produce a valid response, the pipeline fails explicitly.
    """
    modal_base = settings.satquery_segmentation_base_url.rstrip("/") if settings.satquery_segmentation_base_url else ""
    target_endpoint = endpoint
    is_modal = False
    headers = {}
    params = {}
    try:
        registered_model = get_by_id(model_id)
    except Exception:
        registered_model = None

    if modal_base and registered_model is not None:
        is_modal = True
        api_base = modal_base if modal_base.endswith("/v1") else f"{modal_base}/v1"
        channel_count = tensor.shape[1] if tensor.ndim == 4 else (tensor.shape[0] if tensor.ndim == 3 else 1)
        if "sar" in model_id.lower():
            target_endpoint = f"{api_base}/segment/sar"
        elif "multispectral" in model_id.lower() or channel_count > 3:
            target_endpoint = f"{api_base}/segment/multispectral"
        else:
            target_endpoint = f"{api_base}/segment/landcover"

        if settings.satquery_modal_proxy_key and settings.satquery_modal_proxy_secret:
            headers["Modal-Key"] = settings.satquery_modal_proxy_key
            headers["Modal-Secret"] = settings.satquery_modal_proxy_secret

        if settings.satquery_allow_unresolved_segmentation:
            params["allow_unresolved_metadata"] = "true"

    if not target_endpoint or not target_endpoint.startswith(("http://", "https://")):
        raise ExecutorError(
            f"No deployed endpoint is configured for segmentation model {model_id}."
        )

    if target_endpoint.startswith("http"):
        hostname = (urlparse(target_endpoint).hostname or "").lower()
        is_local = hostname in {"localhost", "127.0.0.1", "::1", "host.docker.internal"}
        registry_managed = bool(
            registered_model and registered_model.endpoint == target_endpoint
        )
        # SATQUERY_SEGMENTATION_BASE_URL denotes the application's managed
        # scientific backend. Model endpoints that were startup-validated from
        # the capability registry are also managed application infrastructure.
        # Only ad-hoc third-party endpoints require separate upload consent.
        if not is_local and not is_modal and not registry_managed and not external_image_consent:
            raise ExecutorError(
                f"Model service {model_id} is external; explicit image-upload consent is required."
            )
        try:
            artifact_files = list(Path("artifacts", image_id or "").glob("original.*"))
            if not artifact_files:
                raise ExecutorError(f"Original raster not found for {image_id}.")
            with artifact_files[0].open("rb") as raster_file:
                logger.info(
                    "Sending segmentation request for model %s (image %s) to %s",
                    model_id, image_id, target_endpoint
                )
                if is_modal:
                    resp = _post_segmentation_with_retry(
                        target_endpoint,
                        headers=headers,
                        params=params,
                        files={"file": (artifact_files[0].name, raster_file, "image/tiff")},
                    )
                else:
                    resp = _post_segmentation_with_retry(
                        target_endpoint,
                        data={"model_id": model_id, "classes": json.dumps(classes), "image_id": image_id or ""},
                        files={"file": (artifact_files[0].name, raster_file, "application/octet-stream")},
                    )

            if resp.status_code == 200:
                content_type = resp.headers.get("content-type", "")
                if "zip" in content_type or resp.content.startswith(b"PK\x03\x04"):
                    with zipfile.ZipFile(io.BytesIO(resp.content)) as z:
                        mask_bytes = z.read("mask.tif")
                        with rasterio.open(io.BytesIO(mask_bytes)) as src:
                            seg_mask = src.read(1)

                    masks = {}
                    scores = {}
                    # Map discrete multi-class segmentation mask to binary class masks
                    # LandCover class IDs: 1=Water, 2=Built-up, 3=Road, 4=Cropland/Ag, 5=Forest, 6=Bare Soil, 7=Low Veg
                    for cls in classes:
                        c_lower = cls.lower()
                        if "water" in c_lower or "flood" in c_lower:
                            binary_mask = (seg_mask == 1).astype(np.uint8)
                        elif "veg" in c_lower or "forest" in c_lower:
                            binary_mask = ((seg_mask == 5) | (seg_mask == 7)).astype(np.uint8)
                        elif "built" in c_lower or "urban" in c_lower or "building" in c_lower:
                            binary_mask = ((seg_mask == 2) | (seg_mask == 3)).astype(np.uint8)
                        elif "crop" in c_lower or "agri" in c_lower:
                            binary_mask = (seg_mask == 4).astype(np.uint8)
                        elif "soil" in c_lower or "bare" in c_lower:
                            binary_mask = (seg_mask == 6).astype(np.uint8)
                        else:
                            binary_mask = (seg_mask > 0).astype(np.uint8)

                        masks[cls] = binary_mask
                        scores[cls] = np.where(binary_mask == 1, 0.95, 0.0).astype(np.float32)

                    logger.info(
                        "Successfully received and parsed Modal segmentation for %s. Mask shape: %s",
                        model_id, seg_mask.shape
                    )
                    return {
                        "masks": masks,
                        "scores": scores,
                        "deployment": {
                            "provider": "managed" if (is_modal or registry_managed) else ("local" if is_local else "external"),
                            "endpoint": target_endpoint,
                            "model_id": model_id,
                            "attempts": getattr(resp, "satquery_attempts", 1),
                        },
                    }

                data = resp.json()
                if "masks" in data and "scores" in data:
                    result = {
                        "masks": {key: np.asarray(value, dtype=np.uint8) for key, value in data["masks"].items()},
                        "scores": {key: np.asarray(value, dtype=np.float32) for key, value in data["scores"].items()},
                        "deployment": {
                            "provider": "managed" if (is_modal or registry_managed) else ("local" if is_local else "external"),
                            "endpoint": target_endpoint,
                            "model_id": model_id,
                            "attempts": getattr(resp, "satquery_attempts", 1),
                        },
                    }
                    missing = [
                        cls for cls in classes
                        if cls not in result["masks"] or cls not in result["scores"]
                    ]
                    if missing:
                        raise ExecutorError(
                            f"Segmentation model {model_id} omitted requested classes: {missing}."
                        )
                    return result

            raise ExecutorError(
                f"Segmentation model {model_id} returned HTTP {resp.status_code}: "
                f"{resp.text[:300]}"
            )
        except ExecutorError:
            raise
        except Exception as e:
            raise ExecutorError(
                f"Deployed segmentation model {model_id} at {target_endpoint} failed: "
                f"{type(e).__name__}: {e}"
            ) from e

    raise ExecutorError(f"Segmentation model {model_id} did not execute.")


def _vlm_class_scoring(
    image_id: str | None,
    classes: list[str],
    model_id: str,
    tensor_shape: tuple,
) -> dict:
    """Explicitly prohibit an LLM/VLM from substituting for segmentation."""
    raise ExecutorError(
        f"Segmentation service {model_id} is unavailable. An LLM cannot be used "
        "to synthesize scientific masks; configure a real model endpoint."
    )


from backend.scientific_tools.quality import compute_valid_mask, detect_saturation, approximate_optical_cloud_shadow_mask, decode_quality_band
from backend.controller.ingestion import resolve_metadata
from backend.scientific_tools.raster_io import read_bands
def _stitch_tiles(batch_tensor: np.ndarray, tile_transforms: list, dtype=np.float32) -> np.ndarray:
    if batch_tensor.ndim == 2:
        return batch_tensor.astype(dtype)
    if not tile_transforms:
        return batch_tensor[0].astype(dtype)
        
    max_h = max(t["y_offset"] + t["orig_h"] for t in tile_transforms)
    max_w = max(t["x_offset"] + t["orig_w"] for t in tile_transforms)
    
    stitched = np.zeros((max_h, max_w), dtype=dtype)
    for i, t in enumerate(tile_transforms):
        y, x = t["y_offset"], t["x_offset"]
        oh, ow = t["orig_h"], t["orig_w"]
        stitched[y:y+oh, x:x+ow] = batch_tensor[i, :oh, :ow]
    return stitched

def run_single_image_workflow(plan: ExecutionPlan, validation: ValidationResult, external_image_consent: bool = False) -> Dict[str, Any]:
    if not validation.approved:
        raise ExecutorError("Cannot run workflow: Validation rejected the plan.")
        
    if not plan.images:
        raise ExecutorError("No images provided in ExecutionPlan.")
        
    image_id = plan.images[0]
    traces = []
    
    masks_out = {}
    scores_out = {}
    measurements_out = {}
    tool_outputs = {}
    
    # Compute valid mask for the entire image
    profile = resolve_metadata(image_id)
    artifact_dir = Path(f"./artifacts/{image_id}")
    files = list(artifact_dir.glob("original.*"))
    file_path = str(files[0])
    raw_raster = read_bands(file_path)
    
    saturation_mask = detect_saturation(raw_raster)
    quality_invalid = saturation_mask.copy()
    quality_method = "nodata_and_saturation"
    upper_bands = [band.upper() for band in profile.band_identities]
    qa_name = next((name for name in ("SCL", "QA_PIXEL") if name in upper_bands), None)
    if qa_name:
        decoded = decode_quality_band(raw_raster[upper_bands.index(qa_name)], qa_name)
        quality_invalid |= decoded["invalid_mask"]
        quality_method = decoded["method"]
    elif (profile.sensor_type or "").lower() != "sar" and profile.sensor_family not in {"sentinel-1", "risat"}:
        if raw_raster.shape[0] >= 3:
            try:
                from backend.controller.preprocessing import _find_band_index
                blue_idx = _find_band_index("B", profile.band_identities, profile.channels, profile.sensor_family)
                green_idx = _find_band_index("G", profile.band_identities, profile.channels, profile.sensor_family)
                red_idx = _find_band_index("R", profile.band_identities, profile.channels, profile.sensor_family)
                if None not in (blue_idx, green_idx, red_idx):
                    estimated = approximate_optical_cloud_shadow_mask(
                        raw_raster[blue_idx], raw_raster[green_idx], raw_raster[red_idx]
                    )
                    quality_invalid |= estimated["cloud_mask"] | estimated["shadow_mask"]
                    quality_method = estimated["method"]
            except Exception:
                pass
    valid_mask = compute_valid_mask(raw_raster, nodata_value=profile.nodata_value, cloud_mask=quality_invalid)
    valid_fraction = float(valid_mask.mean())
    if valid_fraction < float(os.getenv("QUALITY_MIN_VALID_FRACTION", "0.2")):
        raise ExecutorError(f"Quality gate failed for {image_id}: only {valid_fraction:.1%} of pixels are usable.")
    tool_outputs["quality_gate"] = {
        "valid_fraction": valid_fraction,
        "saturated_fraction": float(saturation_mask.mean()),
        "method": quality_method,
    }
    
    # Determine active models compatible with this image's modality
    from backend.controller.validator import _is_sar_profile
    is_sar_img = _is_sar_profile(profile)
    active_models = []
    for mid in plan.required_models:
        try:
            entry = get_by_id(mid)
            if is_sar_img and entry.modality == "sar":
                active_models.append(mid)
            elif (not is_sar_img) and entry.modality in ("optical", "optical_rgb"):
                active_models.append(mid)
            elif entry.modality not in ("sar", "optical", "optical_rgb"):
                active_models.append(mid)
        except Exception:
            pass

    if not active_models:
        raise ExecutorError(
            f"Validated plan has no compatible deployed segmentation model for image {image_id}."
        )

    for model_id in active_models:
        start_t = time.time()
        
        try:
            prep_res = prepare_model_input(image_id, model_id)
        except Exception as e:
            raise ExecutorError(f"Preprocessing for model {model_id} failed: {e}") from e

        tensor = prep_res["tensor_or_path"]
        tile_transforms = prep_res["tile_transforms"]
        
        entry = get_by_id(model_id)
        endpoint = entry.endpoint
        contract = entry.input_contract
        classes = [value for value in plan.target_classes if value in (entry.classes or [])]
        if not classes:
            raise ExecutorError(
                f"Model {model_id} supports none of the requested target classes {plan.target_classes}."
            )
        
        try:
            result = _run_model_inference(
                tensor=tensor,
                model_id=model_id,
                endpoint=endpoint,
                contract=contract,
                classes=classes,
                image_id=image_id,
                external_image_consent=external_image_consent,
            )
        except Exception as e:
            raise ExecutorError(f"Model service {model_id} failed: {e}")
            
        dur = time.time() - start_t
        traces.append({
            "step": "model_inference",
            "model_id": model_id,
            "duration_s": dur,
            "status": "success",
            "deployment": result["deployment"],
        })
        
        for cls, mask in result["masks"].items():
            # Stitch tiles
            stitched_mask = _stitch_tiles(mask, tile_transforms, dtype=np.uint8)
            stitched_score = _stitch_tiles(result["scores"][cls], tile_transforms, dtype=np.float32)
            
            # Apply valid mask
            stitched_mask &= valid_mask
            stitched_score[~valid_mask] = 0.0
            
            masks_out[f"{model_id}_{cls}"] = stitched_mask
            scores_out[f"{model_id}_{cls}"] = stitched_score
            
    # Process optional tools
    for tool_call in plan.optional_tools:
        if tool_call.startswith("compute_spectral_index:"):
            index_name = tool_call.split(":")[1].upper()
            start_t = time.time()

            try:
                from backend.controller.preprocessing import _find_band_index, IncompatibleInputError
                from backend.scientific_tools.indices import (
                    compute_ndvi, compute_ndwi, compute_mndwi, compute_ndbi,
                )

                def _get_band(logical_name: str) -> np.ndarray:
                    """
                    Resolve a logical band name (R, G, NIR, SWIR1 …) to the
                    correct array from the already-loaded full raster, using the
                    same alias table that preprocessing uses.  Works correctly
                    for plain RGB files, 4-band RGBN, and Sentinel-2 13-band files
                    where band_identities is ["B1","B2",…,"B12"].
                    """
                    idx = _find_band_index(logical_name, profile.band_identities, profile.channels, profile.sensor_family)
                    if idx is None:
                        raise IncompatibleInputError(
                            f"Band '{logical_name}' required by {index_name} is not present "
                            f"in image {image_id} (bands: {profile.band_identities})."
                        )
                    return raw_raster[idx].astype(np.float32)

                if index_name == "NDVI":
                    # NDVI = (NIR - Red) / (NIR + Red)
                    result = compute_ndvi(nir=_get_band("NIR"), red=_get_band("R"))

                elif index_name == "NDWI":
                    # NDWI = (Green - NIR) / (Green + NIR)  [McFeeters 1996]
                    result = compute_ndwi(green=_get_band("G"), nir=_get_band("NIR"))

                elif index_name == "MNDWI":
                    # MNDWI = (Green - SWIR1) / (Green + SWIR1)  [Xu 2006]
                    # Requires Sentinel-2 B11 or equivalent SWIR1 band.
                    result = compute_mndwi(green=_get_band("G"), swir1=_get_band("SWIR1"))

                elif index_name == "NDBI":
                    # NDBI = (SWIR1 - NIR) / (SWIR1 + NIR)  — built-up index
                    result = compute_ndbi(swir1=_get_band("SWIR1"), nir=_get_band("NIR"))
                else:
                    raise ValueError(
                        f"Unsupported spectral index: {index_name}. "
                        f"Supported: NDVI, NDWI, MNDWI, NDBI."
                    )

                # Mask nodata / out-of-bounds pixels
                result[~valid_mask] = np.nan
                tool_outputs[index_name] = result

                dur = time.time() - start_t
                traces.append({
                    "step": "tool_execution",
                    "tool": tool_call,
                    "duration_s": dur,
                    "status": "success",
                })

            except (IncompatibleInputError, ValueError) as e:
                traces.append({
                    "step": "tool_execution",
                    "tool": tool_call,
                    "duration_s": time.time() - start_t,
                    "status": "failed",
                    "reason": str(e),
                })
            
    # ── Pixel-fraction measurements (always available, even without CRS) ─────
    # When pixel_spacing_m is absent (e.g. plain JPEG/PNG), we cannot compute
    # area in hectares, but we CAN produce percentage coverage claims.
    # These are real measurements the VLM can cite and the verifier can check.
    total_valid_pixels = int(valid_mask.sum())
    has_geo_measurements = bool(measurements_out)

    if total_valid_pixels > 0:
        for mask_key, mask_arr in masks_out.items():
            # Preserve compound classes such as built_up and bare_soil.
            cls_name = next(
                (cls for cls in sorted(plan.target_classes, key=len, reverse=True) if mask_key.endswith(f"_{cls}")),
                mask_key,
            )
            covered = int((mask_arr.astype(bool) & valid_mask).sum())
            pct = round((covered / total_valid_pixels) * 100.0, 1)

            # Only emit if coverage > 1% (avoids noise claims)
            if pct > 1.0:
                meas_key = f"coverage_{cls_name}"
                if meas_key not in measurements_out:
                    measurements_out[meas_key] = {
                        "measurement": pct,
                        "claim": f"{cls_name} pixel coverage",
                        "unit": "percent",
                        "tool": "geometry.pixel_fraction",
                        "confidence": 0.82,
                        "pixel_count": covered,
                        "total_pixels": total_valid_pixels,
                    }

                if "area_estimate" in plan.requested_outputs and profile.pixel_spacing_m and profile.crs:
                    from backend.scientific_tools.geometry import measure_regions
                    area = measure_regions(mask_arr, profile.pixel_spacing_m, profile.crs, profile.transform)
                    measurements_out[f"area_{cls_name}"] = {
                        **area,
                        "unit": "ha",
                    }

    # Note in traces whether geo-calibrated or pixel-fraction
    has_geo_measurements = any(
        isinstance(value, dict) and value.get("unit") == "ha"
        for value in measurements_out.values()
    )
    if not has_geo_measurements and measurements_out:
        traces.append({
            "step": "pixel_fraction_measurement",
            "note": "No CRS/pixel_spacing — measurements are % pixel coverage, not ha",
            "duration_s": 0.0,
            "status": "success",
        })

    return {
        "masks": masks_out,
        "scores": scores_out,
        "measurements": measurements_out,
        "tool_outputs": tool_outputs,
        "traces": traces
    }

def run_temporal_workflow(plan: ExecutionPlan, validation: ValidationResult, external_image_consent: bool = False) -> Dict[str, Any]:
    if not validation.approved:
        raise ExecutorError("Cannot run workflow: Validation rejected the plan.")
        
    if len(plan.images) < 2:
        raise ExecutorError("Temporal workflow requires at least 2 images.")
        
    image_t1 = plan.images[0]
    image_t2 = plan.images[1]
    
    plan_t1 = plan.model_copy(update={"images": [image_t1]})
    plan_t2 = plan.model_copy(update={"images": [image_t2]})
    
    res_t1 = run_single_image_workflow(plan_t1, validation, external_image_consent)
    res_t2 = run_single_image_workflow(plan_t2, validation, external_image_consent)
    
    masks_out = {}
    scores_out = {}
    measurements_out = {}
    tool_outputs = {}
    
    profile_t1 = resolve_metadata(image_t1)
    profile_t2 = resolve_metadata(image_t2)
    
    def _resolve_artifact(image_id: str) -> str:
        matches = list(Path(f"./artifacts/{image_id}").glob("original.*"))
        if not matches:
            raise FileNotFoundError(f"Artifact for image {image_id} not found.")
        return str(matches[0])
        
    rt1 = read_bands(_resolve_artifact(image_t1))
    rt2 = read_bands(_resolve_artifact(image_t2))
    from backend.scientific_tools.alignment import check_pair_compatibility, align_to_reference
    temporal_alignment = check_pair_compatibility(profile_t1, profile_t2)
    alignment_required = not temporal_alignment["grid_match"] or not temporal_alignment["crs_match"] or rt1.shape[-2:] != rt2.shape[-2:]
    if alignment_required:
        rt2 = align_to_reference(rt2, profile_t2, profile_t1)["array"]
    
    vm_t1 = compute_valid_mask(rt1, nodata_value=profile_t1.nodata_value)
    vm_t2 = compute_valid_mask(rt2, nodata_value=profile_t2.nodata_value)
    shared_valid_mask = vm_t1 & vm_t2
    
    from backend.scientific_tools.compare import compare_dates
    
    for cls in plan.target_classes:
        mask_t1 = None
        mask_t2 = None
        for key in res_t1["masks"]:
            if key.endswith(f"_{cls}"):
                mask_t1 = res_t1["masks"][key]
                mask_t2 = res_t2["masks"][key]
                break
                
        if mask_t1 is not None and mask_t2 is not None:
            if alignment_required:
                mask_t2 = align_to_reference(mask_t2, profile_t2, profile_t1, categorical=True)["array"]
            comp = compare_dates(mask_t1, mask_t2, shared_valid_mask)
            masks_out[f"gain_{cls}"] = comp["gain"]
            masks_out[f"loss_{cls}"] = comp["loss"]
            masks_out[f"net_change_{cls}"] = comp["net_change"]
            
    if "area_estimate" in plan.requested_outputs:
        is_restricted = any("area_estimation" in r for r in validation.restrictions)
        if not is_restricted and profile_t1.pixel_spacing_m and profile_t1.crs:
            from backend.scientific_tools.geometry import measure_regions
            for cls in plan.target_classes:
                if f"gain_{cls}" in masks_out:
                    measurements_out[f"gain_{cls}_area"] = measure_regions(
                        masks_out[f"gain_{cls}"],
                        pixel_spacing_m=profile_t1.pixel_spacing_m,
                        crs=profile_t1.crs,
                        transform=profile_t1.transform,
                    )
                if f"loss_{cls}" in masks_out:
                    measurements_out[f"loss_{cls}_area"] = measure_regions(
                        masks_out[f"loss_{cls}"],
                        pixel_spacing_m=profile_t1.pixel_spacing_m,
                        crs=profile_t1.crs,
                        transform=profile_t1.transform,
                    )
    
    return {
        "masks": masks_out,
        "scores": scores_out,
        "measurements": measurements_out,
        "tool_outputs": tool_outputs,
        "traces": res_t1["traces"] + res_t2["traces"]
    }

def run_crossmodal_workflow(plan: ExecutionPlan, validation: ValidationResult, external_image_consent: bool = False) -> Dict[str, Any]:
    if not validation.approved:
        raise ExecutorError("Cannot run workflow: Validation rejected the plan.")
        
    if len(plan.images) < 2:
        raise ExecutorError("Cross-modal workflow requires at least 2 images.")
        
    from backend.controller.validator import _is_sar_profile, _is_optical_profile
    p0 = resolve_metadata(plan.images[0])
    p1 = resolve_metadata(plan.images[1])
    
    if _is_sar_profile(p0) and _is_optical_profile(p1):
        image_sar = plan.images[0]
        image_opt = plan.images[1]
    elif _is_optical_profile(p0) and _is_sar_profile(p1):
        image_opt = plan.images[0]
        image_sar = plan.images[1]
    elif _is_sar_profile(p0):
        image_sar = plan.images[0]
        image_opt = plan.images[1]
    else:
        image_opt = plan.images[0]
        image_sar = plan.images[1]
        
    model_opt = None
    model_sar = None
    for mid in plan.required_models:
        entry = get_by_id(mid)
        if entry.modality in ["optical", "optical_rgb"]:
            model_opt = entry
        elif entry.modality == "sar":
            model_sar = entry
            
    if not model_opt or not model_sar:
        raise ExecutorError("Cross-modal workflow requires one optical and one SAR model.")
        
    shared_classes = list(set(model_opt.classes) & set(model_sar.classes))
    target_classes = [c for c in plan.target_classes if c in shared_classes]
    
    dropped_classes = set(plan.target_classes) - set(target_classes)
    if dropped_classes:
        validation.restrictions.append(f"Dropped classes not supported by both models: {', '.join(dropped_classes)}")
        
    plan_opt = plan.model_copy(update={"images": [image_opt], "required_models": [model_opt.id], "target_classes": target_classes})
    plan_sar = plan.model_copy(update={"images": [image_sar], "required_models": [model_sar.id], "target_classes": target_classes})
    
    res_opt = run_single_image_workflow(plan_opt, validation, external_image_consent)
    res_sar = run_single_image_workflow(plan_sar, validation, external_image_consent)
    
    masks_out = {}
    scores_out = {}
    measurements_out = {}
    tool_outputs = {}
    
    from backend.scientific_tools.reliability import estimate_optical_reliability, estimate_sar_reliability
    from backend.scientific_tools.fuse import fuse_evidence
    
    def _resolve_artifact(image_id: str) -> str:
        matches = list(Path(f"./artifacts/{image_id}").glob("original.*"))
        if not matches:
            raise FileNotFoundError(f"Artifact for image {image_id} not found.")
        return str(matches[0])
        
    rt_opt = read_bands(_resolve_artifact(image_opt))
    rt_sar = read_bands(_resolve_artifact(image_sar))
    
    q_opt = estimate_optical_reliability(rt_opt, cloud_mask=None)
    q_sar = estimate_sar_reliability(rt_sar, layover_shadow_mask=None)
    from backend.scientific_tools.alignment import check_pair_compatibility, align_to_reference
    crossmodal_alignment = check_pair_compatibility(p0, p1)
    crossmodal_alignment_required = (
        not crossmodal_alignment["grid_match"]
        or not crossmodal_alignment["crs_match"]
        or q_opt.shape != q_sar.shape
    )
    if crossmodal_alignment_required:
        q_sar = align_to_reference(q_sar, resolve_metadata(image_sar), resolve_metadata(image_opt))["array"]
    
    for cls in target_classes:
        p_opt = res_opt["scores"].get(f"{model_opt.id}_{cls}")
        p_sar = res_sar["scores"].get(f"{model_sar.id}_{cls}")
        
        if p_opt is not None and p_sar is not None:
            if crossmodal_alignment_required or p_opt.shape != p_sar.shape:
                p_sar = align_to_reference(p_sar, resolve_metadata(image_sar), resolve_metadata(image_opt))["array"]
            fusion = fuse_evidence(p_opt, q_opt, p_sar, q_sar)
            
            fused_p = fusion["fused_probability"]
            scores_out[f"fused_{cls}"] = fused_p
            
            # Mark zero-reliability regions as unknown
            unknown_mask = fusion["unknown_mask"]
            masks_out[f"unknown_{cls}"] = unknown_mask.astype(np.uint8)
            
            # The mask for the class itself avoids guessing on unknown pixels
            masks_out[f"fused_{cls}"] = ((fused_p > 0.5) & ~unknown_mask).astype(np.uint8)
            
    return {
        "masks": masks_out,
        "scores": scores_out,
        "measurements": measurements_out,
        "tool_outputs": tool_outputs,
        "traces": res_opt["traces"] + res_sar["traces"]
    }
