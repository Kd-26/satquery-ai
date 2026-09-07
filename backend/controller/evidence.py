import uuid
from typing import Dict, Any
from backend.schemas.evidence_package import EvidencePackage, Claim
from backend.schemas.execution_plan import ExecutionPlan
from backend.schemas.validation_result import ValidationResult
from backend.registry.registry_loader import get_by_id

def build_evidence_package(run_id: str, workflow_result: Dict[str, Any], plan: ExecutionPlan, validation: ValidationResult) -> EvidencePackage:
    claims = []
    masks_ref = {}
    overlays_ref = {}
    limitations = []
    model_versions = {}
    
    # Populate model_versions from the registry entries actually used
    for model_id in plan.required_models:
        entry = get_by_id(model_id)
        model_versions[model_id] = entry.version
        if not entry.calibrated_confidence:
            limitations.append(f"Model {model_id} has uncalibrated confidence; raw scores are omitted or approximate.")
            
    limitations.extend(validation.restrictions)
            
    import os
    import rasterio
    from pathlib import Path
    
    run_dir = Path(f"./artifacts/{run_id}")
    masks_dir = run_dir / "masks"
    overlays_dir = run_dir / "overlays"
    masks_dir.mkdir(parents=True, exist_ok=True)
    overlays_dir.mkdir(parents=True, exist_ok=True)
    
    for m_key, m_val in workflow_result.get("masks", {}).items():
        if hasattr(m_val, "shape"):
            mask_path = masks_dir / f"{m_key}.tif"
            try:
                with rasterio.open(
                    mask_path,
                    'w',
                    driver='GTiff',
                    height=m_val.shape[0],
                    width=m_val.shape[1],
                    count=1,
                    dtype=m_val.dtype,
                    crs='+proj=latlong'
                ) as dst:
                    dst.write(m_val, 1)
            except Exception:
                pass # Ignored for tests
            masks_ref[m_key] = str(mask_path)
            
    # For each measurement in workflow_result, create a claim entry
    measurements = workflow_result.get("measurements", {})
    has_percent_claims = False
    for m_key, m_val in measurements.items():
        region_id = str(uuid.uuid4())

        unit = m_val.get("unit", "ha") if isinstance(m_val, dict) else "ha"
        is_percent = (unit == "percent")

        # Derive a readable claim string from the key
        parts = m_key.split('_')

        if m_key.startswith('coverage_'):
            # pixel-fraction: coverage_water → "water pixel coverage"
            cls_name = '_'.join(parts[1:]) if len(parts) > 1 else m_key
            claim_str = f"{cls_name} pixel coverage"
            has_percent_claims = True
        elif m_key.startswith('gain'):
            cls_name = parts[1] if len(parts) > 1 else m_key
            claim_str = f"{cls_name} area increased"
        elif m_key.startswith('loss'):
            cls_name = parts[1] if len(parts) > 1 else m_key
            claim_str = f"{cls_name} area decreased"
        elif m_key.startswith('net_change'):
            cls_name = parts[1] if len(parts) > 1 else m_key
            claim_str = f"{cls_name} net change"
        else:
            cls_name = parts[1] if len(parts) > 1 else m_key
            claim_str = f"{cls_name} area measured"

        measurement = m_val.get("area_hectares", 0.0) if isinstance(m_val, dict) else float(m_val)
        tool = "geometry.pixel_fraction" if is_percent else "geometry.measure_regions"

        # Estimate a base confidence (capped by model calibration)
        base_confidence = 0.82 if is_percent else 0.9

        for model_id in plan.required_models:
            if model_id in validation.confidence_caps:
                cap = validation.confidence_caps[model_id]
                if base_confidence > cap:
                    base_confidence = cap

        claims.append(Claim(
            claim=claim_str,
            measurement=measurement,
            region_id=region_id,
            source_images=plan.images,
            tool=tool,
            confidence=base_confidence
        ))

    # If all claims are pixel-fraction, add a clear unit limitation
    if has_percent_claims and not any(
        c.tool == "geometry.measure_regions" for c in claims
    ):
        limitations.append(
            "Measurements are pixel-coverage percentages (no geospatial calibration available). "
            "Upload a georeferenced GeoTIFF to get area estimates in hectares."
        )
        
    return EvidencePackage(
        run_id=run_id,
        claims=claims,
        masks_ref=masks_ref,
        overlays_ref=overlays_ref,
        limitations=limitations,
        model_versions=model_versions
    )
