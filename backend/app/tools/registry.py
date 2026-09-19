"""
PRISM Dynamic Tool Registry
Provides centralized discovery, metadata introspection, and invocation for investigation tools.
"""

from typing import Dict, Any, List, Optional
import logging
from app.tools.base import BaseInvestigationTool, ToolResult
from app.tools.github_tool import github_tool
from app.tools.web_search_tool import web_search_tool
from app.tools.image_discovery_tool import image_discovery_tool

logger = logging.getLogger("prism.tools.registry")

class ToolRegistry:
    def __init__(self):
        self._tools: Dict[str, BaseInvestigationTool] = {}
        # Register core investigation tools
        self.register(github_tool)
        self.register(web_search_tool)
        self.register(image_discovery_tool)

    def register(self, tool: BaseInvestigationTool):
        self._tools[tool.name] = tool
        logger.info(f"Registered investigation tool: {tool.name}")

    def get_tool(self, name: str) -> Optional[BaseInvestigationTool]:
        return self._tools.get(name)

    def list_tools(self) -> List[Dict[str, Any]]:
        return [
            {
                "name": tool.name,
                "description": tool.description,
                "cost": tool.cost
            }
            for tool in self._tools.values()
        ]

    async def execute_tool(self, name: str, params: Dict[str, Any], context: Optional[Dict[str, Any]] = None) -> ToolResult:
        tool = self.get_tool(name)
        if not tool:
            return ToolResult(
                tool_name=name,
                success=False,
                error=f"Tool '{name}' not found in registry"
            )
        return await tool.run(params, context)

tool_registry = ToolRegistry()
