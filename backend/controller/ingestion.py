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


from backend.scientific_tools.raster_io import read_raster_metadata
from backend.schemas.input_profile import InputProfile
import glob

def inspect_image(image_id: str) -> dict:
    artifact_dir = Path(f"./artifacts/{image_id}")
    files = list(artifact_dir.glob("original.*"))
    if not files:
        raise FileNotFoundError(f"Original file not found for image {image_id}")
    
    file_path = str(files[0])
    meta = read_raster_metadata(file_path)
    
    channel_count = meta.get("channel_count", 0)
    if channel_count == 3:
        band_identities = ["R", "G", "B"]
    elif channel_count == 4:
        band_identities = ["R", "G", "B", "unknown_band_4"]
    elif channel_count == 1:
        band_identities = ["Grayscale_or_SAR"]
    else:
        band_identities = [f"unknown_band_{i+1}" for i in range(channel_count)]
        
    meta["band_identities"] = band_identities
    meta["format"] = files[0].suffix.lstrip('.')
    meta["image_id"] = image_id
    
    return meta

def resolve_metadata(image_id: str, sidecar: dict | None = None) -> InputProfile:
    sidecar = sidecar or {}
    meta = inspect_image(image_id)
    
    acquisition_date = sidecar.get("acquisition_date")
    sar_polarization = sidecar.get("sar_polarization")
    sensor_type = sidecar.get("sensor_type")
    
    sensor_family = sidecar.get("sensor_family", "unknown")
    if sensor_family not in ['sentinel-1', 'sentinel-2', 'cartosat-2s', 'risat', 'unknown']:
        sensor_family = "unknown"
        
    if "band_identities" in sidecar:
        meta["band_identities"] = sidecar["band_identities"]
        
    verified_fields = ["dimensions", "channels", "format"]
    missing_fields = []
    capability_restrictions = []
    
    if meta.get("crs"):
        verified_fields.append("crs")
    else:
        missing_fields.append("crs")
        capability_restrictions.append("area_estimation: unavailable without CRS")
        
    if meta.get("transform"):
        pixel_spacing_m = abs(meta["transform"][0])
        verified_fields.append("pixel_spacing_m")
    else:
        pixel_spacing_m = None
        missing_fields.append("pixel_spacing_m")
        capability_restrictions.append("physical_measurement: unavailable without pixel spacing")

    if "unknown_band_4" in meta["band_identities"]:
        capability_restrictions.append("multispectral_analysis: unavailable due to unverified band 4 (assumed NOT to be NIR)")

    return InputProfile(
        image_id=image_id,
        format=meta["format"],
        dimensions=meta["dimensions"],
        channels=meta["channel_count"],
        band_identities=meta["band_identities"],
        sensor_type=sensor_type,
        sensor_family=sensor_family,
        crs=meta.get("crs"),
        pixel_spacing_m=pixel_spacing_m,
        acquisition_date=acquisition_date,
        sar_polarization=sar_polarization,
        nodata_value=meta.get("nodata"),
        valid_pixel_fraction=None,
        verified_fields=verified_fields,
        missing_fields=missing_fields,
        capability_restrictions=capability_restrictions
    )
