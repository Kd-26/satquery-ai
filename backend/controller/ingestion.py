import os
import uuid
import rasterio
from pathlib import Path

class UnsupportedFormatError(Exception):
    pass

class CorruptFileError(Exception):
    pass

class FileTooLargeError(Exception):
    pass

MAX_FILE_SIZE_BYTES = 500 * 1024 * 1024  # 500 MB limit

def validate_file(path: str) -> None:
    ext = Path(path).suffix.lower().lstrip('.')
    if ext not in {'tif', 'tiff', 'png', 'jpg', 'jpeg'}:
        raise UnsupportedFormatError(f"Unsupported extension: {ext}. Allowed: tif, tiff, png, jpg, jpeg")
    
    if os.path.getsize(path) > MAX_FILE_SIZE_BYTES:
        raise FileTooLargeError(f"File exceeds maximum size of {MAX_FILE_SIZE_BYTES} bytes")
        
    try:
        with rasterio.open(path) as src:
            pass
    except rasterio.errors.RasterioIOError as e:
        raise CorruptFileError(f"Rasterio could not open the file: {e}")

def ingest_upload(file_bytes: bytes, filename: str) -> str:
    image_id = str(uuid.uuid4())
    ext = Path(filename).suffix
    
    artifact_dir = Path(f"./artifacts/{image_id}")
    artifact_dir.mkdir(parents=True, exist_ok=True)
    
    target_path = artifact_dir / f"original{ext}"
    
    with open(target_path, "wb") as f:
        f.write(file_bytes)
        
    try:
        validate_file(str(target_path))
    except Exception as e:
        if target_path.exists():
            os.remove(target_path)
            if not list(artifact_dir.iterdir()):
                artifact_dir.rmdir()
        raise e
        
    return image_id
