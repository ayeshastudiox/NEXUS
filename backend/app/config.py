from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite:///./nexus.db"
    LLM_PROVIDER: str = "qwen"
    LLM_API_KEY: Optional[str] = None
    LLM_MODEL: str = "qwen-plus"
    LLM_BASE_URL: str = "https://dashscope.aliyuncs.com/compatible-mode/v1"
    UPLOAD_DIR: str = "uploads"
    MAX_UPLOAD_SIZE: int = 10 * 1024 * 1024
    JWT_SECRET: str = "nexus-hackathon-secret-key-2026"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 1440

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
