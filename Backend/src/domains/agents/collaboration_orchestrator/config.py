# ═══════════════════════════════════════════════════════════════
# agents / collaboration_orchestrator / config.py
#
# PURPOSE: Settings for Collaboration Orchestrator Agent (Phase 4).
# ═══════════════════════════════════════════════════════════════

from functools import lru_cache
from typing import Annotated
from pydantic_settings import BaseSettings, NoDecode
from pydantic import ConfigDict, field_validator


class Settings(BaseSettings):
    APP_NAME: str = "Collaboration Orchestrator Agent"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False

    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8007

    # Database & Redis
    DATABASE_URL: str = "postgresql+asyncpg://fte_user:fte_password@localhost:5432/fte_db"
    REDIS_URL: str = "redis://localhost:6379/0"

    # Orchestrator Rules
    DETECT_INTERVAL_SECONDS: int = 120       # 2-minute scan loop
    OVERSTOCK_THRESHOLD: int = 50            # Units to trigger promo post
    PROMO_REPEAT_DAYS: int = 7               # Don't re-promote same product within 7 days
    LOW_STOCK_PROMO: bool = True             # Promote clearance for remaining low stock
    MAX_WORKFLOW_STEPS: int = 6

    # LLM Settings
    LLM_API_KEY: str = ""

    # Security
    AUTH_ENABLED: bool = False
    API_KEYS: list[str] = ["dev-key-123"]
    CORS_ORIGINS: Annotated[list[str], NoDecode] = ["*"]

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def _split_cors(cls, v):
        # .env supplies a comma-separated string, not JSON
        if isinstance(v, str):
            return [o.strip() for o in v.split(",") if o.strip()]
        return v

    model_config = ConfigDict(
        env_file=".env",
        extra="ignore"
    )


@lru_cache()
def get_settings() -> Settings:
    return Settings()
