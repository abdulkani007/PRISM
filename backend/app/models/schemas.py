from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class RepositoryInfo(BaseModel):
    name: str
    description: Optional[str] = None
    url: str
    language: Optional[str] = None
    stars: int = 0
    forks: int = 0
    topics: List[str] = []
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

class GitHubEvidence(BaseModel):
    status: str = "AVAILABLE"  # "AVAILABLE" | "UNAVAILABLE"
    reason: Optional[str] = None
    username: Optional[str] = None
    name: Optional[str] = None
    avatar: Optional[str] = None
    bio: Optional[str] = None
    public_repos: int = 0
    followers: int = 0
    following: int = 0
    company: Optional[str] = None
    location: Optional[str] = None
    blog: Optional[str] = None
    twitter: Optional[str] = None
    profile_url: Optional[str] = None
    totalRepositories: int = 0
    topProjects: List[str] = []
    languages: List[str] = []
    recentProjects: List[str] = []
    projectKeywords: List[str] = []
    repositories: List[RepositoryInfo] = []

class YouTubeVideo(BaseModel):
    title: str
    channelTitle: str
    description: Optional[str] = None
    publishedAt: Optional[str] = None
    videoId: Optional[str] = None
    url: Optional[str] = None

class YouTubeEvidence(BaseModel):
    status: str = "AVAILABLE"  # "AVAILABLE" | "UNAVAILABLE"
    reason: Optional[str] = None
    matchType: str = "Possible Match"  # "Possible Match" | "Corroborated Match" | "Not Found"
    channelName: Optional[str] = None
    channelUrl: Optional[str] = None
    description: Optional[str] = None
    subscribers: Optional[str] = None
    videoCount: Optional[int] = None
    videos: List[YouTubeVideo] = []

class ProfessionalEvidence(BaseModel):
    status: str = "NOT VERIFIED"  # "CORROBORATED" | "POSSIBLE_MATCH" | "NOT_FOUND" | "NOT VERIFIED" | "UNAVAILABLE"
    source: str = "linkedin"
    reason: Optional[str] = "Search API not configured"
    name: Optional[str] = None
    headline: Optional[str] = None
    college: Optional[str] = None
    school: Optional[str] = None
    company: Optional[str] = None
    role: Optional[str] = None
    education: List[str] = []
    experience: List[str] = []
    skills: List[str] = []
    projects: List[str] = []
    achievements: List[str] = []
    evidence: List[str] = []
    profileUrl: Optional[str] = None

class WebSearchResult(BaseModel):
    source: str
    title: str
    url: str
    snippet: str
    matchedQuery: str

class ClaimEvidence(BaseModel):
    claim: str
    evidenceSource: str
    evidenceDetail: str
    sourceUrl: Optional[str] = None
    status: str = "CORROBORATED"  # "CORROBORATED" | "UNVERIFIED" | "REQUIRES VERIFICATION"

class ConflictItem(BaseModel):
    title: str
    severity: str = "MEDIUM"
    sourceA: str
    claimA: str
    sourceB: str
    claimB: str
    detail: str

class CandidateCard(BaseModel):
    candidateId: str
    investigationId: Optional[str] = None
    creationReason: str = "Discovered digital footprint correlation"
    identityAnchors: List[str] = []
    name: str
    avatar: Optional[str] = None
    possibleRole: str = "Developer / Technology Student"
    education: Optional[str] = None
    school: Optional[str] = None
    college: Optional[str] = None
    github: Dict[str, Any] = {}
    youtube: Dict[str, Any] = {}
    professionalProfile: Dict[str, Any] = {}
    projects: List[str] = []
    skills: List[str] = []
    achievements: List[str] = []
    sources: List[Dict[str, Any]] = []
    evidence: List[ClaimEvidence] = []
    conflicts: List[ConflictItem] = []
    score: int = 50  # 0 to 100 explainable consistency
    matchLevel: str = "Possible Match"  # "Strong Match" | "Moderate Match" | "Possible Match"
    matchedSignals: List[str] = []
    uncertainSignals: List[str] = []
    photoSimilarity: Optional[int] = None
    photoMatchStatus: Optional[str] = None
    photoEvidence: Optional[Dict[str, Any]] = None
    reverseImageMatches: List[Dict[str, Any]] = []
    aiAnalysis: str = ""
    timeline: List[Dict[str, Any]] = []
    graph: Optional[Dict[str, Any]] = None

class InvestigationCreateRequest(BaseModel):
    name: Optional[str] = None
    college: Optional[str] = None
    school: Optional[str] = None
    githubUsername: Optional[str] = None
    description: Optional[str] = None
    image: Optional[Any] = None
    # Backwards compatibility fields with existing endpoints
    seed_handle: Optional[str] = None
    target_name: Optional[str] = None
    school_college: Optional[str] = None
    organization: Optional[str] = None
    consent_token: Optional[str] = "PRISM-CONSENT-VERIFIED"

class InvestigationState(BaseModel):
    investigationId: str
    status: str  # "INITIALIZING" | "SEARCHING" | "CORRELATING" | "GENERATING_CANDIDATES" | "ANALYZING" | "COMPLETED"
    currentStep: str
    createdAt: str
    input: Dict[str, Any]
    queries: List[Dict[str, Any]] = []
    candidates: List[CandidateCard] = []
    evidenceOverview: Dict[str, Any] = {}
    imageAnalysis: Optional[Dict[str, Any]] = None
    aiSummary: str = ""
    clarificationQuestions: List[str] = []
    timeline: List[Dict[str, Any]] = []
    graph: Optional[Dict[str, Any]] = None

# Backwards compatibility schemas for existing resolution_service callers
class EvidenceRecord(BaseModel):
    evidence_id: str
    source_provider: str
    source_url: str
    source_type: str
    observed_at: str
    extracted_fact: str
    confidence_weight: float = 0.8

class ConflictRecord(BaseModel):
    conflict_id: str
    attribute_name: str
    claim_a: str
    source_a: str
    claim_b: str
    source_b: str
    severity: str = "MEDIUM"
    action_required: str = "Requires Investigator Verification"

class ProfileLink(BaseModel):
    platform: str
    url: str
    handle: str
    status: str = "CORROBORATED"
    metrics: Dict[str, Any] = {}

class CandidateIdentity(BaseModel):
    candidate_id: str
    canonical_name: str
    primary_handle: str
    education: Optional[str] = None
    organization: Optional[str] = None
    role: Optional[str] = None
    confidence_score: float
    status: str = "PROBABLE"
    profiles: List[ProfileLink] = []
    evidence_trail: List[EvidenceRecord] = []
    conflicts: List[ConflictRecord] = []

class InvestigationRequest(InvestigationCreateRequest):
    pass

class InvestigationResponse(BaseModel):
    investigation_id: str
    status: str
    created_at: str
    query_summary: Dict[str, Any]
    candidates: List[Any]
    primary_candidate_id: Optional[str] = None
    total_conflicts_detected: int = 0
    clarification_questions: List[str] = []
