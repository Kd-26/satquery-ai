import os
import json
import hashlib
import importlib.metadata
from pathlib import Path
from datetime import datetime
from typing import Any, Dict, List

try:
    import pystac
except ImportError:
    pystac = None

def register_stac_item(image_id_or_run_id: str, asset_type: str, file_path: str, properties: Dict[str, Any]) -> None:
    stac_dir = Path("./artifacts/stac_catalog")
    stac_dir.mkdir(parents=True, exist_ok=True)
    
    item_id = f"{image_id_or_run_id}_{asset_type}"
    
    if pystac:
        item = pystac.Item(
            id=item_id,
            geometry=properties.get("geometry", None),
            bbox=properties.get("bbox", None),
            datetime=datetime.utcnow(),
            properties=properties
        )
        item.add_asset(
            key=asset_type,
            asset=pystac.Asset(href=file_path)
        )
        item_path = stac_dir / f"{item_id}.json"
        with open(item_path, "w") as f:
            f.write(json.dumps(item.to_dict()))
    else:
        # Fallback if pystac is missing
        item_path = stac_dir / f"{item_id}.json"
        with open(item_path, "w") as f:
            json.dump({
                "stac_version": "1.0.0",
                "id": item_id,
                "type": "Feature",
                "properties": properties,
                "assets": {asset_type: {"href": file_path}}
            }, f)

def write_run_manifest(run_id: str, plan: Any, evidence: Any, profiles: List[Any]) -> None:
    manifest_path = Path(f"./artifacts/{run_id}/run_manifest.json")
    manifest_path.parent.mkdir(parents=True, exist_ok=True)
    
    checksums = {}
    for img_id in plan.images:
        path = Path(f"./artifacts/{img_id}")
        if path.exists() and path.is_file():
            with open(path, "rb") as f:
                checksums[img_id] = hashlib.sha256(f.read()).hexdigest()
        else:
            checksums[img_id] = hashlib.sha256(img_id.encode()).hexdigest()
            
    pkgs = ['numpy', 'rasterio', 'fastapi', 'pydantic', 'geoalchemy2', 'sqlmodel']
    versions = {}
    for pkg in pkgs:
        try:
            versions[pkg] = importlib.metadata.version(pkg)
        except Exception:
            versions[pkg] = "unknown"
            
    manifest = {
        "run_id": run_id,
        "input_checksums": checksums,
        "sensor_bands": [getattr(p, 'band_identities', []) for p in profiles],
        "crs": [getattr(p, 'crs', 'unknown') for p in profiles],
        "pixel_resolution_m": [getattr(p, 'pixel_spacing_m', 0.0) for p in profiles],
        "model_versions": evidence.model_versions,
        "software_versions": versions,
        "tool_formulas_used": [],
        "user_corrections": []
    }
    
    with open(manifest_path, "w") as f:
        json.dump(manifest, f, indent=2)
