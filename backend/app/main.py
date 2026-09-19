from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.models.schemas import InvestigationRequest, InvestigationResponse
from app.services.resolution_service import resolution_service

app = FastAPI(
    title="PRISM Intelligence API",
    description="Evidence-First Digital Identity Intelligence & Footprint Verification Engine",
    version=settings.VERSION
)

# Enable CORS for frontend dashboard
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Permits localhost Vite frontend
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {
        "system": "PRISM Digital Identity Intelligence Engine",
        "version": settings.VERSION,
        "status": "ONLINE",
        "hackathon": "NEURAX HACKATHON 3.0 (Domain 3: AI in Cybersecurity)"
    }

@app.get("/api/v1/health")
def health_check():
    return {
        "status": "HEALTHY",
        "github_api": "CONFIGURED" if settings.GITHUB_TOKEN else "UNAUTHENTICATED_RATE_LIMITED",
        "youtube_api": "CONFIGURED" if settings.YOUTUBE_API_KEY else "DISABLED",
        "groq_lpu": "ENABLED" if settings.GROQ_API_KEY else "RULE_BASED_FALLBACK"
    }

@app.post("/api/v1/investigate", response_model=InvestigationResponse)
async def investigate_endpoint(request: InvestigationRequest):
    if not request.consent_token:
        raise HTTPException(status_code=403, detail="Missing mandatory consent validation token.")
    return await resolution_service.run_investigation(request)

@app.get("/api/v1/demo-case", response_model=InvestigationResponse)
async def get_demo_case():
    demo_req = InvestigationRequest(
        seed_handle="alex-dev-sec",
        target_name="Alex Kumar",
        description="Lead DevSecOps Researcher working on zero-trust proxy and LLM safety",
        school_college="Stanford Institute of Technology",
        organization="Nexus Defense",
        consent_token="HACKATHON-NEURAX-3-CONSENT-VERIFIED"
    )
    return await resolution_service.run_investigation(demo_req)
