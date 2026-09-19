"""
PRISM LangGraph State Definition
Defines the typed graph state passed through the LangGraph investigation workflow.
"""

from typing import TypedDict, List, Dict, Any, Optional

class InvestigationGraphState(TypedDict):
    investigation_id: str
    input: Dict[str, Any]
    status: str
    current_step: str
    budget_remaining: int
    step_count: int
    next_tool_to_call: Optional[str]
    tool_params: Dict[str, Any]
    executed_tools: List[str]
    tool_results: Dict[str, Any]
    entities: List[Dict[str, Any]]
    relationships: List[Dict[str, Any]]
    evidence: List[Dict[str, Any]]
    queries: List[Dict[str, Any]]
    target_embedding: Optional[Any]  # Ephemeral, deleted upon completion
    image_analysis: Optional[Dict[str, Any]]
    candidates: List[Dict[str, Any]]
    conflicts: List[Dict[str, Any]]
    timeline: List[Dict[str, Any]]
    graph: Dict[str, Any]
    ai_summary: str
    clarification_questions: List[str]
    evidence_overview: Dict[str, Any]
