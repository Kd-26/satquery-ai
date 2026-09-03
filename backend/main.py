from fastapi import FastAPI
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    app_name: str = "SatQuery AI"
    
    class Config:
        env_file = ".env"

settings = Settings()
app = FastAPI(title=settings.app_name)

@app.get("/health")
async def health_check():
    return {"status": "ok"}
