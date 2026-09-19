import os
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

class Settings(BaseModel):
    PROJECT_NAME: str = "PRISM"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    PORT: int = int(os.getenv("PORT", 8000))
    HOST: str = os.getenv("HOST", "127.0.0.1")
    CORS_ORIGINS: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
    ]
    
    # AI & Intelligence Keys
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "").strip()
    GROQ_MODEL: str = os.getenv("GROQ_MODEL", "groq/compound-mini").strip()
    GITHUB_TOKEN: str = os.getenv("GITHUB_TOKEN", "").strip()
    YOUTUBE_API_KEY: str = os.getenv("YOUTUBE_API_KEY", "").strip()
    SEARCH_API_KEY: str = os.getenv("SEARCH_API_KEY", "").strip()
    
    # Database Settings
    MONGODB_URI: str = os.getenv("MONGODB_URI", "mongodb://localhost:27017").strip()
    MONGODB_DB_NAME: str = os.getenv("MONGODB_DB_NAME", "prism_db").strip()
    
    REQUEST_TIMEOUT_SECONDS: int = 15

settings = Settings()
