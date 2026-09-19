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
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
    GROQ_MODEL: str = os.getenv("GROQ_MODEL", "llama3-70b-8192")
    GITHUB_TOKEN: str = os.getenv("GITHUB_TOKEN", "")
    YOUTUBE_API_KEY: str = os.getenv("YOUTUBE_API_KEY", "")
    
    REQUEST_TIMEOUT_SECONDS: int = 15

settings = Settings()
