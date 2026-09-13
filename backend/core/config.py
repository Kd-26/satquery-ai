from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "SatQuery AI"
    database_url: str = "postgresql+asyncpg://user:pass@localhost:5432/satquery"
    cors_origins: list[str] = ["http://localhost:3000"]

    # ── Agent Brain (OpenAI) ──────────────────────────────────────────────────
    agent_provider: str = "openai"
    openai_api_key: str = ""
    openai_agent_model: str = "gpt-4o"
    openai_fallback_model: str = "gpt-4o-mini"
    openai_max_cost_per_run_usd: float = 0.05
    openai_max_tokens_per_run: int = 8192

    # ── Visual Specialist (Qwen 9B) ───────────────────────────────────────────
    visual_provider: str = "qwen_local"
    visual_model_endpoint: str = "http://localhost:8000/v1"
    qwen_base_model_path: str = "Qwen/Qwen2.5-VL-7B-Instruct"

    # ── Segmentation Provider ────────────────────────────────────────────────
    segmentation_provider: str = "local_service"
    segmentation_endpoint: str = "http://localhost:8001/v1"

    # ── Legacy NVIDIA NIM / VLM settings ──────────────────────────────────────
    nim_api_base: str         = "https://integrate.api.nvidia.com/v1"
    nim_api_key: str          = "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"
    vlm_model_id: str         = "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning"

    # ── LoRA fine-tuned adapters ─────────────────────────────────────────────
    lora_optical: str = ""
    lora_sar: str = ""
    lora_temporal: str = ""
    lora_crossmodal: str = ""
    lora_grounding: str = ""

    class Config:
        env_file = ".env"


settings = Settings()
