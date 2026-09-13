from fastapi import APIRouter

from backend.services.provider_service import provider_health

router = APIRouter(prefix="/providers", tags=["providers"])


@router.get("/health")
def health():
    return {"providers": provider_health()}
