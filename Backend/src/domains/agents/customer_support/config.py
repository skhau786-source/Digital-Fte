# ═══════════════════════════════════════════════════════════════
# agents / customer_support / config.py
#
# PURPOSE: Settings for Customer Support Agent (Phase 4).
# ═══════════════════════════════════════════════════════════════

import os
from functools import lru_cache
from pydantic_settings import BaseSettings
from pydantic import ConfigDict


class Settings(BaseSettings):
    APP_NAME: str = "Customer Support Agent"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False

    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8005

    # Database & Redis
    DATABASE_URL: str = "postgresql+asyncpg://fte_user:fte_password@localhost:5432/fte_db"
    REDIS_URL: str = "redis://localhost:6379/0"

    # LLM Settings
    LLM_API_KEY: str = ""
    LLM_MODEL: str = "gpt-4o-mini"

    # Shopify Storefront API
    SHOPIFY_STOREFRONT_API_URL: str = "https://{shop}/api/2024-01/graphql.json"
    STOREFRONT_ACCESS_TOKEN: str = ""

    # Support Rules
    HANDOFF_KEYWORDS: list[str] = [
        "refund", "cancel my order", "cancel order", "return policy",
        "scam", "fraud", "sue", "legal", "talk to human", "speak to representative"
    ]
    OUT_OF_SCOPE_KEYWORDS: list[str] = ["refund", "cancel", "chargeback", "lawyer"]
    MAX_RAG_PRODUCTS: int = 5
    SUPPORTED_LANGUAGES: list[str] = ["en", "roman_urdu", "urdu"]

    # Security
    AUTH_ENABLED: bool = False
    API_KEYS: list[str] = ["dev-key-123"]
    CORS_ORIGINS: list[str] = ["*"]

    model_config = ConfigDict(
        env_file=".env",
        extra="ignore"
    )


@lru_cache()
def get_settings() -> Settings:
    return Settings()
