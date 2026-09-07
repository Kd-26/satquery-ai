from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "SatQuery AI"
    database_url: str = "postgresql+asyncpg://user:pass@localhost:5432/satquery"
    cors_origins: list[str] = ["http://localhost:3000"]

    # NVIDIA NIM / VLM settings
    nim_api_base: str         = "https://integrate.api.nvidia.com/v1"
    nim_api_key: str          = "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"
    vlm_model_id: str         = "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning"
    vlm_max_tokens: int       = 8192
    vlm_reasoning_budget: int = 4096
    vlm_temperature: float    = 0.3
    vlm_top_p: float          = 0.95
    vlm_lora_adapter: str     = ""  # blank until fine-tuned LoRA is ready

    class Config:
        env_file = ".env"


settings = Settings()
