from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

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

class InvestigationRequest(BaseModel):
    seed_handle: str
    target_name: Optional[str] = None
    description: Optional[str] = None
    school_college: Optional[str] = None
    organization: Optional[str] = None
    consent_token: str = Field(..., description="Consent validation token confirming authorized scope")

class InvestigationResponse(BaseModel):
    investigation_id: str
    status: str
    created_at: str
    query_summary: Dict[str, Any]
    candidates: List[CandidateIdentity]
    primary_candidate_id: Optional[str] = None
    total_conflicts_detected: int = 0
    clarification_questions: List[str] = []
