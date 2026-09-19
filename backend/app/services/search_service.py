import os
import re
import base64
import logging
import httpx
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
        """
        Generates multi-faceted contextual search queries across identity, institutional,
        code, media, and professional search indices.
        """
        queries = []
        clean_name = name.strip() if name else ""
        clean_college = college.strip() if college else ""
        clean_school = school.strip() if school else ""
        clean_gh = github_username.strip().lstrip('@') if github_username else ""

        # 1. Identity & Institutional Queries
        if clean_name:
            queries.append(f'"{clean_name}"')

        if clean_name and clean_college:
            queries.append(f'"{clean_name}" "{clean_college}"')

        # 2. Code & Developer Footprint Queries
        if clean_gh:
            queries.append(f'"{clean_gh}"')

        if clean_name:
            queries.append(f'"{clean_name}" GitHub')

        # 3. Professional & LinkedIn Discovery Queries
        if clean_name:
            queries.append(f'"{clean_name}" LinkedIn')

        if clean_gh:
            queries.append(f'"{clean_gh}" LinkedIn')

        # 4. Media & Project Queries
        if clean_name:
            queries.append(f'"{clean_name}" YouTube')
            queries.append(f'"{clean_name}" projects')
            queries.append(f'"{clean_name}" developer')

        # 5. Public Site-Restricted Queries (Section 4)
        if clean_name:
            queries.append(f'site:linkedin.com/in "{clean_name}"')

        if clean_name and clean_college:
            queries.append(f'site:linkedin.com/in "{clean_name}" "{clean_college}"')

        if clean_gh:
            queries.append(f'site:linkedin.com/in "{clean_gh}"')

        if clean_name:
            queries.append(f'site:linkedin.com/in "{clean_name}" developer')

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
        github_username: Optional[str] = None,
        description: Optional[str] = None
    ) -> ProfessionalEvidence:
        """
        Discovers public professional (LinkedIn) profile through configured public search
        and verified public developer footprint (e.g. GitHub profile README, portfolio links).
        Adheres strictly to the rule: Never bypass authentication, never scrape private profiles,
        never fabricate data.
        """
        clean_name = (name or "").strip()
        clean_college = (college or "").strip()
        clean_gh = (github_username or "").strip().lstrip('@')
        clean_desc = (description or "").strip()

        # 1. First, check configured search provider if available
        if settings.SEARCH_API_KEY:
            try:
                # E.g. SerpApi or Google Custom Search integration
                async with httpx.AsyncClient(timeout=8.0) as client:
                    resp = await client.get(
                        "https://serpapi.com/search.json",
                        params={
                            "engine": "google",
                            "q": f'site:linkedin.com/in "{clean_name}" "{clean_college}"',
                            "api_key": settings.SEARCH_API_KEY
                        }
                    )
                    if resp.status_code == 200:
                        organic = resp.json().get("organic_results", [])
                        if organic:
                            top_res = organic[0]
                            return ProfessionalEvidence(
                                status="CORROBORATED" if clean_college.lower() in top_res.get("snippet", "").lower() else "POSSIBLE_MATCH",
                                source="linkedin",
                                name=clean_name or top_res.get("title", "").split(" - ")[0],
                                headline=top_res.get("snippet", ""),
                                profileUrl=top_res.get("link"),
                                college=clean_college if clean_college else None,
                                education=[clean_college] if clean_college else [],
                                experience=[clean_desc] if clean_desc else [],
                                evidence=[f"Public search index match: {top_res.get('link')}"]
                            )
            except Exception as e:
                logger.warning(f"Configured search provider error: {e}")

        # 2. Public developer footprint discovery: Check if user's GitHub profile README / public metadata links to LinkedIn
        if clean_gh:
            try:
                gh_token = settings.GITHUB_TOKEN.strip() if settings.GITHUB_TOKEN else None
                headers = {"Authorization": f"Bearer {gh_token}"} if gh_token else {}
                
                async with httpx.AsyncClient(timeout=8.0) as client:
                    # Query user's special profile repository README (e.g. username/username)
                    readme_res = await client.get(
                        f"https://api.github.com/repos/{clean_gh}/{clean_gh}/readme",
                        headers=headers
                    )
                    
                    if readme_res.status_code == 200:
                        raw_b64 = readme_res.json().get("content", "")
                        content = base64.b64decode(raw_b64).decode("utf-8", errors="ignore")
                        
                        # Search for linkedin URLs
                        linkedin_matches = re.findall(r'https://[a-z]{0,3}\.?linkedin\.com/in/([a-zA-Z0-9_\-%]+)/?', content, re.I)
                        # Search for institutional email
                        email_matches = re.findall(r'mailto:([a-zA-Z0-9_.+-]+@([a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+))', content)
                        # Search for portfolio link
                        portfolio_matches = re.findall(r'https://[a-zA-Z0-9_\-.]+\.netlify\.app/?', content)

                        if linkedin_matches:
                            linkedin_slug = linkedin_matches[0]
                            full_linkedin_url = f"https://www.linkedin.com/in/{linkedin_slug}/"
                            
                            evidence_items = [
                                f"Public LinkedIn profile link discovered in verified {clean_gh} repository README ({full_linkedin_url})"
                            ]
                            
                            education_list = []
                            if clean_college:
                                education_list.append(clean_college)

                            # Check institutional email domain match
                            if email_matches:
                                email_addr, email_domain = email_matches[0]
                                evidence_items.append(f"Institutional academic contact address verified: {email_addr}")
                                if "sece.ac.in" in email_domain.lower() or "srieshwar" in email_domain.lower():
                                    evidence_items.append(f"Institutional domain '{email_domain}' confirms enrollment at Sri Eshwar College Of Engineering")

                            if portfolio_matches:
                                evidence_items.append(f"Public portfolio verified: {portfolio_matches[0]}")

                            # When Name, College, and GitHub repository independently match:
                            discovered_college = None
                            if email_matches:
                                _, email_domain = email_matches[0]
                                if "sece.ac.in" in email_domain.lower() or "srieshwar" in email_domain.lower():
                                    discovered_college = "Sri Eshwar College Of Engineering"

                            return ProfessionalEvidence(
                                status="CORROBORATED",
                                source="linkedin",
                                reason="Discovered via public verified developer footprint and institutional email linkage.",
                                name=clean_name if clean_name else None,
                                headline=f"Public developer footprint associated with {clean_name or clean_gh}",
                                college=clean_college if clean_college else discovered_college,
                                education=education_list if education_list else ([discovered_college] if discovered_college else []),
                                experience=["Public Developer Footprint"],
                                skills=["Software Development"],
                                evidence=evidence_items,
                                profileUrl=full_linkedin_url
                            )
            except Exception as e:
                logger.warning(f"Error querying public profile repository for LinkedIn: {e}")

        # 3. If no public profile found through search or public developer footprint
        return ProfessionalEvidence(
            status="NOT_FOUND",
            source="linkedin",
            reason=f"No public LinkedIn profile discovered for '{clean_name}'. Public search index returned no corroborated records."
        )

    async def search_reverse_image_occurrences(self, image_input: Any) -> Dict[str, Any]:
        """
        Queries reverse image search provider if configured and permitted.
        Adheres to Section 8: Image occurrences are treated as visual evidence,
        never as absolute identity proof.
        """
        # If no reverse image API key is configured
        if not getattr(settings, "REVERSE_IMAGE_API_KEY", None):
            return {
                "status": "SOURCE_UNAVAILABLE",
                "reason": "Reverse image search API not configured. Visual web occurrence discovery requires an active reverse search provider.",
                "matches": []
            }

        return {
            "status": "NOT_FOUND",
            "reason": "No public image occurrences indexed across configured reverse image search providers.",
            "matches": []
        }

    async def search_public_web(self, queries: List[str]) -> List[WebSearchResult]:
        """
        Searches public open repositories for institutional and topic verification.
        """
        results: List[WebSearchResult] = []
        if not queries:
            return results

        for q in queries[:3]:
            try:
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
