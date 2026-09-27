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
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register TiTiler error handlers so TileOutsideBounds → 404 (not 500)
try:
    from titiler.core.errors import DEFAULT_STATUS_CODES, add_exception_handlers as titiler_add_exception_handlers
    titiler_add_exception_handlers(app, DEFAULT_STATUS_CODES)
except ImportError:
    pass

# ─── CORS catch-all middleware ────────────────────────────────────────────────
# The starlette CORSMiddleware only adds headers to responses it processes, but
# TiTiler's internal error handlers (e.g. TileOutsideBounds → 500) bypass it.
# This middleware ensures EVERY response, including tile-server errors, gets
# proper CORS headers so MapLibre doesn't throw "TypeError: Failed to fetch".
import re as _re
_CORS_ORIGIN_RE = _re.compile(
    r"^https?://(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+)(:\d+)?$"
)

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request as StarletteRequest
from starlette.responses import JSONResponse

class CORSCatchAllMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: StarletteRequest, call_next):
        origin = request.headers.get("origin", "")
        try:
            response = await call_next(request)
        except Exception as exc:
            import logging
            logging.getLogger("uvicorn.error").exception("Unhandled error in request: %s", exc)
            response = JSONResponse(
                {"detail": "Internal server error"},
                status_code=500
            )
        if origin and (origin in settings.cors_origins or _CORS_ORIGIN_RE.match(origin)):
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Access-Control-Allow-Credentials"] = "true"
            response.headers["Vary"] = "Origin"
        return response

app.add_middleware(CORSCatchAllMiddleware)



# ---------------------------------------------------------------------------
# Routers — each mounted under /api/v1
# ---------------------------------------------------------------------------
from backend.api import experiments, exports, feedback, regions, titiler_service, ingestion, query, pixel_inspect, providers, workspace  # noqa: E402

app.include_router(ingestion.router,            prefix="/api/v1")
app.include_router(query.router,                prefix="/api/v1")
app.include_router(experiments.router,          prefix="/api/v1")
app.include_router(exports.router,              prefix="/api/v1")
app.include_router(feedback.router,             prefix="/api/v1")
app.include_router(regions.router,              prefix="/api/v1")
app.include_router(titiler_service.titiler_router, prefix="/api/v1")
app.include_router(pixel_inspect.router,        prefix="/api/v1")
app.include_router(providers.router,           prefix="/api/v1")
app.include_router(workspace.router,           prefix="/api/v1")

# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------
@app.get("/health", tags=["health"])
async def health_check():
    return {"status": "ok", "app": settings.app_name}
