"""
PRISM GitHub Investigation Tool
Wraps live GitHub API intelligence service into standardized BaseInvestigationTool.
Extracts entities, relationships, evidence records, and repository signals.
"""

from typing import Dict, Any, List, Optional
import logging
from app.tools.base import BaseInvestigationTool, ToolResult
from app.services.github_service import github_service

logger = logging.getLogger("prism.tools.github")

class GitHubInvestigationTool(BaseInvestigationTool):
    name: str = "github_tool"
    description: str = "Queries authorized public GitHub profiles, repositories, activity, and commit provenance."
    cost: int = 1

    async def _execute(self, params: Dict[str, Any], context: Dict[str, Any]) -> ToolResult:
        username = (params.get("username") or params.get("github_username") or "").strip().lstrip('@')
        target_name = (params.get("name") or "").strip()
        
        gh_evidence = None
        # 1. Direct handle lookup if provided
        if username:
            gh_evidence = await github_service.analyze_user_intelligence(username)
        # 2. Name search fallback if handle not specified
        elif target_name:
            users = await github_service.search_users(target_name, limit=1)
            if users:
                found_user = users[0].get("login")
                if found_user:
                    gh_evidence = await github_service.analyze_user_intelligence(found_user)

        if not gh_evidence or gh_evidence.status != "AVAILABLE":
            return ToolResult(
                tool_name=self.name,
                success=False,
                error=gh_evidence.reason if gh_evidence else "No public GitHub profile identified",
                data={"status": "UNAVAILABLE", "reason": gh_evidence.reason if gh_evidence else "Profile not found"}
            )

        data = gh_evidence.model_dump()
        login = data.get("username") or username
        p_name = data.get("name") or target_name or login
        person_id = f"person:{login.lower()}"
        profile_id = f"profile:github:{login.lower()}"

        # 1. Normalize Entities
        entities: List[Dict[str, Any]] = [
            {
                "id": person_id,
                "type": "PERSON",
                "label": p_name,
                "properties": {
                    "canonical_name": p_name,
                    "handle": login,
                    "avatar": data.get("avatar"),
                    "bio": data.get("bio"),
                    "location": data.get("location"),
                    "company": data.get("company")
                }
            },
            {
                "id": profile_id,
                "type": "DIGITAL_PROFILE",
                "label": f"GitHub (@{login})",
                "properties": {
                    "platform": "github",
                    "username": login,
                    "url": data.get("profile_url"),
                    "public_repos": data.get("public_repos", 0),
                    "followers": data.get("followers", 0)
                }
            }
        ]

        # 2. Normalize Relationships
        relationships: List[Dict[str, Any]] = [
            {
                "source": person_id,
                "target": profile_id,
                "type": "OWNS_PROFILE",
                "label": "owns public profile",
                "confidence": 0.95
            }
        ]

        # Repositories & Tech Skills
        for repo in data.get("repositories", [])[:10]:
            repo_id = f"repo:{login.lower()}/{repo.get('name', '').lower()}"
            entities.append({
                "id": repo_id,
                "type": "CODE_REPOSITORY",
                "label": repo.get("name"),
                "properties": {
                    "url": repo.get("url"),
                    "language": repo.get("language"),
                    "stars": repo.get("stars", 0),
                    "forks": repo.get("forks", 0),
                    "created_at": repo.get("created_at"),
                    "updated_at": repo.get("updated_at")
                }
            })
            relationships.append({
                "source": profile_id,
                "target": repo_id,
                "type": "AUTHORED",
                "label": "authored repository",
                "confidence": 0.99
            })

        for lang in data.get("languages", [])[:8]:
            skill_id = f"tech:{lang.lower()}"
            entities.append({
                "id": skill_id,
                "type": "TECHNOLOGY_SKILL",
                "label": lang,
                "properties": {"name": lang}
            })
            relationships.append({
                "source": profile_id,
                "target": skill_id,
                "type": "DEMONSTRATES_SKILL",
                "label": "demonstrates proficiency",
                "confidence": 0.90
            })

        # 3. Normalize Evidence
        evidence: List[Dict[str, Any]] = [
            {
                "claim": f"Active public GitHub profile exists under @{login}",
                "evidenceSource": "GitHub API v3",
                "evidenceDetail": f"Profile has {data.get('public_repos', 0)} public repos, {data.get('followers', 0)} followers, Bio: '{data.get('bio') or 'None'}'",
                "sourceUrl": data.get("profile_url"),
                "status": "CORROBORATED",
                "confidence": 0.95
            }
        ]
        if data.get("languages"):
            evidence.append({
                "claim": f"Primary software development stack: {', '.join(data.get('languages', [])[:4])}",
                "evidenceSource": "GitHub Linguistic Analysis",
                "evidenceDetail": f"Detected languages in public repos: {', '.join(data.get('languages', []))}",
                "sourceUrl": data.get("profile_url"),
                "status": "CORROBORATED",
                "confidence": 0.92
            })
        if data.get("repositories"):
            top_r = data["repositories"][0]
            evidence.append({
                "claim": f"Key public codebase: '{top_r.get('name')}' ({top_r.get('language') or 'General'})",
                "evidenceSource": "GitHub Repository Ledger",
                "evidenceDetail": f"Repository URL: {top_r.get('url')}, Updated: {top_r.get('updated_at', 'Recent')}",
                "sourceUrl": top_r.get("url"),
                "status": "CORROBORATED",
                "confidence": 0.98
            })

        return ToolResult(
            tool_name=self.name,
            success=True,
            data=data,
            evidence=evidence,
            entities=entities,
            relationships=relationships
        )

github_tool = GitHubInvestigationTool()
