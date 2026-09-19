import httpx
from typing import List, Dict, Any
from app.core.config import settings

class YouTubeService:
    BASE_URL = "https://www.googleapis.com/youtube/v3"

    def __init__(self):
        self.api_key = settings.YOUTUBE_API_KEY

    async def search_talks_and_videos(self, query: str, max_results: int = 3) -> List[Dict[str, Any]]:
        if not self.api_key:
            return []
        try:
            params = {
                "part": "snippet",
                "q": query,
                "type": "video",
                "maxResults": max_results,
                "key": self.api_key,
            }
            async with httpx.AsyncClient(timeout=settings.REQUEST_TIMEOUT_SECONDS) as client:
                resp = await client.get(f"{self.BASE_URL}/search", params=params)
                if resp.status_code == 200:
                    data = resp.json()
                    results = []
                    for item in data.get("items", []):
                        snippet = item.get("snippet", {})
                        results.append({
                            "title": snippet.get("title"),
                            "channelTitle": snippet.get("channelTitle"),
                            "description": snippet.get("description"),
                            "publishedAt": snippet.get("publishedAt"),
                            "videoId": item.get("id", {}).get("videoId"),
                        })
                    return results
                return []
        except Exception:
            return []

youtube_service = YouTubeService()
