import httpx
import logging
from typing import List, Dict, Any, Optional
from app.core.config import settings
from app.models.schemas import YouTubeEvidence, YouTubeVideo

logger = logging.getLogger("prism.youtube")

class YouTubeService:
    BASE_URL = "https://www.googleapis.com/youtube/v3"

    def __init__(self):
        self.api_key = settings.YOUTUBE_API_KEY.strip()

    async def search_channels_and_videos(self, query: str, target_name: Optional[str] = None) -> YouTubeEvidence:
        if not self.api_key:
            return YouTubeEvidence(
                status="UNAVAILABLE",
                reason="YouTube Data API key not configured",
                matchType="Not Found"
            )

        clean_query = query.strip()
        if not clean_query:
            return YouTubeEvidence(
                status="AVAILABLE",
                reason="Empty query provided",
                matchType="Not Found"
            )

        try:
            async with httpx.AsyncClient(timeout=settings.REQUEST_TIMEOUT_SECONDS) as client:
                # 1. Search for channel results first
                channel_params = {
                    "part": "snippet",
                    "q": clean_query,
                    "type": "channel",
                    "maxResults": 2,
                    "key": self.api_key,
                }
                chan_resp = await client.get(f"{self.BASE_URL}/search", params=channel_params)
                
                matched_channel_title = None
                matched_channel_url = None
                matched_channel_desc = None
                
                if chan_resp.status_code == 200:
                    chan_items = chan_resp.json().get("items", [])
                    if chan_items:
                        first_chan = chan_items[0]
                        snippet = first_chan.get("snippet", {})
                        chan_id = first_chan.get("id", {}).get("channelId")
                        matched_channel_title = snippet.get("title")
                        matched_channel_url = f"https://www.youtube.com/channel/{chan_id}" if chan_id else None
                        matched_channel_desc = snippet.get("description")

                # 2. Search for relevant video uploads
                video_params = {
                    "part": "snippet",
                    "q": clean_query,
                    "type": "video",
                    "maxResults": 3,
                    "key": self.api_key,
                }
                vid_resp = await client.get(f"{self.BASE_URL}/search", params=video_params)
                videos_list: List[YouTubeVideo] = []
                
                if vid_resp.status_code == 200:
                    vid_items = vid_resp.json().get("items", [])
                    for item in vid_items:
                        snip = item.get("snippet", {})
                        vid_id = item.get("id", {}).get("videoId")
                        videos_list.append(YouTubeVideo(
                            title=snip.get("title", ""),
                            channelTitle=snip.get("channelTitle", ""),
                            description=snip.get("description"),
                            publishedAt=snip.get("publishedAt"),
                            videoId=vid_id,
                            url=f"https://www.youtube.com/watch?v={vid_id}" if vid_id else None
                        ))

                if matched_channel_title or videos_list:
                    # Decide if Corroborated Match or Possible Match
                    is_corroborated = False
                    if target_name and matched_channel_title:
                        name_parts = target_name.lower().split()
                        chan_lower = matched_channel_title.lower()
                        if all(part in chan_lower for part in name_parts if len(part) > 2):
                            is_corroborated = True

                    return YouTubeEvidence(
                        status="AVAILABLE",
                        reason=None,
                        matchType="Corroborated Match" if is_corroborated else "Possible Match",
                        channelName=matched_channel_title or (videos_list[0].channelTitle if videos_list else "Unknown Channel"),
                        channelUrl=matched_channel_url or (f"https://www.youtube.com/results?search_query={clean_query}"),
                        description=matched_channel_desc or (videos_list[0].description if videos_list else ""),
                        subscribers="Public Channel",
                        videoCount=len(videos_list),
                        videos=videos_list
                    )
                else:
                    return YouTubeEvidence(
                        status="AVAILABLE",
                        reason=f"No public channel or videos found for '{clean_query}'",
                        matchType="Not Found"
                    )

        except Exception as e:
            logger.error(f"YouTube search error for '{clean_query}': {e}")
            return YouTubeEvidence(
                status="UNAVAILABLE",
                reason=f"YouTube API error: {str(e)}",
                matchType="Not Found"
            )

youtube_service = YouTubeService()
