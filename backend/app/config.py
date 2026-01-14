"""
Application Configuration
"""
from pydantic_settings import BaseSettings
from pydantic import ConfigDict
from typing import Optional


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""
    
    # API Settings
    API_V1_PREFIX: str = "/api/v1"
    PROJECT_NAME: str = "LMA Edge Platform"
    VERSION: str = "1.0.0"
    
    # Database
    DATABASE_URL: Optional[str] = None
    
    # OpenAI / LLM
    OPENAI_API_KEY: Optional[str] = None
    LLM_MODEL: str = "gpt-4o-mini"  # Cost-effective for hackathon
    EMBEDDING_MODEL: str = "text-embedding-3-small"
    
    # ChromaDB
    CHROMA_PERSIST_DIR: str = "./chroma_db"
    
    # Security
    SECRET_KEY: str = "dev-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # Multi-tenancy
    DEFAULT_TENANT_ID: str = "tenant-default"  # For demo purposes
    
    # File Upload
    UPLOAD_DIR: str = "./uploads"
    MAX_FILE_SIZE_MB: int = 50
    
    # Pydantic v2+: use ConfigDict via `model_config` instead of inner Config class
    model_config = ConfigDict(env_file=".env", case_sensitive=True, extra="ignore")


settings = Settings()

