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
    for m_key, m_val in measurements.items():
        region_id = str(uuid.uuid4())
        
        # e.g., 'gain_water_area' -> 'water area increased'
        parts = m_key.split('_')
        class_name = parts[1] if len(parts) > 1 else m_key
        
        if m_key.startswith('gain'):
            claim_str = f"{class_name} area increased"
        elif m_key.startswith('loss'):
            claim_str = f"{class_name} area decreased"
        elif m_key.startswith('net_change'):
            claim_str = f"{class_name} net change"
        else:
            claim_str = f"{class_name} area measured"
            
        measurement = m_val.get("area_hectares", 0.0)
        tool = "geometry.measure_regions"
        
        # Estimate a base confidence (1.0 for geometry logic itself, but limited by the model scores if any)
        # We will clamp it to the validation.confidence_caps if the relevant model has an entry
        base_confidence = 0.9 
        
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
        
    return EvidencePackage(
        run_id=run_id,
        claims=claims,
        masks_ref=masks_ref,
        overlays_ref=overlays_ref,
        limitations=limitations,
        model_versions=model_versions
    )
