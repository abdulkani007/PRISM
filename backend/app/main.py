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
from app.services.face_service import face_service
from app.services.github_service import github_service
from app.services.youtube_service import youtube_service
from app.services.search_service import search_service
from app.services.candidate_engine import candidate_engine
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

# In-memory store for investigations and candidates
investigations_db: Dict[str, InvestigationState] = {}
candidates_db: Dict[str, CandidateCard] = {}

# -------------------------------------------------------------
# CORE INVESTIGATION EXECUTION ENGINE
# -------------------------------------------------------------
async def execute_full_investigation(inv_id: str):
    inv = investigations_db.get(inv_id)
    if not inv:
        return

    inp = inv.input
    name = (inp.get("name") or inp.get("target_name") or "").strip()
    college = (inp.get("college") or inp.get("school_college") or "").strip()
    school = (inp.get("school") or "").strip()
    github_user = (inp.get("githubUsername") or inp.get("seed_handle") or "").strip().lstrip('@')
    desc = (inp.get("description") or "").strip()
    raw_image = inp.get("image")

    # Step 1: Authorized Image Analysis (Section 1)
    target_embedding = None
    image_analysis_summary = None
    if raw_image:
        inv.status = "ANALYZING_IMAGE"
        inv.currentStep = "IMAGE ANALYSIS"
        img_res = face_service.analyze_face(raw_image)
        
        # Privacy: Keep 128-d embedding strictly ephemeral in local memory during execution
        target_embedding = img_res.get("embedding")
        
        image_analysis_summary = {
            "validated": img_res.get("validated", False),
            "face_detected": img_res.get("face_detected", False),
            "face_count": img_res.get("face_count", 0),
            "confidence": img_res.get("confidence"),
            "quality": img_res.get("quality"),
            "message": img_res.get("message", "Processed")
        }
        inv.imageAnalysis = image_analysis_summary
        logger.info(f"Image analysis for {inv_id}: face_detected={img_res.get('face_detected')}, quality={img_res.get('quality')}")

    # Step 2: Context Search Query Generation (Section 3)
    inv.status = "SEARCHING"
    inv.currentStep = "TEXT SEARCH"
    queries = search_service.generate_queries(
        name=name,
        college=college,
        school=school,
        github_username=github_user,
        description=desc
    )
    inv.queries = queries

    # Step 3: GitHub Search (Real API, Section 5)
    inv.currentStep = "GITHUB SEARCH"
    gh_evidence = None
    if github_user:
        gh_evidence = await github_service.analyze_user_intelligence(github_user)
    elif name:
        # Search GitHub users for name if username omitted
        users = await github_service.search_users(name, limit=1)
        if users:
            gh_evidence = await github_service.analyze_user_intelligence(users[0]["login"])

    # Step 4: YouTube Search (Real API, Section 6)
    inv.currentStep = "YOUTUBE SEARCH"
    yt_query = f'"{name}" "{college}"' if (name and college) else (f'"{name}"' if name else github_user)
    yt_evidence = await youtube_service.search_channels_and_videos(yt_query, target_name=name)

    # Step 5: Professional & Public Web Search (LinkedIn discovery, Section 4)
    inv.currentStep = "PROFESSIONAL SEARCH"
    web_results = await search_service.search_public_web(queries)
    prof_evidence = await search_service.search_professional_profile(
        name=name,
        college=college,
        github_username=github_user,
        description=desc
    )

    # Step 6: Reverse Image Occurrence Search (Section 8)
    reverse_image_results = await search_service.search_reverse_image_occurrences(raw_image)

    # Step 7: Candidate Generation & Photo Comparison (Section 7, 9, 10, 11)
    inv.status = "CORRELATING"
    inv.currentStep = "PROFILE CORRELATION"
    
    inv.status = "GENERATING_CANDIDATES"
    inv.currentStep = "CANDIDATE GENERATION"
    candidates = await candidate_engine.generate_candidates(
        name=name,
        college=college,
        school=school,
        github_username=github_user,
        description=desc,
        target_embedding=target_embedding,
        image_analysis=image_analysis_summary,
        github_evidence=gh_evidence,
        youtube_evidence=yt_evidence,
        professional_evidence=prof_evidence,
        web_results=web_results
    )

    # Ephemeral Biometric Cleanup: Discard temporary face embedding from memory (Section 1)
    target_embedding = None

    # Step 8: AI Evidence Analysis using Groq (Section 12)
    inv.status = "ANALYZING"
    inv.currentStep = "AI ANALYSIS"
    if candidates:
        top_cand = candidates[0]
        ai_summary = await groq_service.analyze_candidate_evidence(top_cand.model_dump(), inp)
        top_cand.aiAnalysis = ai_summary
        inv.aiSummary = ai_summary

    # Store candidates in database
    for c in candidates:
        candidates_db[c.candidateId] = c

    inv.candidates = candidates
    inv.evidenceOverview = {
        "image_analysis": {
            "status": "AVAILABLE" if image_analysis_summary and image_analysis_summary.get("face_detected") else ("NO_FACE_DETECTED" if image_analysis_summary else "NOT_PROVIDED"),
            "message": image_analysis_summary.get("message") if image_analysis_summary else "No image uploaded for visual comparison"
        },
        "github": {
            "status": gh_evidence.status if gh_evidence else "UNAVAILABLE",
            "reason": gh_evidence.reason if gh_evidence else "Username not provided",
            "public_repos": gh_evidence.totalRepositories if gh_evidence else 0
        },
        "youtube": {
            "status": yt_evidence.status if yt_evidence else "UNAVAILABLE",
            "matchType": yt_evidence.matchType if yt_evidence else "Not Found"
        },
        "professional_search": {
            "status": prof_evidence.status,
            "source": "linkedin",
            "profileUrl": prof_evidence.profileUrl,
            "reason": prof_evidence.reason
        },
        "reverse_image": {
            "status": reverse_image_results.get("status", "SOURCE_UNAVAILABLE"),
            "reason": reverse_image_results.get("reason", "Reverse search unconfigured")
        },
        "public_web": {
            "status": "AVAILABLE" if web_results else "UNAVAILABLE",
            "indexedPages": len(web_results)
        }
    }
    
    inv.status = "COMPLETED"
    inv.currentStep = "INVESTIGATION COMPLETE"


# -------------------------------------------------------------
# REST API ENDPOINTS
# -------------------------------------------------------------
@app.get("/")
def read_root():
    return {
        "system": "PRISM Digital Identity Intelligence Engine",
        "version": settings.VERSION,
        "status": "ONLINE",
        "vision_pipeline": "OPENCV_YUNET_SFACE_ONNX",
        "apis": {
            "github": "CONFIGURED" if settings.GITHUB_TOKEN else "UNAUTHENTICATED",
            "youtube": "CONFIGURED" if settings.YOUTUBE_API_KEY else "DISABLED",
            "groq_lpu": "ENABLED" if settings.GROQ_API_KEY else "RULE_BASED_FALLBACK"
        }
    }

@app.get("/api/v1/health")
def health_check():
    return {
        "status": "HEALTHY",
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
        ]
    )
    investigations_db[inv_id] = state
    return state

@app.post("/api/v1/investigations/{inv_id}/run", response_model=InvestigationState)
@app.post("/investigations/{inv_id}/run", response_model=InvestigationState)
async def run_investigation_endpoint(inv_id: str):
    if inv_id not in investigations_db:
        raise HTTPException(status_code=404, detail="Investigation ID not found")
    await execute_full_investigation(inv_id)
    return investigations_db[inv_id]

@app.get("/api/v1/investigations/{inv_id}", response_model=InvestigationState)
@app.get("/investigations/{inv_id}", response_model=InvestigationState)
def get_investigation(inv_id: str):
    if inv_id not in investigations_db:
        raise HTTPException(status_code=404, detail="Investigation ID not found")
    return investigations_db[inv_id]

@app.get("/api/v1/investigations/{inv_id}/candidates", response_model=List[CandidateCard])
@app.get("/investigations/{inv_id}/candidates", response_model=List[CandidateCard])
def get_investigation_candidates(inv_id: str):
    if inv_id not in investigations_db:
        raise HTTPException(status_code=404, detail="Investigation ID not found")
    return investigations_db[inv_id].candidates

@app.get("/api/v1/candidates/{cand_id}", response_model=CandidateCard)
@app.get("/candidates/{cand_id}", response_model=CandidateCard)
def get_candidate(cand_id: str):
    cand = candidates_db.get(cand_id)
    if not cand:
        raise HTTPException(status_code=404, detail="Candidate not found")
    return cand

@app.post("/api/v1/candidates/{cand_id}/analyze")
@app.post("/candidates/{cand_id}/analyze")
async def analyze_candidate_endpoint(cand_id: str, input_context: Optional[Dict[str, Any]] = None):
    cand = candidates_db.get(cand_id)
    if not cand:
        raise HTTPException(status_code=404, detail="Candidate not found")
    
    analysis = await groq_service.analyze_candidate_evidence(
        cand.model_dump(),
        input_context or {}
    )
    cand.aiAnalysis = analysis
    return {"candidateId": cand_id, "aiAnalysis": analysis}

@app.post("/api/v1/investigations/{inv_id}/clarify", response_model=InvestigationState)
@app.post("/investigations/{inv_id}/clarify", response_model=InvestigationState)
async def clarify_investigation(inv_id: str, clarification: Dict[str, Any]):
    if inv_id not in investigations_db:
        raise HTTPException(status_code=404, detail="Investigation ID not found")
    inv = investigations_db[inv_id]
    for k, v in clarification.items():
        if v:
            inv.input[k] = v
    await execute_full_investigation(inv_id)
    return inv

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
        clarificationQuestions=[]
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
        "aiSummary": completed_inv.aiSummary
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
