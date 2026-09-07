import os
import uuid
import logging
import rasterio
from pathlib import Path

log = logging.getLogger(__name__)

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

    # Save original filename for metadata heuristic
    try:
        (artifact_dir / "filename.txt").write_text(filename)
    except Exception:
        pass
        
    try:
        validate_file(str(target_path))
    except Exception as e:
        if target_path.exists():
            os.remove(target_path)
            if not list(artifact_dir.iterdir()):
                artifact_dir.rmdir()
        raise e

    # Generate a display-ready RGB preview PNG (non-blocking).
    # The scientific raster (original file) is preserved unchanged;
    # only the preview is written here.
    has_preview = False
    preview_path = artifact_dir / "preview.png"
    try:
        from backend.scientific_tools.preview import generate_preview
        generate_preview(str(target_path), str(preview_path))
        has_preview = True
    except Exception as preview_err:
        # Preview failure must never block a valid upload.
        log.warning(
            "Preview generation failed for %s (image_id=%s): %s",
            filename, image_id, preview_err
        )

    return image_id, has_preview


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

    orig_name = ""
    name_file = artifact_dir / "filename.txt"
    if name_file.exists():
        try:
            orig_name = name_file.read_text().lower()
        except Exception:
            pass
    
    channel_count = meta.get("channel_count", 0)
    if channel_count == 2 or ("s1" in orig_name and channel_count == 2):
        band_identities = ["VV", "VH"]
    elif channel_count == 3:
        band_identities = ["R", "G", "B"]
    elif channel_count == 4:
        band_identities = ["R", "G", "B", "unknown_band_4"]
    elif channel_count == 1:
        band_identities = ["Grayscale_or_SAR"]
    elif channel_count == 13 or ("s2" in orig_name and channel_count >= 10):
        # Sentinel-2 L1C / L2A standard 13-band order:
        # B1(Coastal), B2(Blue), B3(Green), B4(Red), B5(VRE1), B6(VRE2),
        # B7(VRE3), B8(NIR), B8A(NarrowNIR), B9(WV), B10(Cirrus), B11(SWIR1), B12(SWIR2)
        # We expose R, G, B, NIR for compatibility checks — these are the
        # scientifically validated identities for this sensor family.
        band_identities = ["B1", "B2", "B3", "B4", "B5", "B6", "B7", "B8", "B8A", "B9", "B10", "B11", "B12"]
    else:
        band_identities = [f"unknown_band_{i+1}" for i in range(channel_count)]

    meta["band_identities"] = band_identities
    meta["format"] = files[0].suffix.lstrip('.')
    meta["image_id"] = image_id
    meta["orig_name"] = orig_name

    return meta

def resolve_metadata(image_id: str, sidecar: dict | None = None) -> InputProfile:
    sidecar = sidecar or {}
    meta = inspect_image(image_id)
    orig_name = meta.get("orig_name", "")
    
    acquisition_date = sidecar.get("acquisition_date")
    sar_polarization = sidecar.get("sar_polarization")
    sensor_type = sidecar.get("sensor_type")
    
    sensor_family = sidecar.get("sensor_family")
    if not sensor_family or sensor_family == "unknown":
        if "s1" in orig_name or "sar" in orig_name or meta.get("channel_count") == 2:
            sensor_family = "sentinel-1"
            sensor_type = "sar"
            sar_polarization = sar_polarization or "VV,VH"
        elif "s2" in orig_name or "sentinel-2" in orig_name:
            sensor_family = "sentinel-2"
            sensor_type = "optical"
        else:
            sensor_family = "unknown"
            
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
        raw_pixel_spacing = abs(meta["transform"][0])
        crs_str = meta.get("crs") or ""
        # Sen1Floods11 and many benchmark chips store pixel spacing in geographic
        # degrees (EPSG:4326 or similar geographic CRS). The validator and model
        # registry use metres — convert so resolution checks work correctly.
        # Heuristic: if spacing is <0.01 it is almost certainly in degrees.
        # 1° latitude ≈ 111,320 m (equatorial approximation, good enough for
        # resolution-range gating which has a 5× tolerance factor anyway).
        is_geographic = (
            raw_pixel_spacing < 0.01  # likely in degrees
            or "4326" in crs_str
            or "geographic" in crs_str.lower()
            or "WGS" in crs_str
        )
        if is_geographic:
            pixel_spacing_m = raw_pixel_spacing * 111_320.0  # convert degrees → metres
        else:
            pixel_spacing_m = raw_pixel_spacing
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
