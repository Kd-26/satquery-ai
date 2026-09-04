from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic_settings import BaseSettings

# ---------------------------------------------------------------------------
# Settings — DATABASE_URL MUST be provided via .env; no hardcoded credentials.
# ---------------------------------------------------------------------------
class Settings(BaseSettings):
    app_name: str = "SatQuery AI"
    database_url: str  # Required — set in .env (see .env.example)
    cors_origins: list[str] = ["http://localhost:3000"]

    class Config:
        env_file = ".env"

settings = Settings()

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
from backend.api import experiments, exports, feedback, regions, titiler_service  # noqa: E402

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
