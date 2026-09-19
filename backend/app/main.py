from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime
from typing import Dict, Any, List, Optional
import uuid
import logging

from app.core.config import settings
from app.models.schemas import (
    InvestigationCreateRequest,
    InvestigationState,
    CandidateCard,
    InvestigationRequest,
    InvestigationResponse
)
from app.db.mongo import mongo_service
from app.graph.workflow import investigation_graph_app
from app.services.groq_service import groq_service

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("prism.main")

app = FastAPI(
    title="PRISM Intelligence API",
    description="Multi-Platform Digital Identity Intelligence & Provenance Verification Engine",
    version=settings.VERSION
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

import traceback
from fastapi.exceptions import RequestValidationError, ResponseValidationError
from fastapi.responses import JSONResponse

@app.exception_handler(ResponseValidationError)
async def response_validation_exception_handler(request, exc: ResponseValidationError):
    tb = traceback.format_exc()
    logger.error(f"ResponseValidationError on {request.url}:\n{tb}\nErrors: {exc.errors()}")
    return JSONResponse(
        status_code=500,
        content={"detail": "Response serialization error", "errors": str(exc.errors()), "traceback": tb},
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Allow-Methods": "*",
            "Access-Control-Allow-Headers": "*"
        }
    )

@app.exception_handler(Exception)
async def global_exception_handler(request, exc: Exception):
    tb = traceback.format_exc()
    logger.error(f"Global exception on {request.url}:\n{tb}")
    return JSONResponse(
        status_code=500,
        content={"detail": str(exc), "traceback": tb, "type": type(exc).__name__},
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Allow-Methods": "*",
            "Access-Control-Allow-Headers": "*"
        }
    )

# Resilient in-memory cache synchronized with MongoDB (strictly investigation scoped)
investigations_db: Dict[str, InvestigationState] = {}
candidates_db: Dict[str, CandidateCard] = {}


@app.on_event("startup")
async def startup_event():
    """Connect to MongoDB Atlas on startup and initialize schema indexes."""
    logger.info("Initializing PRISM backend and MongoDB Atlas connections...")
    await mongo_service.connect()


@app.on_event("shutdown")
async def shutdown_event():
    """Gracefully close MongoDB Atlas connections on shutdown."""
    logger.info("Closing PRISM backend and database connections...")
    await mongo_service.close()


# -------------------------------------------------------------
# CORE INVESTIGATION WORKFLOW ENGINE (LANGGRAPH AGENT)
# -------------------------------------------------------------
async def execute_full_investigation(inv_id: str):
    """Executes the LangGraph autonomous investigation workflow."""
    inv = investigations_db.get(inv_id)
    if not inv:
        db_doc = await mongo_service.get_investigation(inv_id)
        if db_doc:
            inv = InvestigationState(**db_doc)
            investigations_db[inv_id] = inv
        else:
            logger.error(f"Investigation {inv_id} not found in database or memory.")
            return

    inv.status = "INVESTIGATING"
    inv.currentStep = "STARTING_LANGGRAPH_AGENT"

    init_state = {
        "investigation_id": inv_id,
        "input": inv.input,
        "status": "INITIALIZING",
        "current_step": "INITIALIZING",
        "budget_remaining": 6,
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

    try:
        # Run autonomous LangGraph agent loop
        final_state = await investigation_graph_app.ainvoke(init_state)

        # Map and persist candidate cards (strictly investigation-scoped)
        candidates_list: List[CandidateCard] = []
        for c in final_state.get("candidates", []):
            card = CandidateCard(**c)
            candidates_list.append(card)
            card_dict = card.model_dump()
            card_dict["investigation_id"] = inv_id
            card_dict["investigationId"] = inv_id
            await mongo_service.save_candidate(card_dict)
            candidates_db[f"{inv_id}:{card.candidateId}"] = card
            candidates_db[card.candidateId] = card

        inv.candidates = candidates_list
        inv.status = "COMPLETED"
        inv.currentStep = "INVESTIGATION COMPLETE"
        inv.queries = final_state.get("queries", [])
        inv.evidenceOverview = final_state.get("evidence_overview", {})
        inv.imageAnalysis = final_state.get("image_analysis")
        inv.aiSummary = final_state.get("ai_summary", "")
        inv.clarificationQuestions = final_state.get("clarification_questions", [])
        inv.timeline = final_state.get("timeline", [])
        inv.graph = final_state.get("graph", {})

        # Persist discrete investigation collections
        if final_state.get("entities"):
            await mongo_service.save_entities(inv_id, final_state.get("entities", []))
        if final_state.get("relationships"):
            await mongo_service.save_relationships(inv_id, final_state.get("relationships", []))
        if final_state.get("evidence"):
            await mongo_service.save_evidence(inv_id, final_state.get("evidence", []))
        if final_state.get("queries"):
            await mongo_service.save_queries(inv_id, final_state.get("queries", []))

        investigations_db[inv_id] = inv
        await mongo_service.save_investigation(inv.model_dump())
        logger.info(f"Investigation {inv_id} completed successfully with {len(candidates_list)} candidates.")
    except Exception as e:
        logger.error(f"LangGraph investigation error for {inv_id}: {e}", exc_info=True)
        inv.status = "ERROR"
        inv.currentStep = f"FAILED: {str(e)}"
        investigations_db[inv_id] = inv
        await mongo_service.save_investigation(inv.model_dump())


# -------------------------------------------------------------
# REST API ENDPOINTS
# -------------------------------------------------------------
@app.get("/")
def read_root():
    return {
        "system": "PRISM Digital Identity Intelligence Engine",
        "version": settings.VERSION,
        "status": "ONLINE",
        "orchestration": "LANGGRAPH_AUTONOMOUS_AGENT",
        "database": {
            "status": "connected" if mongo_service.is_connected else "unavailable",
            "mode": "MONGODB_ATLAS" if mongo_service.is_connected else "IN_MEMORY_FALLBACK",
            "name": settings.MONGODB_DB_NAME
        },
        "vision_pipeline": "OPENCV_YUNET_SFACE_ONNX",
        "apis": {
            "github": "CONFIGURED" if settings.GITHUB_TOKEN else "UNAUTHENTICATED",
            "youtube": "CONFIGURED" if settings.YOUTUBE_API_KEY else "DISABLED",
            "groq_lpu": "ENABLED" if settings.GROQ_API_KEY else "RULE_BASED_FALLBACK"
        }
    }

@app.get("/api/v1/health")
@app.get("/health")
def health_check():
    return {
        "status": "HEALTHY",
        "orchestration": "LANGGRAPH_STATEGRAPH_AGENT",
        "database": {
            "status": "connected" if mongo_service.is_connected else "unavailable",
            "mode": "MONGODB_ATLAS" if mongo_service.is_connected else "IN_MEMORY_FALLBACK",
            "name": settings.MONGODB_DB_NAME
        },
        "vision_pipeline": "OPENCV_YUNET_SFACE_ONNX",
        "github_api": "CONFIGURED" if settings.GITHUB_TOKEN else "UNAUTHENTICATED",
        "youtube_api": "CONFIGURED" if settings.YOUTUBE_API_KEY else "DISABLED",
        "groq_lpu": "ENABLED" if settings.GROQ_API_KEY else "FALLBACK"
    }

@app.post("/api/v1/investigations", response_model=InvestigationState)
@app.post("/investigations", response_model=InvestigationState)
async def create_investigation(req: InvestigationCreateRequest):
    inv_id = f"INV-{uuid.uuid4().hex[:8].upper()}"
    now_str = datetime.utcnow().isoformat() + "Z"

    state = InvestigationState(
        investigationId=inv_id,
        status="INITIALIZING",
        currentStep="INITIALIZING",
        createdAt=now_str,
        input=req.model_dump(),
        queries=[],
        candidates=[],
        evidenceOverview={},
        imageAnalysis=None,
        aiSummary="",
        clarificationQuestions=[
            "Do you know the person's college or university?",
            "Do you know their GitHub username?",
            "Do you have a project name or target photo to correlate?"
        ],
        timeline=[],
        graph={"nodes": [], "edges": []}
    )
    investigations_db[inv_id] = state
    await mongo_service.save_investigation(state.model_dump())
    return state

@app.post("/api/v1/investigations/{inv_id}/run", response_model=InvestigationState)
@app.post("/investigations/{inv_id}/run", response_model=InvestigationState)
async def run_investigation_endpoint(inv_id: str):
    if inv_id not in investigations_db:
        db_doc = await mongo_service.get_investigation(inv_id)
        if not db_doc:
            raise HTTPException(status_code=404, detail="Investigation ID not found")
        investigations_db[inv_id] = InvestigationState(**db_doc)

    await execute_full_investigation(inv_id)
    return investigations_db[inv_id]

@app.get("/api/v1/investigations/{inv_id}", response_model=InvestigationState)
@app.get("/investigations/{inv_id}", response_model=InvestigationState)
async def get_investigation(inv_id: str):
    if inv_id in investigations_db:
        return investigations_db[inv_id]
    doc = await mongo_service.get_investigation(inv_id)
    if doc:
        inv = InvestigationState(**doc)
        investigations_db[inv_id] = inv
        return inv
    raise HTTPException(status_code=404, detail="Investigation ID not found")

@app.get("/api/v1/investigations/{inv_id}/candidates", response_model=List[CandidateCard])
@app.get("/investigations/{inv_id}/candidates", response_model=List[CandidateCard])
async def get_investigation_candidates(inv_id: str):
    if inv_id in investigations_db:
        return investigations_db[inv_id].candidates
    docs = await mongo_service.get_investigation_candidates(inv_id)
    if docs:
        return [CandidateCard(**d) for d in docs]
    raise HTTPException(status_code=404, detail="Investigation ID not found")

@app.get("/api/v1/candidates/{cand_id}", response_model=CandidateCard)
@app.get("/candidates/{cand_id}", response_model=CandidateCard)
async def get_candidate(cand_id: str, inv_id: Optional[str] = None):
    if inv_id and f"{inv_id}:{cand_id}" in candidates_db:
        return candidates_db[f"{inv_id}:{cand_id}"]
    if cand_id in candidates_db:
        return candidates_db[cand_id]
    doc = await mongo_service.get_candidate(cand_id, inv_id=inv_id)
    if doc:
        cand = CandidateCard(**doc)
        if inv_id:
            candidates_db[f"{inv_id}:{cand_id}"] = cand
        candidates_db[cand_id] = cand
        return cand
    raise HTTPException(status_code=404, detail="Candidate not found")

@app.post("/api/v1/candidates/{cand_id}/analyze")
@app.post("/candidates/{cand_id}/analyze")
async def analyze_candidate_endpoint(cand_id: str, input_context: Optional[Dict[str, Any]] = None):
    cand = candidates_db.get(cand_id)
    if not cand:
        doc = await mongo_service.get_candidate(cand_id)
        if doc:
            cand = CandidateCard(**doc)
            candidates_db[cand_id] = cand
    if not cand:
        raise HTTPException(status_code=404, detail="Candidate not found")
    
    analysis = await groq_service.analyze_candidate_evidence(
        cand.model_dump(),
        input_context or {}
    )
    cand.aiAnalysis = analysis
    await mongo_service.save_candidate(cand.model_dump())
    return {"candidateId": cand_id, "aiAnalysis": analysis}

@app.post("/api/v1/investigations/{inv_id}/clarify", response_model=InvestigationState)
@app.post("/investigations/{inv_id}/clarify", response_model=InvestigationState)
async def clarify_investigation(inv_id: str, clarification: Dict[str, Any]):
    if inv_id not in investigations_db:
        doc = await mongo_service.get_investigation(inv_id)
        if not doc:
            raise HTTPException(status_code=404, detail="Investigation ID not found")
        investigations_db[inv_id] = InvestigationState(**doc)

    inv = investigations_db[inv_id]
    for k, v in clarification.items():
        if v:
            inv.input[k] = v
    await execute_full_investigation(inv_id)
    return inv

# -------------------------------------------------------------
# GRAPH & TIMELINE INTERACTIVE VISUALIZATION ENDPOINTS
# -------------------------------------------------------------
@app.get("/api/v1/investigations/{inv_id}/graph")
@app.get("/investigations/{inv_id}/graph")
async def get_investigation_graph_endpoint(inv_id: str):
    inv = investigations_db.get(inv_id)
    if inv and inv.graph:
        return inv.graph
    graph = await mongo_service.get_graph(inv_id)
    return graph

@app.get("/api/v1/investigations/{inv_id}/timeline")
@app.get("/investigations/{inv_id}/timeline")
async def get_investigation_timeline_endpoint(inv_id: str):
    inv = investigations_db.get(inv_id)
    if inv and inv.timeline:
        return inv.timeline
    cands = await mongo_service.get_investigation_candidates(inv_id)
    if cands and len(cands) > 0 and "timeline" in cands[0]:
        return cands[0]["timeline"]
    return []

@app.get("/api/v1/investigations/{inv_id}/entities")
async def get_investigation_entities_endpoint(inv_id: str):
    return await mongo_service.get_entities(inv_id)

@app.get("/api/v1/investigations/{inv_id}/evidence")
async def get_investigation_evidence_endpoint(inv_id: str):
    return await mongo_service.get_evidence(inv_id)

@app.get("/api/v1/investigations/{inv_id}/queries")
async def get_investigation_queries_endpoint(inv_id: str):
    return await mongo_service.get_queries(inv_id)


# -------------------------------------------------------------
# BACKWARD COMPATIBILITY ENDPOINTS (For legacy dashboard components)
# -------------------------------------------------------------
@app.post("/api/v1/investigate")
async def legacy_investigate(req: InvestigationRequest):
    inv_id = f"INV-{uuid.uuid4().hex[:8].upper()}"
    now_str = datetime.utcnow().isoformat() + "Z"
    
    norm_input = {
        "name": req.target_name or req.name or req.seed_handle,
        "college": req.school_college or req.college,
        "school": req.school,
        "githubUsername": req.seed_handle or req.githubUsername,
        "description": req.description,
        "image": req.image
    }

    inv_state = InvestigationState(
        investigationId=inv_id,
        status="INITIALIZING",
        currentStep="INITIALIZING",
        createdAt=now_str,
        input=norm_input,
        queries=[],
        candidates=[],
        evidenceOverview={},
        imageAnalysis=None,
        aiSummary="",
        clarificationQuestions=[],
        timeline=[],
        graph={"nodes": [], "edges": []}
    )
    investigations_db[inv_id] = inv_state
    await execute_full_investigation(inv_id)
    
    completed_inv = investigations_db[inv_id]
    return {
        "investigation_id": inv_id,
        "status": "COMPLETED",
        "created_at": now_str,
        "query_summary": norm_input,
        "candidates": [c.model_dump() for c in completed_inv.candidates],
        "primary_candidate_id": "CAND-01",
        "total_conflicts_detected": len(completed_inv.candidates[0].conflicts) if completed_inv.candidates else 0,
        "clarification_questions": completed_inv.clarificationQuestions,
        "evidenceOverview": completed_inv.evidenceOverview,
        "aiSummary": completed_inv.aiSummary,
        "timeline": completed_inv.timeline,
        "graph": completed_inv.graph
    }

@app.get("/api/v1/dashboard/stats")
def get_dashboard_stats():
    return {
        "kpis": {
            "targets": {"value": "1,644", "raw": 1644, "delta": "+6.8%", "period": "vs. previous period", "type": "positive"},
            "confidence": {"value": "84.2%", "raw": 84.2, "delta": "+2.8%", "period": "vs. previous period", "type": "positive"},
            "evidence": {"value": "29,511", "raw": 29511, "delta": "+3.8%", "period": "vs. previous period", "type": "positive"},
            "discrepancies": {"value": "18", "raw": 18, "delta": "-4.2%", "period": "vs. previous period", "type": "neutral"}
        }
    }
