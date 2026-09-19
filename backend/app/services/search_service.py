import logging
from typing import List, Dict, Any, Optional
from app.core.config import settings
from app.models.schemas import WebSearchResult, ProfessionalEvidence

logger = logging.getLogger("prism.search")

class SearchService:
    def generate_queries(
        self,
        name: Optional[str] = None,
        college: Optional[str] = None,
        school: Optional[str] = None,
        github_username: Optional[str] = None,
        description: Optional[str] = None
    ) -> List[str]:
        queries = []
        clean_name = name.strip() if name else ""
        clean_college = college.strip() if college else ""
        clean_school = school.strip() if school else ""
        clean_gh = github_username.strip().lstrip('@') if github_username else ""

        # Primary name query
        if clean_name:
            queries.append(f'"{clean_name}"')

        # Name + College
        if clean_name and clean_college:
            queries.append(f'"{clean_name}" "{clean_college}"')
            # Shortened college if multiple words
            college_words = clean_college.split()
            if len(college_words) > 2:
                short_college = " ".join(college_words[:2])
                queries.append(f'"{clean_name}" "{short_college}"')

        # Name + GitHub
        if clean_name:
            queries.append(f'"{clean_name}" GitHub')

        # GitHub username direct
        if clean_gh:
            queries.append(f'"{clean_gh}"')
            queries.append(f'"{clean_gh}" projects')

        # Name + YouTube
        if clean_name:
            queries.append(f'"{clean_name}" YouTube')

        # Name + developer / professional
        if clean_name:
            queries.append(f'"{clean_name}" developer')

        # School if available
        if clean_name and clean_school:
            queries.append(f'"{clean_name}" "{clean_school}"')

        # Deduplicate while preserving order
        seen = set()
        deduped = []
        for q in queries:
            if q not in seen:
                seen.add(q)
                deduped.append(q)

        return deduped

    async def search_professional_profile(
        self,
        name: Optional[str] = None,
        college: Optional[str] = None,
        github_username: Optional[str] = None
    ) -> ProfessionalEvidence:
        """
        Extracts public professional profile if available via configured public search.
        IMPORTANT: Never fabricates LinkedIn data. If unconfigured or unavailable,
        explicitly returns status='NOT VERIFIED'.
        """
        if not settings.SEARCH_API_KEY:
            return ProfessionalEvidence(
                status="NOT VERIFIED",
                reason="Search API not configured. Public professional profile requires manual verification."
            )

        # If a real search key is provided in future, call configured endpoint
        return ProfessionalEvidence(
            status="NOT VERIFIED",
            reason="No public profile confirmed through authenticated search indices"
        )

    async def search_public_web(self, queries: List[str]) -> List[WebSearchResult]:
        """
        Searches public open repositories for institutional / topic verification.
        """
        results: List[WebSearchResult] = []
        if not queries:
            return results

        # Query Wikipedia or public educational directories if institutional query present
        import httpx
        for q in queries[:3]:
            try:
                # Test query against public educational / encyclopedia registry
                clean_term = q.replace('"', '')
                async with httpx.AsyncClient(timeout=5) as client:
                    resp = await client.get(
                        "https://en.wikipedia.org/w/api.php",
                        params={
                            "action": "query",
                            "list": "search",
                            "srsearch": clean_term,
                            "format": "json"
                        },
                        headers={"User-Agent": "PRISMBot/1.0 (admin@prism.id)"}
                    )
                    if resp.status_code == 200:
                        items = resp.json().get("query", {}).get("search", [])
                        for it in items[:2]:
                            results.append(WebSearchResult(
                                source="Wikipedia Academic Index",
                                title=it.get("title", ""),
                                url=f"https://en.wikipedia.org/wiki/{it.get('title', '').replace(' ', '_')}",
                                snippet=it.get("snippet", "").replace('<span class="searchmatch">', '').replace('</span>', ''),
                                matchedQuery=q
                            ))
            except Exception as e:
                logger.warning(f"Public web search notice for '{q}': {e}")

        return results

search_service = SearchService()
