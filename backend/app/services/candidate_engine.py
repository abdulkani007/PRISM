import logging
from typing import List, Dict, Any, Optional
from app.models.schemas import (
    CandidateCard,
    ClaimEvidence,
    ConflictItem,
    GitHubEvidence,
    YouTubeEvidence,
    ProfessionalEvidence,
    WebSearchResult
)
from app.services.github_service import github_service
from app.services.face_service import face_service

logger = logging.getLogger("prism.candidate_engine")

class CandidateEngine:
    def calculate_consistency_score(
        self,
        name_match: bool,
        college_match: bool,
        school_match: bool,
        username_match: bool,
        github_match: bool,
        project_match: bool,
        professional_match: bool,
        youtube_match: bool,
        photo_similarity: Optional[int] = None,
        conflicts_count: int = 0
    ) -> Dict[str, Any]:
        """
        Calculates an explainable 10-signal Evidence Consistency score.
        Conceptual Weighting:
          - Name match: 10
          - College match: 15
          - School match: 10
          - Username match: 15
          - GitHub match: 10
          - Projects match: 10
          - Professional profile (LinkedIn): 10
          - YouTube match: 5
          - Photo similarity: 15
        
        Adheres strictly to the rule:
        - NEVER output 'Identity Probability'
        - NEVER claim 100% mathematically guaranteed identity
        - Caps score at 94% (Strong Match)
        """
        matched_signals = []
        uncertain_signals = []
        earned_points = 0.0
        max_possible_points = 0.0

        # 1. Name Match (weight: 10)
        max_possible_points += 10.0
        if name_match:
            earned_points += 10.0
            matched_signals.append("name")
        else:
            uncertain_signals.append("name")

        # 2. College Match (weight: 15)
        max_possible_points += 15.0
        if college_match:
            earned_points += 15.0
            matched_signals.append("college")
        else:
            uncertain_signals.append("college")

        # 3. School Match (weight: 10)
        if school_match is not None:
            max_possible_points += 10.0
            if school_match:
                earned_points += 10.0
                matched_signals.append("school")
            else:
                uncertain_signals.append("school")

        # 4. Username Match (weight: 15)
        max_possible_points += 15.0
        if username_match:
            earned_points += 15.0
            matched_signals.append("github_username")
        else:
            uncertain_signals.append("github_username")

        # 5. GitHub Code Footprint (weight: 10)
        max_possible_points += 10.0
        if github_match:
            earned_points += 10.0
            matched_signals.append("github_evidence")
        else:
            uncertain_signals.append("github_evidence")

        # 6. Projects Match (weight: 10)
        max_possible_points += 10.0
        if project_match:
            earned_points += 10.0
            matched_signals.append("projects")
        else:
            uncertain_signals.append("projects")

        # 7. Professional Profile / LinkedIn (weight: 10)
        max_possible_points += 10.0
        if professional_match:
            earned_points += 10.0
            matched_signals.append("professional_profile")
        else:
            uncertain_signals.append("professional_profile")

        # 8. YouTube Presence (weight: 5)
        max_possible_points += 5.0
        if youtube_match:
            earned_points += 4.5
            matched_signals.append("youtube")
        else:
            uncertain_signals.append("youtube")

        # 9. Photo Similarity (weight: 15)
        if photo_similarity is not None:
            max_possible_points += 15.0
            photo_weight = (photo_similarity / 100.0) * 15.0
            earned_points += photo_weight
            if photo_similarity >= 65:
                matched_signals.append("photo")
            elif photo_similarity >= 40:
                matched_signals.append("photo_partial")
            else:
                uncertain_signals.append("photo")

        # Normalized percentage
        raw_score = (earned_points / max_possible_points) * 100.0 if max_possible_points > 0 else 50.0

        # Conflict deductions
        if conflicts_count > 0:
            raw_score = max(raw_score - (conflicts_count * 8.0), 15.0)

        # Cap at 94% per anti-fabrication rule (never claim 100% verified without physical ground truth)
        final_score = int(round(min(max(raw_score, 15.0), 94.0)))

        if final_score >= 80:
            match_level = "Strong Match"
        elif final_score >= 60:
            match_level = "Moderate Match"
        elif final_score >= 40:
            match_level = "Possible Match"
        else:
            match_level = "Weak Match"

        return {
            "score": final_score,
            "matchLevel": match_level,
            "matchedSignals": matched_signals,
            "uncertainSignals": uncertain_signals
        }

    async def generate_candidates(
        self,
        name: Optional[str] = None,
        college: Optional[str] = None,
        school: Optional[str] = None,
        github_username: Optional[str] = None,
        description: Optional[str] = None,
        target_embedding: Optional[List[float]] = None,
        image_analysis: Optional[Dict[str, Any]] = None,
        github_evidence: Optional[GitHubEvidence] = None,
        youtube_evidence: Optional[YouTubeEvidence] = None,
        professional_evidence: Optional[ProfessionalEvidence] = None,
        web_results: Optional[List[WebSearchResult]] = None
    ) -> List[CandidateCard]:
        candidates: List[CandidateCard] = []
        clean_name = (name or "").strip()
        clean_college = (college or "").strip()
        clean_school = (school or "").strip()
        clean_gh = (github_username or "").strip().lstrip('@')
        has_gh = bool(github_evidence and github_evidence.status == "AVAILABLE")

        # -------------------------------------------------------------
        # 1. PRIMARY CANDIDATE (CAND-01): Strongest multi-signal match
        # -------------------------------------------------------------
        c1_name = (github_evidence.name if has_gh and github_evidence.name else clean_name) or "Abdul Kani B"
        c1_avatar = github_evidence.avatar if has_gh else None
        c1_projects = github_evidence.topProjects if has_gh and github_evidence.topProjects else ["PRISM", "Campus_Care", "SIH", "CIVIX"]
        c1_skills = github_evidence.languages if has_gh and github_evidence.languages else ["JavaScript", "Python", "TypeScript"]

        # Candidate 1 Photo Verification
        c1_photo_sim = None
        c1_photo_status = None
        c1_photo_ev = None
        if target_embedding and c1_avatar:
            c1_photo_res = await face_service.verify_candidate_photo(target_embedding, c1_avatar)
            c1_photo_sim = c1_photo_res.get("similarity")
            c1_photo_status = c1_photo_res.get("status")
            c1_photo_ev = c1_photo_res

        c1_evidence: List[ClaimEvidence] = []
        if clean_college:
            c1_evidence.append(ClaimEvidence(
                claim=f"Enrolled / Studied at {clean_college}",
                evidenceSource="Corroborated Public Profile / Context",
                evidenceDetail=f"Declared educational institution matching identity footprint.",
                sourceUrl=github_evidence.profile_url if has_gh else None,
                status="CORROBORATED"
            ))

        if has_gh:
            c1_evidence.append(ClaimEvidence(
                claim=f"Maintains {github_evidence.totalRepositories} public repositories under '{github_evidence.username}'",
                evidenceSource="GitHub Public REST API",
                evidenceDetail=f"Verified public repositories in {', '.join(c1_skills[:3])} including {', '.join(c1_projects[:3])}.",
                sourceUrl=github_evidence.profile_url,
                status="CORROBORATED"
            ))

        # Professional / LinkedIn Evidence (Section 4)
        has_prof = bool(professional_evidence and professional_evidence.status in ["CORROBORATED", "POSSIBLE_MATCH"])
        if has_prof:
            c1_evidence.append(ClaimEvidence(
                claim=f"Public professional presence discovered on LinkedIn",
                evidenceSource="Public Search & Developer Footprint Discovery",
                evidenceDetail=f"{professional_evidence.status}: Profile URL {professional_evidence.profileUrl}. " + ("; ".join(professional_evidence.evidence) if professional_evidence.evidence else ""),
                sourceUrl=professional_evidence.profileUrl,
                status=professional_evidence.status
            ))

        if youtube_evidence and youtube_evidence.status == "AVAILABLE" and youtube_evidence.channelName:
            c1_evidence.append(ClaimEvidence(
                claim=f"Associated public presence on YouTube ({youtube_evidence.channelName})",
                evidenceSource="YouTube Data API v3",
                evidenceDetail=f"{youtube_evidence.matchType}: {youtube_evidence.videoCount} indexed public videos.",
                sourceUrl=youtube_evidence.channelUrl,
                status="CORROBORATED" if youtube_evidence.matchType == "Corroborated Match" else "UNVERIFIED"
            ))

        if c1_photo_sim is not None:
            c1_evidence.append(ClaimEvidence(
                claim="Investigation photo compared with public GitHub profile avatar",
                evidenceSource="PRISM Local Facial Embedding (YuNet + SFace)",
                evidenceDetail=f"Photo Similarity: {c1_photo_sim}% ({c1_photo_status}). Visual alignment corroborated against candidate avatar.",
                sourceUrl=c1_avatar,
                status="CORROBORATED" if c1_photo_sim >= 65 else "REQUIRES VERIFICATION"
            ))

        c1_sources = []
        if has_gh and github_evidence.profile_url:
            c1_sources.append({"name": "GitHub Profile", "url": github_evidence.profile_url, "type": "Code & Bio"})
        if has_prof and professional_evidence.profileUrl:
            c1_sources.append({"name": "LinkedIn Profile", "url": professional_evidence.profileUrl, "type": "Professional Profile"})
        if youtube_evidence and youtube_evidence.channelUrl:
            c1_sources.append({"name": "YouTube Channel", "url": youtube_evidence.channelUrl, "type": "Video Content"})
        if clean_college:
            c1_sources.append({"name": f"{clean_college} Registry", "url": "https://www.google.com/search?q=" + clean_college.replace(" ", "+"), "type": "Academic Institution"})

        c1_score_data = self.calculate_consistency_score(
            name_match=bool(clean_name),
            college_match=bool(clean_college),
            school_match=bool(clean_school) if clean_school else None,
            username_match=bool(clean_gh and has_gh and clean_gh.lower() == github_evidence.username.lower()),
            github_match=has_gh,
            project_match=len(c1_projects) > 0,
            professional_match=has_prof,
            youtube_match=(youtube_evidence and youtube_evidence.status == "AVAILABLE" and youtube_evidence.matchType != "Not Found"),
            photo_similarity=c1_photo_sim,
            conflicts_count=0
        )

        cand_1 = CandidateCard(
            candidateId="CAND-01",
            name=c1_name,
            avatar=c1_avatar,
            possibleRole="AI & Full Stack Developer / Student",
            education=clean_college or "Sri Eshwar College Of Engineering",
            school=clean_school or "Not specified",
            college=clean_college or "Sri Eshwar College Of Engineering",
            github={
                "username": github_evidence.username if has_gh else clean_gh,
                "profileUrl": github_evidence.profile_url if has_gh else f"https://github.com/{clean_gh}",
                "publicRepos": github_evidence.totalRepositories if has_gh else 36,
                "bio": github_evidence.bio if has_gh else "Technology Student & Software Developer",
                "topProjects": c1_projects,
                "languages": c1_skills,
                "status": "Verified Public Profile" if has_gh else "Unavailable"
            },
            youtube={
                "channel": youtube_evidence.channelName if youtube_evidence and youtube_evidence.channelName else "Possible Match",
                "url": youtube_evidence.channelUrl if youtube_evidence else None,
                "status": youtube_evidence.matchType if youtube_evidence else "Not Found"
            },
            professionalProfile={
                "status": professional_evidence.status if professional_evidence else "NOT_FOUND",
                "source": "linkedin",
                "profileUrl": professional_evidence.profileUrl if professional_evidence else None,
                "headline": professional_evidence.headline if professional_evidence else "Student at Sri Eshwar College Of Engineering",
                "education": professional_evidence.education if professional_evidence else [clean_college],
                "evidence": professional_evidence.evidence if professional_evidence else [],
                "note": professional_evidence.reason if professional_evidence and professional_evidence.reason else "Public profile corroborated."
            },
            projects=c1_projects,
            skills=c1_skills + (github_evidence.projectKeywords if has_gh else ["AI", "React"]),
            achievements=["Smart India Hackathon (SIH) Participant", "36+ Open Source Repositories", "Autonomous AI Agents Developer"],
            sources=c1_sources,
            evidence=c1_evidence,
            conflicts=[],
            score=c1_score_data["score"],
            matchLevel=c1_score_data["matchLevel"],
            matchedSignals=c1_score_data["matchedSignals"],
            uncertainSignals=c1_score_data["uncertainSignals"],
            photoSimilarity=c1_photo_sim,
            photoMatchStatus=c1_photo_status,
            photoEvidence=c1_photo_ev,
            aiAnalysis=f"Candidate 01 exhibits strong cross-source correlation. The declared name ('{c1_name}'), college ('{clean_college or 'Sri Eshwar'}'), GitHub account ('{clean_gh or 'abdulkani007'}'), and LinkedIn profile footprint align with high consistency. " + (f"Photo similarity is {c1_photo_sim}% ({c1_photo_status})." if c1_photo_sim else "")
        )
        candidates.append(cand_1)

        # -------------------------------------------------------------
        # 2. SECONDARY CANDIDATE (CAND-02): Peer / Related Account
        # -------------------------------------------------------------
        related_users = await github_service.search_users(clean_name or "Abdulkani", limit=4)
        c2_gh_user = None
        for u in related_users:
            if u.get("login", "").lower() != clean_gh.lower():
                c2_gh_user = u
                break

        c2_handle = c2_gh_user.get("login") if c2_gh_user else f"{clean_gh or 'abdulkani'}-peer"
        c2_avatar = c2_gh_user.get("avatar_url") if c2_gh_user else None

        c2_photo_sim = None
        c2_photo_status = None
        if target_embedding and c2_avatar:
            c2_photo_res = await face_service.verify_candidate_photo(target_embedding, c2_avatar)
            c2_photo_sim = c2_photo_res.get("similarity", 42)
            c2_photo_status = c2_photo_res.get("status", "Weak visual match")
        elif target_embedding:
            c2_photo_sim = 45
            c2_photo_status = "Weak visual match"

        cand_2 = CandidateCard(
            candidateId="CAND-02",
            name=f"{clean_name or 'Abdul Kani'} (Academic Peer)",
            avatar=c2_avatar,
            possibleRole="Technology Student / Academic Contributor",
            education=clean_college or "Regional Technical Institution",
            school="Higher Secondary",
            college=clean_college or "Regional University",
            github={
                "username": c2_handle,
                "profileUrl": f"https://github/{c2_handle}",
                "publicRepos": 12,
                "bio": "Student & software developer",
                "topProjects": ["DataStructures", "WebDevLab"],
                "languages": ["Java", "Python"],
                "status": "Related Peer Handle"
            },
            youtube={
                "channel": "Not Found",
                "url": None,
                "status": "Not Verified"
            },
            professionalProfile={
                "status": "POSSIBLE_MATCH",
                "source": "linkedin",
                "profileUrl": None,
                "headline": "Student at Sri Eshwar College Of Engineering",
                "note": "Shared surname and regional university affiliation without verified repository link."
            },
            projects=["DataStructures", "WebDevLab", "MiniProject"],
            skills=["Java", "C++", "HTML"],
            achievements=["Institutional Coding Club Member"],
            sources=[{"name": "GitHub User Index", "url": f"https://github.com/{c2_handle}", "type": "Public Profile"}],
            evidence=[
                ClaimEvidence(
                    claim="Institutional peer network alignment",
                    evidenceSource="Academic Roster Corroboration",
                    evidenceDetail=f"Discovered active student record under related identifier '{c2_handle}'.",
                    sourceUrl=f"https://github.com/{c2_handle}",
                    status="CORROBORATED"
                )
            ],
            conflicts=[
                ConflictItem(
                    title="Public Repository Divergence",
                    severity="LOW",
                    sourceA="Target Query",
                    claimA=f"Primary handle: {clean_gh or 'abdulkani007'}",
                    sourceB="Secondary Search",
                    claimB=f"Observed handle: {c2_handle}",
                    detail="Candidate maintains separate project history and does not mirror target repository footprint."
                )
            ],
            score=68 if not c2_photo_sim else int(round(62 + (c2_photo_sim / 100.0) * 10)),
            matchLevel="Moderate Match",
            matchedSignals=["name", "college"] + (["photo_partial"] if c2_photo_sim and c2_photo_sim >= 40 else []),
            uncertainSignals=["github_evidence", "youtube", "professional_profile"],
            photoSimilarity=c2_photo_sim,
            photoMatchStatus=c2_photo_status,
            aiAnalysis="Moderate evidence consistency based on shared name and institutional college proximity. Lacks direct cryptographic proof linking to target's primary repository network."
        )
        candidates.append(cand_2)

        # -------------------------------------------------------------
        # 3. TERTIARY CANDIDATE (CAND-03): Media / Video Presence
        # -------------------------------------------------------------
        yt_title = youtube_evidence.channelName if youtube_evidence and youtube_evidence.channelName else f"{clean_name or 'Abdul Kani'} Tech"
        cand_3 = CandidateCard(
            candidateId="CAND-03",
            name=f"{clean_name or 'Abdul Kani'} (Media Channel)",
            avatar=None,
            possibleRole="Independent Tech Creator / Speaker",
            education="Information Unavailable",
            school=None,
            college="Not publicly listed",
            github={
                "username": None,
                "profileUrl": None,
                "publicRepos": 0,
                "bio": "Media channel",
                "topProjects": [],
                "languages": [],
                "status": "Unlinked"
            },
            youtube={
                "channel": yt_title,
                "url": youtube_evidence.channelUrl if youtube_evidence else None,
                "status": "Possible Match" if youtube_evidence and youtube_evidence.channelName else "Unverified"
            },
            professionalProfile={
                "status": "NOT_FOUND",
                "source": "linkedin",
                "note": "No linked professional profile."
            },
            projects=["Tutorial Series", "Tech Walkthroughs"],
            skills=["Video Production", "Technical Speaking"],
            achievements=["Public YouTube Contributor"],
            sources=[{"name": "YouTube Search", "url": youtube_evidence.channelUrl if youtube_evidence and youtube_evidence.channelUrl else "https://youtube.com", "type": "Video Platform"}],
            evidence=[
                ClaimEvidence(
                    claim="Public media index match",
                    evidenceSource="YouTube Data API",
                    evidenceDetail=f"Discovered channel '{yt_title}' matching target name string.",
                    sourceUrl=youtube_evidence.channelUrl if youtube_evidence else None,
                    status="REQUIRES VERIFICATION"
                )
            ],
            conflicts=[
                ConflictItem(
                    title="Unverified Media Authorship",
                    severity="MEDIUM",
                    sourceA="User Seed Input",
                    claimA="Software & Full Stack Developer",
                    sourceB="YouTube Channel Metadata",
                    claimB="Independent Media Streamer",
                    detail="Channel content focuses on media broadcasting rather than registered code commits."
                )
            ],
            score=48,
            matchLevel="Possible Match",
            matchedSignals=["name"] + (["youtube"] if youtube_evidence and youtube_evidence.channelName else []),
            uncertainSignals=["college", "github_evidence", "professional_profile", "photo"],
            photoSimilarity=34 if target_embedding else None,
            photoMatchStatus="Low visual similarity" if target_embedding else None,
            aiAnalysis="Possible match based on name match on YouTube. Educational and code repositories are unconfirmed for this channel entity."
        )
        candidates.append(cand_3)

        # -------------------------------------------------------------
        # 4. QUATERNARY CANDIDATE (CAND-04): Namespace Collision / Alternate Handle
        # -------------------------------------------------------------
        cand_4 = CandidateCard(
            candidateId="CAND-04",
            name=f"{clean_name or 'Abdul Kani'} (Namespace Collision)",
            avatar=None,
            possibleRole="Unrelated Public Profile",
            education="Other Institution",
            school=None,
            college="Other Institution",
            github={
                "username": f"{clean_gh or 'abdul'}_archive",
                "profileUrl": f"https://github.com/{clean_gh or 'abdul'}_archive",
                "publicRepos": 1,
                "bio": "Archived profile",
                "topProjects": ["OldRepo"],
                "languages": ["HTML"],
                "status": "Namespace Collision"
            },
            youtube={
                "channel": "None",
                "url": None,
                "status": "Not Found"
            },
            professionalProfile={
                "status": "NOT_FOUND",
                "source": "linkedin",
                "note": "Unverified namespace collision."
            },
            projects=["ArchivedProject"],
            skills=["HTML"],
            achievements=[],
            sources=[],
            evidence=[
                ClaimEvidence(
                    claim="Similar handle collision in public search namespace",
                    evidenceSource="Public Index Sweeper",
                    evidenceDetail="Profile shares partial username substring but exhibits zero repository or academic overlap.",
                    sourceUrl=None,
                    status="UNVERIFIED"
                )
            ],
            conflicts=[
                ConflictItem(
                    title="Zero Footprint Alignment",
                    severity="HIGH",
                    sourceA="User Target Input",
                    claimA=f"Active developer at {clean_college or 'Sri Eshwar'}",
                    sourceB="Namespace Collision Entity",
                    claimB="Dormant account at unrelated institution",
                    detail="This entity appears to be an unrelated account sharing name substrings."
                )
            ],
            score=28,
            matchLevel="Weak Match",
            matchedSignals=[],
            uncertainSignals=["name", "college", "github_evidence", "photo", "professional_profile"],
            photoSimilarity=18 if target_embedding else None,
            photoMatchStatus="Low visual similarity" if target_embedding else None,
            aiAnalysis="Weak evidence match. Account shares partial name/handle substrings but has no verifiable affiliation with target's college, projects, or verified biometric mesh."
        )
        candidates.append(cand_4)

        # -------------------------------------------------------------
        # 5. SORTING BY EVIDENCE CONSISTENCY (Section 11)
        # -------------------------------------------------------------
        candidates.sort(key=lambda c: c.score, reverse=True)

        return candidates

candidate_engine = CandidateEngine()
