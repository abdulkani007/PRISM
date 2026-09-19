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

@app.get("/api/v1/dashboard/stats")
def get_dashboard_stats():
    return {
        "kpis": {
            "targets": {"value": "1,644", "raw": 1644, "delta": "+6.8%", "period": "vs. previous period", "type": "positive"},
            "confidence": {"value": "84.2%", "raw": 84.2, "delta": "+2.8%", "period": "vs. previous period", "type": "positive"},
            "evidence": {"value": "29,511", "raw": 29511, "delta": "+3.8%", "period": "vs. previous period", "type": "positive"},
            "discrepancies": {"value": "18", "raw": 18, "delta": "-4.2%", "period": "vs. previous period", "type": "neutral"}
        },
        "target_investigations": [
            {
                "id": "TGT-101",
                "name": "Alex Kumar",
                "seed": "alex-dev-sec",
                "matches": 3,
                "confidence": 86,
                "status": "Corroborated with Conflict",
                "org": "Nexus Defense / CyberShield Labs",
                "evidence_count": 8,
                "last_active": "14 min ago"
            },
            {
                "id": "TGT-102",
                "name": "Dr. Elena Rostova",
                "seed": "e-rostova-ai",
                "matches": 2,
                "confidence": 94,
                "status": "Verified Ground Truth",
                "org": "Stanford NLP & Systems Lab",
                "evidence_count": 14,
                "last_active": "1 hour ago"
            },
            {
                "id": "TGT-103",
                "name": "Marcus Vance",
                "seed": "vance_cyberops",
                "matches": 4,
                "confidence": 68,
                "status": "Namespace Collision",
                "org": "Apex Infrastructure",
                "evidence_count": 5,
                "last_active": "4 hours ago"
            },
            {
                "id": "TGT-104",
                "name": "Liam O'Connor",
                "seed": "liam-sec-lab",
                "matches": 1,
                "confidence": 91,
                "status": "Verified Ground Truth",
                "org": "Horizon Threat Labs",
                "evidence_count": 11,
                "last_active": "1 day ago"
            },
            {
                "id": "TGT-105",
                "name": "Maya Lin",
                "seed": "mlin_crypto",
                "matches": 2,
                "confidence": 76,
                "status": "Corroborated with Conflict",
                "org": "ZeroTrust Protocols",
                "evidence_count": 6,
                "last_active": "2 days ago"
            }
        ],
        "provenance_breakdown": {
            "sources": [
                {"name": "GitHub Authenticated REST API", "count": "14,210", "type": "Code & Bio Signatures", "status": "Active"},
                {"name": "Academic Preprints (arXiv / DBLP)", "count": "8,420", "type": "Author & Citation Index", "status": "Active"},
                {"name": "Conference & Keynote Transcripts", "count": "4,110", "type": "Speaker & Topic Corpus", "status": "Active"},
                {"name": "Corporate & Registry Filings", "count": "2,771", "type": "Public Domain Disclosures", "status": "Active"}
            ],
            "integrity": {
                "sha256_verified": "29,511",
                "unverified_claims": "42",
                "tamper_evident_status": "100% OK"
            }
        },
        "overview": {
            "initials": "25,568",
            "rebills": "19,828",
            "straight_sales": "6,253",
            "labels": {
                "initials": "Total Evaluated",
                "rebills": "Corroborated Match",
                "straight_sales": "Flagged Discrepancies"
            },
            "timeline": [
                {"month": "Jan", "value": 1600, "corroborated": 1100, "discrepancies": 320},
                {"month": "Feb", "value": 3200, "corroborated": 2400, "discrepancies": 450},
                {"month": "Mar", "value": 2700, "corroborated": 2100, "discrepancies": 380},
                {"month": "Apr", "value": 3800, "corroborated": 3000, "discrepancies": 510},
                {"month": "May", "value": 2600, "corroborated": 1950, "discrepancies": 410},
                {"month": "Jun", "value": 4300, "corroborated": 3450, "discrepancies": 590},
                {"month": "Jul", "value": 2900, "corroborated": 2200, "discrepancies": 460},
                {"month": "Aug", "value": 3900, "corroborated": 3100, "discrepancies": 520},
                {"month": "Sep", "value": 3100, "corroborated": 2400, "discrepancies": 440},
                {"month": "Oct", "value": 3500, "corroborated": 2800, "discrepancies": 480},
                {"month": "Nov", "value": 4200, "corroborated": 3350, "discrepancies": 540},
                {"month": "Dec", "value": 3600, "corroborated": 2900, "discrepancies": 490}
            ]
        }
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
