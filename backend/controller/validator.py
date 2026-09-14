from backend.schemas.execution_plan import ExecutionPlan
from backend.schemas.input_profile import InputProfile
from backend.schemas.validation_result import ValidationResult
from backend.registry import registry_loader

# Sensor-family → superset of logical band concepts it covers.
# Used to allow band-check compatibility between scientific satellite band
# identities (e.g. B1..B12 for Sentinel-2) and model input contracts that
# use generic logical names (e.g. ["R","G","B"]).
# Architecture rule: band identity is *verified*, never assumed. These
# mappings are grounded in the sensor's published band specifications.
_SENSOR_BAND_SUPERSET: dict[str, set[str]] = {
    # Sentinel-2: B4=R, B3=G, B2=B, B8=NIR, B11=SWIR1, B12=SWIR2, etc.
    "sentinel-2": {
        "R", "G", "B", "NIR", "SWIR1", "SWIR2",
        "B1", "B2", "B3", "B4", "B5", "B6", "B7",
        "B8", "B8A", "B9", "B10", "B11", "B12",
    },
    # Sentinel-1: radar polarisations
    "sentinel-1": {"VV", "VH"},
    "landsat-8": {"R", "G", "B", "NIR", "SWIR1", "SWIR2", "B1", "B2", "B3", "B4", "B5", "B6", "B7", "B8", "B9", "B10", "B11"},
    "landsat-9": {"R", "G", "B", "NIR", "SWIR1", "SWIR2", "B1", "B2", "B3", "B4", "B5", "B6", "B7", "B8", "B9", "B10", "B11"},
    # Cartosat-2S: panchromatic / optical RGB
    "cartosat-2s": {"R", "G", "B"},
}


def _is_sar_profile(p: InputProfile) -> bool:
    fam = (p.sensor_family or "").lower()
    stype = (p.sensor_type or "").lower()
    return fam in ("sentinel-1", "risat") or stype == "sar" or any(b in ("VV", "VH") for b in p.band_identities)


def _is_optical_profile(p: InputProfile) -> bool:
    return not _is_sar_profile(p)


def _get_target_profiles(plan_workflow: str, model_modality: str, profiles: list[InputProfile]) -> list[InputProfile]:
    if plan_workflow == "crossmodal":
        if model_modality == "sar":
            return [p for p in profiles if _is_sar_profile(p)]
        elif model_modality in ("optical", "optical_rgb"):
            return [p for p in profiles if _is_optical_profile(p)]
        return profiles
    elif plan_workflow == "single":
        return [profiles[0]] if profiles else []
    else:
        # temporal or other multi-image workflow
        return profiles


def validate_plan(plan: ExecutionPlan, profiles: list[InputProfile]) -> ValidationResult:
    approved = True
    restrictions = []
    errors = []
    confidence_caps = {}
    RESOLUTION_FACTOR = 5.0

    # Any mask-producing route must name at least one real registered
    # segmentation model. Execution is never allowed to fabricate or infer a
    # local substitute when the deployed specialist is unavailable.
    if "masks" in plan.requested_outputs and not plan.required_models:
        approved = False
        errors.append("Mask output requires at least one registered segmentation model.")

    # 1. Workflow-level integrity checks
    if plan.workflow == "single":
        if len(profiles) < 1:
            approved = False
            errors.append("Single image workflow requires at least 1 image.")
    elif plan.workflow == "temporal":
        if len(profiles) < 2:
            approved = False
            errors.append(
                f"Temporal workflow requires at least 2 images (before and after), but only {len(profiles)} provided."
            )
        else:
            p0_sar = _is_sar_profile(profiles[0])
            p1_sar = _is_sar_profile(profiles[1])
            if p0_sar != p1_sar:
                approved = False
                errors.append(
                    "Temporal workflow requires images of the same modality (both Optical or both SAR). "
                    "For an Optical and SAR pair, use 'crossmodal' workflow."
                )
            else:
                from backend.scientific_tools.alignment import check_pair_compatibility
                align_res = check_pair_compatibility(profiles[0], profiles[1])
                if not align_res.get("bounding_box_overlap") or (not align_res.get("crs_match") and not align_res.get("reprojectable")):
                    approved = False
                    errors.append("Temporal workflow selected but image pair has no compatible CRS/bounding-box overlap.")
                elif not align_res.get("grid_match"):
                    restrictions.append("Temporal grids differ; the second raster will be reprojected and resampled to the reference grid.")
    elif plan.workflow == "crossmodal":
        if len(profiles) < 2:
            approved = False
            errors.append(
                f"Cross-modal workflow requires at least 2 images (one Optical and one SAR), but only {len(profiles)} provided."
            )
        else:
            has_sar = any(_is_sar_profile(p) for p in profiles)
            has_opt = any(_is_optical_profile(p) for p in profiles)
            if not (has_sar and has_opt):
                approved = False
                errors.append("Cross-modal workflow requires at least one Optical image and one SAR image.")
            from backend.scientific_tools.alignment import check_pair_compatibility
            align_res = check_pair_compatibility(profiles[0], profiles[1])
            if not align_res.get("bounding_box_overlap") or (not align_res.get("crs_match") and not align_res.get("reprojectable")):
                approved = False
                errors.append("Cross-modal workflow selected but image pair has no compatible CRS/bounding-box overlap.")
            elif not align_res.get("grid_match"):
                restrictions.append("Cross-modal grids differ; inputs require alignment before fusion.")

        # Cross-modal requires at least one optical model and one SAR model
        has_opt_model = False
        has_sar_model = False
        for mid in plan.required_models:
            try:
                m = registry_loader.get_by_id(mid)
                if m.modality in ("optical", "optical_rgb"):
                    has_opt_model = True
                elif m.modality == "sar":
                    has_sar_model = True
            except Exception:
                pass
        if not (has_opt_model and has_sar_model):
            approved = False
            errors.append(
                "Cross-modal workflow requires one optical model (e.g. SEG_RGB_v1) and one SAR model (e.g. SEG_SAR_VV_VH_v1)."
            )

    # 2. Check every model_id in plan.required_models
    for model_id in plan.required_models:
        try:
            model = registry_loader.get_by_id(model_id)
        except registry_loader.RegistryEntryNotFoundError:
            approved = False
            errors.append(f"Model {model_id} not found in registry.")
            continue

        if "masks" in plan.requested_outputs and model.type != "segmentation":
            approved = False
            errors.append(
                f"Model {model_id} cannot produce masks (registry type={model.type}); "
                "a segmentation model is required."
            )

        unsupported_classes = [
            value for value in plan.target_classes
            if model.classes is not None and value not in model.classes
        ]
        if unsupported_classes:
            approved = False
            errors.append(
                f"Model {model_id} does not support target classes {unsupported_classes}."
            )

        target_profiles = _get_target_profiles(plan.workflow, getattr(model, "modality", ""), profiles)
        if not target_profiles and plan.workflow == "crossmodal":
            approved = False
            errors.append(f"Model {model_id} (modality={model.modality}) has no matching image profile.")
            continue

        # Approximate band identity can bridge incomplete metadata, but it
        # must never bridge a physically incompatible sensing modality.
        for profile in target_profiles:
            if model.modality == "sar" and not _is_sar_profile(profile):
                approved = False
                errors.append(f"Model {model_id} is missing a compatible SAR input; {profile.image_id} is optical.")
            elif model.modality in ("optical", "optical_rgb") and _is_sar_profile(profile):
                approved = False
                errors.append(f"Model {model_id} is missing a compatible optical input; {profile.image_id} is SAR.")

        # Check band compatibility against target profiles
        req_bands = model.input_contract.get("bands") or model.input_contract.get("polarization_order")
        if req_bands:
            for profile in target_profiles:
                profile_bands = set(profile.band_identities)
                sensor_superset = _SENSOR_BAND_SUPERSET.get(
                    (profile.sensor_family or "").lower(), set()
                )
                effective_bands = profile_bands | sensor_superset
                missing_bands = [b for b in req_bands if b not in effective_bands]
                if missing_bands:
                    restrictions.append(
                        f"Model {model_id} requires bands {req_bands}, but profile "
                        f"{profile.image_id} (sensor={profile.sensor_family}) "
                        f"has unverified {missing_bands}; approximate channel mapping will be used."
                    )
                    confidence_caps[model_id] = min(confidence_caps.get(model_id, 1.0), 0.5)

        # Check resolution and sensor-family domain-shift
        for profile in target_profiles:
            if model.resolution_range_m and profile.pixel_spacing_m:
                min_res, max_res = model.resolution_range_m[0], model.resolution_range_m[1]
                px = profile.pixel_spacing_m

                if px < min_res / RESOLUTION_FACTOR or px > max_res * RESOLUTION_FACTOR:
                    approved = False
                    errors.append(f"Model {model_id} resolution range [{min_res}, {max_res}]m is strictly incompatible with {px}m.")
                elif px < min_res or px > max_res:
                    restrictions.append(
                        f"Model {model_id} resolution mismatch: trained for [{min_res}, {max_res}]m, "
                        f"input is {px}m. Treating outputs as extrapolated."
                    )
                    confidence_caps[model_id] = 0.5

            if profile.sensor_family == "unknown":
                restrictions.append(f"Sensor family unverified for {profile.image_id} - domain-shift risk cannot be assessed.")
            elif model.known_domain_shift_sensors:
                known_sensors_lower = [s.lower() for s in model.known_domain_shift_sensors]
                if (profile.sensor_family or "").lower() in known_sensors_lower:
                    restrictions.append(f"Model {model_id} sensor domain-shift risk: running on {profile.sensor_family}.")
                    confidence_caps[model_id] = 0.5

    # 3. Check area_estimate restriction logic
    if "area_estimate" in plan.requested_outputs:
        for profile in profiles:
            for restriction in profile.capability_restrictions:
                if "area_estimation" in restriction:
                    restrictions.append(f"area_estimate disabled for {profile.image_id}: {restriction}")

    # 4. Check final_adapter existence
    if plan.final_adapter:
        try:
            registry_loader.get_by_id(plan.final_adapter)
        except registry_loader.RegistryEntryNotFoundError:
            approved = False
            errors.append(f"Adapter {plan.final_adapter} not found in registry.")

    return ValidationResult(
        approved=approved,
        restrictions=restrictions,
        errors=errors,
        confidence_caps=confidence_caps,
    )
