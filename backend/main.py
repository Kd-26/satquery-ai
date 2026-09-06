from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic_settings import BaseSettings

from backend.core.config import settings, Settings

# ---------------------------------------------------------------------------
# Application
# ---------------------------------------------------------------------------
app = FastAPI(
    title=settings.app_name,
    description="Neuro-Symbolic Geospatial Intelligence API",
    version="1.0.0",
)

# CORS — allows the Next.js dev server to call the API
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Routers — each mounted under /api/v1
# ---------------------------------------------------------------------------
from backend.api import experiments, exports, feedback, regions, titiler_service, ingestion, query  # noqa: E402

app.include_router(ingestion.router,            prefix="/api/v1")
app.include_router(query.router,                prefix="/api/v1")
app.include_router(experiments.router,          prefix="/api/v1")
app.include_router(exports.router,              prefix="/api/v1")
app.include_router(feedback.router,             prefix="/api/v1")
app.include_router(regions.router,              prefix="/api/v1")
app.include_router(titiler_service.titiler_router, prefix="/api/v1")

# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------
@app.get("/health", tags=["health"])
async def health_check():
    return {"status": "ok", "app": settings.app_name}
