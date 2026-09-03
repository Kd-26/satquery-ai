import os
import yaml
from pathlib import Path
from backend.schemas.registry_entry import RegistryEntry

class RegistryEntryNotFoundError(Exception):
    pass

REGISTRY_DIR = Path(__file__).parent

def _load_dir(subdir: str) -> list[RegistryEntry]:
    entries = []
    dir_path = REGISTRY_DIR / subdir
    if not dir_path.exists():
        return entries
    
    for file_path in dir_path.glob("*.yaml"):
        with open(file_path, "r") as f:
            data = yaml.safe_load(f)
            try:
                entry = RegistryEntry.model_validate(data)
                entries.append(entry)
            except Exception as e:
                raise ValueError(f"Failed to validate {file_path.name}: {e}")
    return entries

def load_all_models() -> list[RegistryEntry]:
    return _load_dir("models")

def load_all_adapters() -> list[RegistryEntry]:
    return _load_dir("adapters")

def load_all_tools() -> list[RegistryEntry]:
    return _load_dir("tools")

_ALL_ENTRIES = []
try:
    _ALL_ENTRIES.extend(load_all_models())
    _ALL_ENTRIES.extend(load_all_adapters())
    _ALL_ENTRIES.extend(load_all_tools())
except ValueError as e:
    raise ImportError(f"Registry validation failed during startup: {e}")

def get_by_id(entry_id: str) -> RegistryEntry:
    for entry in _ALL_ENTRIES:
        if entry.id == entry_id:
            return entry
    raise RegistryEntryNotFoundError(f"Entry {entry_id} not found in registry.")

def query(modality: str | None = None, task: str | None = None, type: str | None = None) -> list[RegistryEntry]:
    results = []
    for entry in _ALL_ENTRIES:
        if modality and entry.modality != modality:
            continue
        if type and entry.type != type:
            continue
        if task and entry.task != task:
            continue
        results.append(entry)
    return results
