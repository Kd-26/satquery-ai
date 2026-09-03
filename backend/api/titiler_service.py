from fastapi import APIRouter
try:
    from titiler.core.factory import TilerFactory
    # Set up TiTiler factory for serving COG tiles
    cog = TilerFactory(router_prefix="/tiles")
    titiler_router = cog.router
except ImportError:
    # Fallback mock if titiler is not installed in the environment
    titiler_router = APIRouter(prefix="/tiles")
    
    @titiler_router.get("/{z}/{x}/{y}")
    def mock_tile(z: int, x: int, y: int, url: str):
        return {"message": "TiTiler tile endpoint mock", "z": z, "x": x, "y": y, "url": url}
