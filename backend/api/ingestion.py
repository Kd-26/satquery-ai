from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel
import uuid

from backend.controller.ingestion import ingest_upload

router = APIRouter(tags=["ingestion"])

@router.post("/images")
async def upload_image(file: UploadFile = File(...)):
    """
    Accepts raw satellite image uploads (TIFF, PNG, etc).
    """
    try:
        contents = await file.read()
        image_id = ingest_upload(contents, file.filename or "unknown.tif")
        return {"status": "success", "image_id": image_id}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

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
