import httpx
import logging
from typing import Dict, Any, Optional, List
from app.core.config import settings
from app.models.schemas import GitHubEvidence, RepositoryInfo

logger = logging.getLogger("prism.github")

class GitHubService:
    BASE_URL = "https://api.github.com"

    def __init__(self):
        self.headers = {
            "Accept": "application/vnd.github.v3+json",
            "User-Agent": "PRISM-Intelligence-Engine/1.0",
        }
        token = settings.GITHUB_TOKEN.strip()
        if token:
            self.headers["Authorization"] = f"Bearer {token}"

    async def get_user_profile(self, username: str) -> Optional[Dict[str, Any]]:
        clean_user = username.strip().lstrip('@')
        try:
            async with httpx.AsyncClient(timeout=settings.REQUEST_TIMEOUT_SECONDS) as client:
                resp = await client.get(f"{self.BASE_URL}/users/{clean_user}", headers=self.headers)
                if resp.status_code == 200:
                    return resp.json()
                logger.warning(f"GitHub user profile '{clean_user}' returned status {resp.status_code}")
                return None
        except Exception as e:
            logger.error(f"Error fetching GitHub profile for '{clean_user}': {e}")
            return None

    async def get_user_repos(self, username: str, limit: int = 30) -> List[Dict[str, Any]]:
        clean_user = username.strip().lstrip('@')
        try:
            async with httpx.AsyncClient(timeout=settings.REQUEST_TIMEOUT_SECONDS) as client:
                resp = await client.get(
                    f"{self.BASE_URL}/users/{clean_user}/repos?sort=updated&per_page={limit}",
                    headers=self.headers
                )
                if resp.status_code == 200:
                    return resp.json()
                logger.warning(f"GitHub repos for '{clean_user}' returned status {resp.status_code}")
                return []
        except Exception as e:
            logger.error(f"Error fetching GitHub repos for '{clean_user}': {e}")
            return []

    async def search_users(self, query: str, limit: int = 5) -> List[Dict[str, Any]]:
        clean_query = query.strip()
        if not clean_query:
            return []
        try:
            async with httpx.AsyncClient(timeout=settings.REQUEST_TIMEOUT_SECONDS) as client:
                resp = await client.get(
                    f"{self.BASE_URL}/search/users?q={clean_query}&per_page={limit}",
                    headers=self.headers
                )
                if resp.status_code == 200:
                    data = resp.json()
                    return data.get("items", [])
                logger.warning(f"GitHub search users '{clean_query}' returned status {resp.status_code}")
                return []
        except Exception as e:
            logger.error(f"Error searching GitHub users '{clean_query}': {e}")
            return []

    async def analyze_user_intelligence(self, username: str) -> GitHubEvidence:
        profile = await self.get_user_profile(username)
        if not profile:
            return GitHubEvidence(
                status="UNAVAILABLE",
                reason=f"GitHub profile '{username}' not found or API rate-limited"
            )

        repos_raw = await self.get_user_repos(username, limit=30)
        repo_objects: List[RepositoryInfo] = []
        languages_set = set()
        keywords_set = set()
        
        for r in repos_raw:
            lang = r.get("language")
            if lang:
                languages_set.add(lang)
            topics = r.get("topics", [])
            for t in topics:
                keywords_set.add(t.capitalize())

            desc = (r.get("description") or "").lower()
            for kw in ["ai", "react", "mongodb", "computer vision", "machine learning", "full stack", "security", "node", "python", "typescript"]:
                if kw in desc or kw in r.get("name", "").lower():
                    keywords_set.add(kw.upper() if len(kw) <= 3 else kw.title())

            repo_objects.append(RepositoryInfo(
                name=r.get("name", ""),
                description=r.get("description"),
                url=r.get("html_url", f"https://github.com/{username}/{r.get('name')}"),
                language=lang,
                stars=r.get("stargazers_count", 0),
                forks=r.get("forks_count", 0),
                topics=topics,
                created_at=r.get("created_at"),
                updated_at=r.get("updated_at")
            ))

        # Sort top projects by stars then recency
        sorted_repos = sorted(
            [rp for rp in repo_objects if rp.name.lower() != username.lower()],
            key=lambda x: (x.stars, x.updated_at or ""),
            reverse=True
        )
        top_projects = [rp.name for rp in sorted_repos[:5]] if sorted_repos else [rp.name for rp in repo_objects[:5]]
        recent_projects = [rp.name for rp in repo_objects[:4]]

        return GitHubEvidence(
            status="AVAILABLE",
            reason=None,
            username=profile.get("login", username),
            name=profile.get("name") or profile.get("login"),
            avatar=profile.get("avatar_url"),
            bio=profile.get("bio"),
            public_repos=profile.get("public_repos", len(repo_objects)),
            followers=profile.get("followers", 0),
            following=profile.get("following", 0),
            company=profile.get("company"),
            location=profile.get("location"),
            blog=profile.get("blog"),
            twitter=profile.get("twitter_username"),
            profile_url=profile.get("html_url", f"https://github.com/{username}"),
            totalRepositories=profile.get("public_repos", len(repo_objects)),
            topProjects=top_projects,
            languages=list(languages_set)[:6],
            recentProjects=recent_projects,
            projectKeywords=list(keywords_set)[:8],
            repositories=repo_objects[:10]
        )

github_service = GitHubService()
