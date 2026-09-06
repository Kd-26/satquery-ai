from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    app_name: str = "SatQuery AI"
    database_url: str  # Required — set in .env (see .env.example)
    cors_origins: list[str] = ["http://localhost:3000"]

    class Config:
        env_file = ".env"

settings = Settings()

