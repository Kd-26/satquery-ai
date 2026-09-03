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
