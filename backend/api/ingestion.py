from pathlib import Path

from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel
import uuid

from backend.controller.ingestion import ingest_upload

router = APIRouter(tags=["ingestion"])


@router.post("/images")
async def upload_image(file: UploadFile = File(...)):
    """
    Accepts raw satellite image uploads (TIFF, PNG, etc).

    Automatically generates a display-ready RGB preview.png in the artifact
    directory after a successful upload. The preview is available via
    GET /api/v1/images/{image_id}/preview immediately after this call returns.
    """
    try:
        contents = await file.read()
        image_id, has_preview = ingest_upload(contents, file.filename or "unknown.tif")
        return {
            "status": "success",
            "image_id": image_id,
            "has_preview": has_preview,
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/images/{image_id}/preview")
async def get_image_preview(image_id: str):
    """
    Stream the display-ready RGB preview PNG for an uploaded satellite image.

    The preview is generated automatically on upload:
    - 13-band Sentinel-2  → true-colour RGB (B4/B3/B2) with percentile stretch
    - 2-band Sentinel-1   → VV-channel grayscale with percentile stretch
    - 3-band / 1-band     → direct stretch to uint8 RGB
    - 4-band / N-band     → bands 1,2,3 stretched to RGB

    Returns 404 if the preview has not been generated (e.g. upload was a
    non-raster file type or preview generation failed silently).
    """
    preview_path = Path(f"./artifacts/{image_id}/preview.png")
    if not preview_path.exists():
        raise HTTPException(
            status_code=404,
            detail=(
                f"No preview available for image_id={image_id}. "
                "The image may not be a raster GeoTIFF, or preview generation failed."
            ),
        )
    return FileResponse(
        path=str(preview_path),
        media_type="image/png",
        headers={"Cache-Control": "public, max-age=86400"},
    )


class PairRequest(BaseModel):
    image_id_1: str
    image_id_2: str
    relation: str


@router.post("/pairs")
async def link_image_pair(request: PairRequest):
    """
    Links two images for bi-temporal or cross-modal processing.
    """
    # Mock behavior until pair DB schema is fully defined
    return {"status": "success", "pair_id": str(uuid.uuid4())}

