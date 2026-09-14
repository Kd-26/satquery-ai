from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "SatQuery AI"
    database_url: str = "postgresql+asyncpg://user:pass@localhost:5432/satquery"
    cors_origins: list[str] = ["http://localhost:3000"]

    # NVIDIA NIM / VLM settings
    nim_api_base: str         = "https://integrate.api.nvidia.com/v1"
    nim_api_key: str          = ""
    vlm_model_id: str         = "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning"
    vlm_max_tokens: int       = 8192
    vlm_reasoning_budget: int = 4096
    vlm_temperature: float    = 0.3
    vlm_top_p: float          = 0.95
    vlm_lora_adapter: str     = ""  # blank until fine-tuned LoRA is ready
    vlm_provider_order: str   = "openai,modal,nvidia,local"
    vlm_request_token_limit: int = 8192

    # OpenAI Agent Brain settings
    openai_api_key: str       = ""
    openai_agent_model: str   = "gpt-4o"
    openai_api_base: str      = "https://api.openai.com/v1"
    openai_max_tokens_per_run: int = 4096

    # Fine-Tuned Modal VLM / Visual Specialist settings
    modal_vlm_api_base: str   = ""
    modal_vlm_api_key: str    = ""
    modal_vlm_model_id: str   = "qwen-vlm"
    visual_model_endpoint: str = ""
    qwen_base_model_path: str = "Qwen/Qwen2-VL-7B-Instruct"
    lora_optical: str         = "lora_optical_v1"
    lora_temporal: str        = "lora_temporal_v1"
    lora_grounding: str       = "lora_grounding_v1"

    # Local / Microservice endpoints
    local_vlm_api_base: str   = ""
    local_vlm_model_id: str   = "local-vlm"
    segmentation_endpoint: str = "http://localhost:8001"

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
