"""
PRISM Base Investigation Tool Interface
Standardized interface for all investigation tools with built-in caching,
deduplication, budget management, and structured entity/evidence extraction.
"""

from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional
import hashlib
import json
import logging
from datetime import datetime
from pydantic import BaseModel, Field
from app.db.mongo import mongo_service

logger = logging.getLogger("prism.tools.base")

class ToolResult(BaseModel):
    tool_name: str
    success: bool = True
    query: str = ""
    query_hash: str = ""
    data: Dict[str, Any] = Field(default_factory=dict)
    evidence: List[Dict[str, Any]] = Field(default_factory=list)
    entities: List[Dict[str, Any]] = Field(default_factory=list)
    relationships: List[Dict[str, Any]] = Field(default_factory=list)
    cached: bool = False
    error: Optional[str] = None
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat() + "Z")

class BaseInvestigationTool(ABC):
    """Abstract base class for all PRISM OSINT and identity investigation tools."""
    name: str = "base_tool"
    description: str = "Base tool description"
    cost: int = 1  # Standard budget cost per invocation

    def compute_query_hash(self, params: Dict[str, Any]) -> str:
        """Compute deterministic SHA-256 hash for query deduplication and caching."""
        serialized = json.dumps({
            "tool": self.name,
            "params": {k: v for k, v in sorted(params.items()) if k != "target_embedding"}
        }, sort_keys=True)
        return hashlib.sha256(serialized.encode("utf-8")).hexdigest()

    async def run(self, params: Dict[str, Any], context: Optional[Dict[str, Any]] = None, use_cache: bool = True) -> ToolResult:
        """Run tool with automatic caching and deduplication."""
        query_str = str(params.get("query") or params.get("username") or params.get("name") or self.name)
        q_hash = self.compute_query_hash(params)
        
        # Check cache if enabled
        if use_cache:
            cached_doc = await mongo_service.get_cached_query(q_hash)
            if cached_doc:
                logger.info(f"[{self.name}] Cache HIT for query hash: {q_hash[:10]}...")
                cached_result = ToolResult(**cached_doc)
                cached_result.cached = True
                return cached_result

        logger.info(f"[{self.name}] Executing live search: {query_str}")
        try:
            result = await self._execute(params, context or {})
            result.query = query_str
            result.query_hash = q_hash
            result.tool_name = self.name
            
            # Cache the successful result
            if result.success and use_cache:
                await mongo_service.cache_query_result(
                    query_hash=q_hash,
                    query_text=query_str,
                    tool_name=self.name,
                    result=result.model_dump()
                )
            return result
        except Exception as e:
            logger.error(f"[{self.name}] Tool execution failed: {e}", exc_info=True)
            return ToolResult(
                tool_name=self.name,
                success=False,
                query=query_str,
                query_hash=q_hash,
                error=str(e)
            )

    @abstractmethod
    async def _execute(self, params: Dict[str, Any], context: Dict[str, Any]) -> ToolResult:
        """Subclasses must implement actual execution and normalization logic."""
        pass
