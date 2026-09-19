import httpx
from typing import Dict, Any, Optional
from app.core.config import settings

class GitHubService:
    BASE_URL = "https://api.github.com"

    def __init__(self):
        self.headers = {
            "Accept": "application/vnd.github.v3+json",
            "User-Agent": "PRISM-Intelligence-Engine/1.0",
        }
        if settings.GITHUB_TOKEN:
            self.headers["Authorization"] = f"token {settings.GITHUB_TOKEN}"

    async def get_user_profile(self, username: str) -> Optional[Dict[str, Any]]:
        try:
            async with httpx.AsyncClient(timeout=settings.REQUEST_TIMEOUT_SECONDS) as client:
                resp = await client.get(f"{self.BASE_URL}/users/{username}", headers=self.headers)
                if resp.status_code == 200:
                    return resp.json()
                return None
        except Exception:
            return None

    async def get_user_repos(self, username: str, limit: int = 5) -> list:
        try:
            async with httpx.AsyncClient(timeout=settings.REQUEST_TIMEOUT_SECONDS) as client:
                resp = await client.get(
                    f"{self.BASE_URL}/users/{username}/repos?sort=updated&per_page={limit}",
                    headers=self.headers
                )
                if resp.status_code == 200:
                    return resp.json()
                return []
        except Exception:
            return []

github_service = GitHubService()
