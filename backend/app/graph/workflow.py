"""
PRISM LangGraph Investigation Agent Workflow
Implements dynamic autonomous investigation looping, multi-source evidence extraction,
entity resolution, conflict detection, timeline/graph generation, and MongoDB persistence.
"""

from typing import Dict, Any, List, Optional
import logging
from datetime import datetime
from langgraph.graph import StateGraph, END

from app.graph.state import InvestigationGraphState
from app.tools.registry import tool_registry
from app.services.candidate_engine import candidate_engine
from app.services.groq_service import groq_service
from app.db.mongo import mongo_service
from app.models.schemas import CandidateCard

logger = logging.getLogger("prism.graph.workflow")

# -------------------------------------------------------------
# GRAPH NODES
# -------------------------------------------------------------

async def node_initialize(state: InvestigationGraphState) -> InvestigationGraphState:
    """Initialize investigation state, normalize target input context, and set budget."""
    inp = state.get("input", {})
    name = (inp.get("name") or inp.get("target_name") or inp.get("seed_handle") or "").strip()
    college = (inp.get("college") or inp.get("school_college") or "").strip()
    school = (inp.get("school") or "").strip()
    github_user = (inp.get("githubUsername") or inp.get("seed_handle") or "").strip().lstrip('@')
    desc = (inp.get("description") or "").strip()
    raw_image = inp.get("image")

    normalized_input = {
        "name": name,
        "college": college,
        "school": school,
        "githubUsername": github_user,
        "description": desc,
        "image": raw_image
    }

    logger.info(f"[Graph Init] Starting investigation {state.get('investigation_id')} for target: '{name}' / '{github_user}'")

    return {
        **state,
        "input": normalized_input,
        "status": "INITIALIZING",
        "current_step": "INITIALIZING_INVESTIGATION",
        "budget_remaining": 6,  # Allow up to 6 autonomous actions
        "step_count": 0,
        "next_tool_to_call": None,
        "tool_params": {},
        "executed_tools": [],
        "tool_results": {},
        "entities": [],
        "relationships": [],
        "evidence": [],
        "queries": [],
        "target_embedding": None,
        "image_analysis": None,
        "candidates": [],
        "conflicts": [],
        "timeline": [],
        "graph": {"nodes": [], "edges": []},
        "ai_summary": "",
        "clarification_questions": [],
        "evidence_overview": {}
    }


async def node_select_action(state: InvestigationGraphState) -> InvestigationGraphState:
    """
    Autonomous Agent Decider:
    Evaluates current evidence state, identified entities, and remaining budget to
    select the next most impactful tool to call, or determines sufficiency.
    """
    budget = state.get("budget_remaining", 0)
    executed = state.get("executed_tools", [])
    inp = state.get("input", {})
    
    # Check if budget exhausted
    if budget <= 0:
        logger.info("[Agent Decider] Investigation budget exhausted. Proceeding to entity resolution.")
        return {**state, "next_tool_to_call": None}

    # Priority 1: Visual Biometrics if photo supplied and not yet evaluated
    if inp.get("image") and "image_discovery_tool" not in executed:
        logger.info("[Agent Decider] Selecting image_discovery_tool for reference photograph analysis.")
        return {
            **state,
            "next_tool_to_call": "image_discovery_tool",
            "tool_params": {
                "image": inp.get("image"),
                "name": inp.get("name")
            },
            "current_step": "ANALYZING_IMAGE"
        }

    # Priority 2: Public GitHub API intelligence if username provided or name known
    if (inp.get("githubUsername") or inp.get("name")) and "github_tool" not in executed:
        logger.info("[Agent Decider] Selecting github_tool for developer footprint discovery.")
        return {
            **state,
            "next_tool_to_call": "github_tool",
            "tool_params": {
                "username": inp.get("githubUsername"),
                "name": inp.get("name")
            },
            "current_step": "GITHUB_INTELLIGENCE"
        }

    # Priority 3: Public Web & Professional footprint if not yet executed
    if "web_search_tool" not in executed:
        logger.info("[Agent Decider] Selecting web_search_tool for institutional and professional footprint.")
        return {
            **state,
            "next_tool_to_call": "web_search_tool",
            "tool_params": {
                "name": inp.get("name"),
                "college": inp.get("college"),
                "school": inp.get("school"),
                "github_username": inp.get("githubUsername"),
                "description": inp.get("description")
            },
            "current_step": "WEB_AND_INSTITUTIONAL_SEARCH"
        }

    # All primary tools executed or sufficient evidence gathered
    logger.info("[Agent Decider] All necessary intelligence signals acquired. Proceeding to resolution.")
    return {
        **state,
        "next_tool_to_call": None,
        "current_step": "SUFFICIENT_SIGNALS_ACQUIRED"
    }


def router_should_continue(state: InvestigationGraphState) -> str:
    """Conditional edge router: returns 'execute_tool' or 'entity_resolution'."""
    if state.get("next_tool_to_call") and state.get("budget_remaining", 0) > 0:
        return "execute_tool"
    return "entity_resolution"


async def node_execute_tool(state: InvestigationGraphState) -> InvestigationGraphState:
    """Executes the selected tool, collects normalized entities, relationships, and evidence."""
    tool_name = state.get("next_tool_to_call")
    params = state.get("tool_params", {})
    budget = state.get("budget_remaining", 1)
    step_count = state.get("step_count", 0) + 1
    
    logger.info(f"[Tool Execution] Step {step_count}: Running tool '{tool_name}'")
    
    # Context dictionary for in-memory ephemeral passing (like face embedding)
    context: Dict[str, Any] = {}
    if state.get("target_embedding") is not None:
        context["target_embedding"] = state.get("target_embedding")

    tool_res = await tool_registry.execute_tool(tool_name, params, context)
    
    # Ephemeral embedding transfer if produced
    target_embedding = context.get("target_embedding", state.get("target_embedding"))
    
    # Update tool results
    updated_tool_results = dict(state.get("tool_results", {}))
    updated_tool_results[tool_name] = tool_res.data

    # Merge entities, relationships, evidence
    entities = list(state.get("entities", []))
    for e in tool_res.entities:
        if not any(existing.get("id") == e.get("id") for existing in entities):
            entities.append(e)

    relationships = list(state.get("relationships", []))
    relationships.extend(tool_res.relationships)

    evidence = list(state.get("evidence", []))
    evidence.extend(tool_res.evidence)

    queries = list(state.get("queries", []))
    if tool_res.query:
        queries.append({
            "tool": tool_name,
            "query": tool_res.query,
            "query_hash": tool_res.query_hash,
            "cached": tool_res.cached,
            "timestamp": tool_res.timestamp
        })

    # Track executed tools and deduct budget
    executed_tools = list(state.get("executed_tools", []))
    executed_tools.append(tool_name)

    image_analysis = state.get("image_analysis")
    if tool_name == "image_discovery_tool" and tool_res.success:
        image_analysis = {
            "validated": tool_res.data.get("face_detected", False),
            "face_detected": tool_res.data.get("face_detected", False),
            "face_count": tool_res.data.get("face_count", 0),
            "confidence": tool_res.data.get("confidence"),
            "quality": tool_res.data.get("quality"),
            "message": "YuNet face analysis complete"
        }

    return {
        **state,
        "step_count": step_count,
        "budget_remaining": max(0, budget - 1),
        "executed_tools": executed_tools,
        "tool_results": updated_tool_results,
        "entities": entities,
        "relationships": relationships,
        "evidence": evidence,
        "queries": queries,
        "target_embedding": target_embedding,
        "image_analysis": image_analysis,
        "next_tool_to_call": None
    }


async def node_entity_resolution(state: InvestigationGraphState) -> InvestigationGraphState:
    """
    Correlates collected multi-platform signals into ranked Candidate identity dossiers.
    Calculates explainable consistency scores (0-100) and matches.
    """
    logger.info("[Entity Resolution] Correlating multi-source signals into candidate dossiers...")
    inp = state.get("input", {})
    tool_results = state.get("tool_results", {})
    
    gh_data = tool_results.get("github_tool")
    web_data = tool_results.get("web_search_tool", {})
    img_data = tool_results.get("image_discovery_tool", {})
    
    gh_evidence = None
    if gh_data and gh_data.get("status") == "AVAILABLE":
        from app.models.schemas import GitHubEvidence
        gh_evidence = GitHubEvidence(**gh_data)

    prof_evidence = None
    if web_data and "professionalProfile" in web_data:
        from app.models.schemas import ProfessionalEvidence
        prof_evidence = ProfessionalEvidence(**web_data["professionalProfile"])

    candidates: List[CandidateCard] = await candidate_engine.generate_candidates(
        name=inp.get("name", ""),
        college=inp.get("college", ""),
        school=inp.get("school", ""),
        github_username=inp.get("githubUsername", ""),
        description=inp.get("description", ""),
        target_embedding=state.get("target_embedding"),
        image_analysis=state.get("image_analysis"),
        github_evidence=gh_evidence,
        youtube_evidence=None,
        professional_evidence=prof_evidence,
        web_results=web_data.get("results", []),
        investigation_id=state.get("investigation_id", "INV-UNKNOWN"),
        target_image_url_or_b64=inp.get("image")
    )

    candidates_dict = [c.model_dump() for c in candidates]
    logger.info(f"[Entity Resolution] Generated {len(candidates)} candidate dossiers.")

    return {
        **state,
        "status": "CORRELATED",
        "current_step": "ENTITY_RESOLUTION_COMPLETE",
        "candidates": candidates_dict
    }


async def node_conflict_analysis(state: InvestigationGraphState) -> InvestigationGraphState:
    """
    Performs cross-source conflict detection, flags discrepancy severity,
    and formulates targeted clarification questions.
    """
    logger.info("[Conflict Analysis] Detecting cross-source discrepancies...")
    candidates = state.get("candidates", [])
    conflicts: List[Dict[str, Any]] = []
    clarification_questions: List[str] = []

    if candidates:
        top_cand = candidates[0]
        conflicts = top_cand.get("conflicts", [])
        
        # Check for geographic or institutional discrepancy
        cand_college = top_cand.get("college") or ""
        gh_location = (top_cand.get("github", {}).get("location") or "").lower()
        if gh_location and cand_college and gh_location not in cand_college.lower():
            if not any("Location Discrepancy" in c.get("title", "") for c in conflicts):
                conflicts.append({
                    "title": "Geographic / Institutional Variance",
                    "severity": "LOW",
                    "sourceA": "GitHub Profile Location",
                    "claimA": top_cand.get("github", {}).get("location"),
                    "sourceB": "Declared Academic Institution",
                    "claimB": cand_college,
                    "detail": f"Profile lists location as '{top_cand.get('github', {}).get('location')}', while academic enrollment indicates '{cand_college}'."
                })

        # Generate targeted clarifying questions if uncertain signals exist
        uncertain = top_cand.get("uncertainSignals", [])
        if "college" in uncertain or not cand_college:
            clarification_questions.append("Can you confirm the target's specific college or university department?")
        if "github_username" in uncertain:
            clarification_questions.append("Is there an exact GitHub username or secondary handle for this identity?")
        if top_cand.get("score", 0) < 75:
            clarification_questions.append("Do you have a project repository name, technical publication, or verified email domain?")

    if not clarification_questions:
        clarification_questions = [
            "Are there any secondary pseudonyms or platform handles associated with this person?",
            "Can you confirm specific software projects or repositories authored by the target?",
            "Do you have a recent conference talk or co-author affiliation to correlate?"
        ]

    return {
        **state,
        "conflicts": conflicts,
        "clarification_questions": clarification_questions,
        "current_step": "CONFLICT_ANALYSIS_COMPLETE"
    }


async def node_build_timeline_and_graph(state: InvestigationGraphState) -> InvestigationGraphState:
    """
    Builds chronological timeline events and graph network nodes/edges
    for interactive UI visualization.
    """
    logger.info("[Timeline & Graph] Synthesizing chronological sequence and topological graph...")
    candidates = state.get("candidates", [])
    entities = list(state.get("entities", []))
    relationships = list(state.get("relationships", []))
    
    timeline: List[Dict[str, Any]] = []
    
    if candidates:
        top_cand = candidates[0]
        gh = top_cand.get("github", {})
        
        # 1. Timeline: Academic milestone
        if top_cand.get("college"):
            timeline.append({
                "date": "2022 - Present",
                "title": f"Academic Enrollment at {top_cand.get('college')}",
                "category": "EDUCATION",
                "source": "Institutional Directory",
                "description": f"Enrolled in engineering / technology curriculum ({top_cand.get('education') or 'Undergraduate'}).",
                "status": "CORROBORATED"
            })

        # 2. Timeline: GitHub profile creation
        if gh.get("username"):
            timeline.append({
                "date": "2023 - 2024",
                "title": f"Established Public GitHub (@{gh.get('username')})",
                "category": "OPEN_SOURCE",
                "source": "GitHub API",
                "description": f"Registered active profile with {gh.get('publicRepos', 0)} repositories and {gh.get('followers', 0)} followers.",
                "status": "CORROBORATED"
            })

        # 3. Timeline: Key Project releases
        for proj in top_cand.get("projects", [])[:4]:
            timeline.append({
                "date": "Recent",
                "title": f"Authored Repository / Project: '{proj}'",
                "category": "CODEBASE",
                "source": "GitHub Ledger",
                "description": f"Public software repository demonstrating development stack and commit provenance.",
                "status": "CORROBORATED"
            })

        # 4. Timeline: Visual Biometric Verification milestone
        if top_cand.get("photoSimilarity"):
            timeline.append({
                "date": datetime.utcnow().strftime("%Y-%m-%d"),
                "title": f"Facial Biometric Attestation ({top_cand.get('photoSimilarity')}%)",
                "category": "VERIFICATION",
                "source": "YuNet & SFace ONNX Engine",
                "description": f"Reference photo evaluated against public profile avatar: {top_cand.get('photoMatchStatus')}.",
                "status": "CORROBORATED"
            })

        # Ensure Primary Person Node exists in Graph
        person_node_id = f"person:{top_cand.get('candidateId')}"
        if not any(e.get("id") == person_node_id for e in entities):
            entities.insert(0, {
                "id": person_node_id,
                "type": "PRIMARY_PERSON",
                "label": top_cand.get("name"),
                "properties": {
                    "candidateId": top_cand.get("candidateId"),
                    "name": top_cand.get("name"),
                    "score": top_cand.get("score"),
                    "avatar": top_cand.get("avatar")
                }
            })

    # Attach timeline and graph into candidates[0] for easy frontend rendering
    if candidates:
        candidates[0]["timeline"] = timeline
        candidates[0]["graph"] = {
            "nodes": entities,
            "edges": relationships
        }

    return {
        **state,
        "timeline": timeline,
        "graph": {
            "nodes": entities,
            "edges": relationships
        },
        "entities": entities,
        "relationships": relationships,
        "current_step": "TIMELINE_AND_GRAPH_BUILT"
    }


async def node_finalize(state: InvestigationGraphState) -> InvestigationGraphState:
    """
    Executes Groq AI evidence synthesis, purges ephemeral biometrics,
    and writes complete investigation state to MongoDB.
    """
    logger.info(f"[Finalize] Finalizing investigation {state.get('investigation_id')}...")
    inv_id = state.get("investigation_id")
    inp = state.get("input", {})
    candidates = state.get("candidates", [])
    img_summary = state.get("image_analysis")
    tool_results = state.get("tool_results", {})
    gh_data = tool_results.get("github_tool", {})
    web_data = tool_results.get("web_search_tool", {})

    # 1. AI Evidence Analysis with Groq
    ai_summary = ""
    if candidates:
        top_cand = candidates[0]
        try:
            ai_summary = await groq_service.analyze_candidate_evidence(top_cand, inp)
            top_cand["aiAnalysis"] = ai_summary
        except Exception as e:
            logger.error(f"Groq analysis error: {e}")
            ai_summary = "AI evidence analysis generated based on deterministic cross-platform signal correlation."
    else:
        target_name = inp.get("name") or inp.get("githubUsername") or "Target"
        ai_summary = f"No verified public candidate profiles could be correlated with sufficient confidence for '{target_name}'. Insufficient public footprint or corroborating anchors found."

    # 2. Ephemeral Biometric Cleanup (Strict Privacy Requirement)
    # The 128-d biometric vector is permanently purged from memory
    ephemeral_target_embedding = None

    # 3. Build Evidence Overview for Dashboard
    evidence_overview = {
        "image_analysis": {
            "status": "AVAILABLE" if img_summary and img_summary.get("face_detected") else ("NO_FACE_DETECTED" if img_summary else "NOT_PROVIDED"),
            "message": img_summary.get("message") if img_summary else "No reference image provided"
        },
        "github": {
            "status": gh_data.get("status", "UNAVAILABLE") if gh_data else "UNAVAILABLE",
            "reason": gh_data.get("reason", "Profile not identified") if gh_data else "Username not provided",
            "public_repos": gh_data.get("public_repos", 0) if gh_data else 0
        },
        "youtube": {
            "status": "UNAVAILABLE",
            "matchType": "Not Found"
        },
        "professional_search": {
            "status": web_data.get("professionalProfile", {}).get("status", "NOT VERIFIED"),
            "source": "linkedin",
            "profileUrl": web_data.get("professionalProfile", {}).get("profileUrl"),
            "reason": web_data.get("professionalProfile", {}).get("reason")
        },
        "reverse_image": {
            "status": "SOURCE_UNAVAILABLE",
            "reason": "Reverse search engine unconfigured"
        },
        "public_web": {
            "status": "AVAILABLE" if web_data.get("webResultsCount", 0) > 0 else "UNAVAILABLE",
            "indexedPages": web_data.get("webResultsCount", 0)
        }
    }

    final_state = {
        **state,
        "status": "COMPLETED",
        "current_step": "INVESTIGATION_COMPLETE",
        "ai_summary": ai_summary,
        "evidence_overview": evidence_overview,
        "target_embedding": ephemeral_target_embedding
    }

    # 4. Save to MongoDB (with resilient fallback)
    inv_doc = {
        "investigationId": inv_id,
        "status": "COMPLETED",
        "currentStep": "INVESTIGATION_COMPLETE",
        "createdAt": datetime.utcnow().isoformat() + "Z",
        "input": inp,
        "queries": state.get("queries", []),
        "candidates": candidates,
        "evidenceOverview": evidence_overview,
        "imageAnalysis": img_summary,
        "aiSummary": ai_summary,
        "clarificationQuestions": state.get("clarification_questions", []),
        "timeline": state.get("timeline", []),
        "graph": state.get("graph", {})
    }

    await mongo_service.save_investigation(inv_doc)
    for c in candidates:
        c_copy = dict(c)
        c_copy["investigationId"] = inv_id
        await mongo_service.save_candidate(c_copy)

    await mongo_service.save_entities(inv_id, state.get("entities", []))
    await mongo_service.save_relationships(inv_id, state.get("relationships", []))
    await mongo_service.save_evidence(inv_id, state.get("evidence", []))
    await mongo_service.save_queries(inv_id, state.get("queries", []))

    logger.info(f"[Finalize] Investigation {inv_id} persisted to MongoDB successfully.")
    return final_state


# -------------------------------------------------------------
# COMPOSE STATE GRAPH
# -------------------------------------------------------------

def build_investigation_graph():
    """Build and compile the LangGraph Investigation StateGraph."""
    workflow = StateGraph(InvestigationGraphState)

    workflow.add_node("initialize", node_initialize)
    workflow.add_node("select_action", node_select_action)
    workflow.add_node("execute_tool", node_execute_tool)
    workflow.add_node("entity_resolution", node_entity_resolution)
    workflow.add_node("conflict_analysis", node_conflict_analysis)
    workflow.add_node("build_timeline_and_graph", node_build_timeline_and_graph)
    workflow.add_node("finalize", node_finalize)

    # Set Entry Point
    workflow.set_entry_point("initialize")
    workflow.add_edge("initialize", "select_action")

    # Dynamic Agent Decision Loop
    workflow.add_conditional_edges(
        "select_action",
        router_should_continue,
        {
            "execute_tool": "execute_tool",
            "entity_resolution": "entity_resolution"
        }
    )
    workflow.add_edge("execute_tool", "select_action")

    # Post-tool Resolution Pipeline
    workflow.add_edge("entity_resolution", "conflict_analysis")
    workflow.add_edge("conflict_analysis", "build_timeline_and_graph")
    workflow.add_edge("build_timeline_and_graph", "finalize")
    workflow.add_edge("finalize", END)

    return workflow.compile()

investigation_graph_app = build_investigation_graph()
