from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


_PROJECT_ROOT = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        # Keep the repository-root .env canonical while accepting the older
        # backend/.env location for existing deployments. Real environment
        # variables override both files.
        env_file=(_PROJECT_ROOT / "backend" / ".env", _PROJECT_ROOT / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "SatQuery AI"
    database_url: str = "postgresql+asyncpg://user:pass@localhost:5432/satquery"
    cors_origins: list[str] = ["http://localhost:3000"]

    # Provider routing
    vlm_provider_order: str      = "modal"
    vlm_request_token_limit: int = 8192

    # OpenAI Agent Brain settings
    openai_api_key: str       = ""
    openai_agent_model: str   = "gpt-4o"
    openai_api_base: str      = "https://api.openai.com/v1"
    openai_max_tokens_per_run: int = 4096
    openai_verifier_enabled: bool = True

    # Fine-Tuned Modal VLM / Visual Specialist settings
    modal_vlm_api_base: str   = ""
    modal_vlm_api_key: str    = ""
    modal_vlm_model_id: str   = "satquery-vlm"
    modal_proxy_token_id: str = ""
    modal_proxy_token_secret: str = ""
    modal_request_timeout_s: float = 600.0
    modal_attempt_timeout_s: float = 120.0
    visual_model_endpoint: str = ""
    qwen_base_model_path: str = "Qwen/Qwen2-VL-7B-Instruct"
    lora_general: str         = "lora_general_v1"
    lora_optical: str         = "lora_optical_v1"
    lora_temporal: str        = "lora_temporal_v1"
    lora_crossmodal: str      = "lora_crossmodal_v1"
    lora_grounding: str       = "lora_grounding_v1"

    # Local / Microservice endpoints
    local_vlm_api_base: str   = ""
    local_vlm_model_id: str   = "local-vlm"
    segmentation_endpoint: str = "http://localhost:8001"

    # Modal Hosted Segmentation API
    satquery_segmentation_base_url: str = ""
    satquery_modal_proxy_key: str = ""
    satquery_modal_proxy_secret: str = ""
    satquery_allow_unresolved_segmentation: bool = True
    segmentation_request_timeout_s: float = 600.0
    segmentation_attempt_timeout_s: float = 120.0

settings = Settings()
