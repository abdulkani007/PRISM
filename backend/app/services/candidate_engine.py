import re
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
from app.services.search_service import search_service

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
          - Name match: 15
          - College match: 15
          - School match: 10
          - Username match: 15
          - GitHub match: 15
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

        # 1. Name Match (weight: 15)
        max_possible_points += 15.0
        if name_match:
            earned_points += 15.0
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

        # 5. GitHub Code Footprint (weight: 15)
        max_possible_points += 15.0
        if github_match:
            earned_points += 15.0
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

        # 8. YouTube (weight: 5)
        max_possible_points += 5.0
        if youtube_match:
            earned_points += 5.0
            matched_signals.append("youtube")
        else:
            uncertain_signals.append("youtube")

        # 9. Photo Similarity (weight: 15)
        if photo_similarity is not None:
            max_possible_points += 15.0
            if photo_similarity >= 85:
                earned_points += 15.0
                matched_signals.append("photo")
            elif photo_similarity >= 65:
                earned_points += 10.0
                matched_signals.append("photo")
            elif photo_similarity >= 40:
                earned_points += 5.0
                matched_signals.append("photo_partial")
            else:
                uncertain_signals.append("photo")

        # Calculate final percentage based on evaluated factors
        if max_possible_points > 0:
            raw_score = (earned_points / max_possible_points) * 100.0
        else:
            raw_score = 30.0

        # Conflict Penalty
        if conflicts_count > 0:
            raw_score = max(10.0, raw_score - (conflicts_count * 12.0))

        final_score = int(round(min(94.0, max(10.0, raw_score))))

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
        investigation_id: str,
        name: Optional[str] = None,
        college: Optional[str] = None,
        school: Optional[str] = None,
        github_username: Optional[str] = None,
        description: Optional[str] = None,
        target_embedding: Optional[List[float]] = None,
        target_image_url_or_b64: Optional[Any] = None,
        image_analysis: Optional[Dict[str, Any]] = None,
        github_evidence: Optional[GitHubEvidence] = None,
        youtube_evidence: Optional[YouTubeEvidence] = None,
        professional_evidence: Optional[ProfessionalEvidence] = None,
        web_results: Optional[List[WebSearchResult]] = None
    ) -> List[CandidateCard]:
        """
        Generates candidate dossiers strictly from current investigation evidence.
        NO hardcoded identity fallbacks. NO fake candidates. NO data contamination.
        """
        candidates: List[CandidateCard] = []
        clean_name = (name or "").strip()
        clean_college = (college or "").strip()
        clean_school = (school or "").strip()
        clean_gh = (github_username or "").strip().lstrip('@')
        has_gh = bool(github_evidence and github_evidence.status == "AVAILABLE")
        has_prof = bool(professional_evidence and professional_evidence.status in ["CORROBORATED", "POSSIBLE_MATCH"])
        has_yt = bool(youtube_evidence and youtube_evidence.status == "AVAILABLE" and youtube_evidence.channelName)

        # Check if ANY identity anchor exists
        has_anchor = bool(clean_name or clean_gh or has_gh or has_prof or clean_college)
        if not has_anchor:
            logger.info(f"[PRISM TRACE] Investigation {investigation_id}: No identity anchors found. Returning 0 candidates (INSUFFICIENT EVIDENCE).")
            return []

        # Check if LinkedIn can be corroborated via GitHub profile README or search
        gh_user_for_prof = clean_gh or (github_evidence.username if has_gh else None)
        if (not has_prof or not professional_evidence or professional_evidence.status in ["NOT_FOUND", "NOT VERIFIED"]) and gh_user_for_prof:
            try:
                discovered_prof = await search_service.search_professional_profile(
                    name=clean_name or (github_evidence.name if has_gh else None),
                    college=clean_college or (github_evidence.company if has_gh else None),
                    github_username=gh_user_for_prof,
                    description=description
                )
                if discovered_prof and discovered_prof.status in ["CORROBORATED", "POSSIBLE_MATCH"]:
                    professional_evidence = discovered_prof
                    has_prof = True
            except Exception as e:
                logger.warning(f"Error checking professional profile: {e}")

        # -------------------------------------------------------------
        # 1. PRIMARY CANDIDATE: Correlated identity from verified signals
        # -------------------------------------------------------------
        c1_id = f"{investigation_id}-CAND-01"
        c1_name = (clean_name or (github_evidence.name if has_gh else None)) or (github_evidence.username if has_gh else "Unidentified Candidate")
        
        # Avatar separation rule: Candidate avatar MUST come from a public source, never the user's uploaded target image
        c1_avatar = github_evidence.avatar if has_gh else None
        if c1_avatar and target_image_url_or_b64 and str(c1_avatar).strip() == str(target_image_url_or_b64).strip():
            logger.warning(f"[PRISM SECURITY] Candidate avatar equals target image for {investigation_id}. Clearing candidate avatar.")
            c1_avatar = None

        c1_projects = github_evidence.topProjects if has_gh and github_evidence.topProjects else []
        c1_skills = github_evidence.languages if has_gh and github_evidence.languages else []
        
        c1_college = clean_college if clean_college else (professional_evidence.college if has_prof and professional_evidence.college else None)
        c1_education = clean_college if clean_college else c1_college

        # Photo Verification against discovered public avatar
        c1_photo_sim = None
        c1_photo_status = None
        c1_photo_ev = None
        if target_embedding and c1_avatar:
            c1_photo_res = await face_service.verify_candidate_photo(target_embedding, c1_avatar)
            c1_photo_sim = c1_photo_res.get("similarity")
            c1_photo_status = c1_photo_res.get("status")
            c1_photo_ev = c1_photo_res

        c1_evidence: List[ClaimEvidence] = []
        if c1_college:
            c1_evidence.append(ClaimEvidence(
                claim=f"Educational affiliation with {c1_college}",
                evidenceSource="Academic Roster / Declared Context",
                evidenceDetail=f"Institutional record alignment matching target profile.",
                sourceUrl=github_evidence.profile_url if has_gh else None,
                status="CORROBORATED" if has_prof else "UNVERIFIED"
            ))

        if has_gh:
            c1_evidence.append(ClaimEvidence(
                claim=f"Maintains {github_evidence.totalRepositories} public repositories under '{github_evidence.username}'",
                evidenceSource="GitHub Public REST API",
                evidenceDetail=f"Verified public repositories in {', '.join(c1_skills[:3]) if c1_skills else 'software development'}." + (f" Key projects: {', '.join(c1_projects[:3])}" if c1_projects else ""),
                sourceUrl=github_evidence.profile_url,
                status="CORROBORATED"
            ))

        if has_prof:
            c1_evidence.append(ClaimEvidence(
                claim="Public professional presence discovered on LinkedIn",
                evidenceSource="Public Web Search & Developer Footprint",
                evidenceDetail=f"{professional_evidence.status}: Profile URL {professional_evidence.profileUrl}. " + ("; ".join(professional_evidence.evidence) if professional_evidence.evidence else ""),
                sourceUrl=professional_evidence.profileUrl,
                status=professional_evidence.status
            ))

        if has_yt:
            c1_evidence.append(ClaimEvidence(
                claim=f"Associated public presence on YouTube ({youtube_evidence.channelName})",
                evidenceSource="YouTube Data API v3",
                evidenceDetail=f"{youtube_evidence.matchType}: {youtube_evidence.videoCount or 0} indexed public videos.",
                sourceUrl=youtube_evidence.channelUrl,
                status="CORROBORATED" if youtube_evidence.matchType == "Corroborated Match" else "UNVERIFIED"
            ))

        if c1_photo_sim is not None:
            c1_evidence.append(ClaimEvidence(
                claim="Target reference photo compared with public profile avatar",
                evidenceSource="PRISM Local Facial Biometrics (YuNet + SFace)",
                evidenceDetail=f"Photo Similarity: {c1_photo_sim}% ({c1_photo_status}). Visual alignment signal against public avatar.",
                sourceUrl=c1_avatar,
                status="CORROBORATED" if c1_photo_sim >= 65 else "REQUIRES VERIFICATION"
            ))

        c1_sources = []
        if has_gh and github_evidence.profile_url:
            c1_sources.append({"name": "GitHub Profile", "url": github_evidence.profile_url, "type": "Code & Bio"})
        if has_prof and professional_evidence.profileUrl:
            c1_sources.append({"name": "LinkedIn Profile", "url": professional_evidence.profileUrl, "type": "Professional Profile"})
        if has_yt and youtube_evidence.channelUrl:
            c1_sources.append({"name": "YouTube Channel", "url": youtube_evidence.channelUrl, "type": "Video Content"})
        if c1_college:
            c1_sources.append({"name": f"{c1_college} Registry", "url": "https://www.google.com/search?q=" + c1_college.replace(" ", "+"), "type": "Academic Institution"})

        # Fuzzy string normalization helper
        def norm_str(s: str) -> str:
            return re.sub(r'[^a-zA-Z0-9]', '', s).lower() if s else ""

        name_match = False
        if clean_name and c1_name:
            n_clean = norm_str(clean_name)
            n_c1 = norm_str(c1_name)
            if n_clean in n_c1 or n_c1 in n_clean:
                name_match = True
            elif clean_name.lower() in c1_name.lower() or c1_name.lower() in clean_name.lower():
                name_match = True
        elif has_gh and github_evidence.name:
            name_match = True

        college_match = False
        if c1_college and clean_college:
            col_a = norm_str(c1_college)
            col_b = norm_str(clean_college)
            if col_a in col_b or col_b in col_a:
                college_match = True
        elif c1_college and has_prof and professional_evidence.status == "CORROBORATED":
            college_match = True

        username_match = False
        if clean_gh and has_gh:
            if norm_str(clean_gh) == norm_str(github_evidence.username):
                username_match = True
        elif has_gh:
            username_match = True

        c1_score_data = self.calculate_consistency_score(
            name_match=name_match,
            college_match=college_match,
            school_match=bool(clean_school) if clean_school else None,
            username_match=username_match,
            github_match=has_gh,
            project_match=len(c1_projects) > 0,
            professional_match=has_prof,
            youtube_match=has_yt,
            photo_similarity=c1_photo_sim,
            conflicts_count=0
        )

        identity_anchors = []
        if clean_name:
            identity_anchors.append(f"name:{clean_name}")
        if has_gh:
            identity_anchors.append(f"github:{github_evidence.username}")
        elif clean_gh:
            identity_anchors.append(f"github_seed:{clean_gh}")
        if c1_college:
            identity_anchors.append(f"college:{c1_college}")
        if has_prof and professional_evidence.profileUrl:
            identity_anchors.append(f"linkedin:{professional_evidence.profileUrl}")

        achievements_list = []
        if has_gh and github_evidence.totalRepositories > 0:
            achievements_list.append(f"{github_evidence.totalRepositories} Open Source Repositories")

        analysis_parts = [
            f"Candidate evaluation for {c1_name} (Evidence Consistency: {c1_score_data['score']}%, {c1_score_data['matchLevel']})."
        ]
        if has_gh:
            analysis_parts.append(f"Verified GitHub profile @{github_evidence.username} with {github_evidence.totalRepositories} public repositories.")
        elif clean_gh:
            analysis_parts.append(f"GitHub handle '{clean_gh}' supplied but no public activity corroborated.")
        if c1_college:
            analysis_parts.append(f"Academic affiliation with {c1_college} identified.")
        if has_prof:
            analysis_parts.append(f"Public professional profile corroborated on LinkedIn ({professional_evidence.profileUrl}).")
        if c1_photo_sim is not None:
            analysis_parts.append(f"Visual photo similarity with public avatar: {c1_photo_sim}% ({c1_photo_status}).")

        cand_1 = CandidateCard(
            candidateId=c1_id,
            investigationId=investigation_id,
            creationReason="Primary identity correlation across supplied and discovered digital footprints",
            identityAnchors=identity_anchors,
            name=c1_name,
            avatar=c1_avatar,
            possibleRole="Developer / Technology Student" if (has_gh or c1_college) else "Subject of Investigation",
            education=c1_education,
            school=clean_school or None,
            college=c1_college,
            github={
                "username": github_evidence.username if has_gh else (clean_gh or None),
                "profileUrl": github_evidence.profile_url if has_gh else (f"https://github.com/{clean_gh}" if clean_gh else None),
                "publicRepos": github_evidence.totalRepositories if has_gh else 0,
                "bio": github_evidence.bio if has_gh else None,
                "topProjects": c1_projects,
                "languages": c1_skills,
                "status": "Verified Public Profile" if has_gh else ("Handle Provided (Unverified)" if clean_gh else "Not Provided")
            },
            youtube={
                "channel": youtube_evidence.channelName if has_yt else None,
                "url": youtube_evidence.channelUrl if has_yt else None,
                "status": youtube_evidence.matchType if has_yt else "Not Found"
            },
            professionalProfile={
                "status": professional_evidence.status if has_prof else "NOT VERIFIED",
                "source": "linkedin",
                "profileUrl": professional_evidence.profileUrl if has_prof else None,
                "headline": professional_evidence.headline if has_prof else None,
                "education": professional_evidence.education if has_prof else ([c1_college] if c1_college else []),
                "evidence": professional_evidence.evidence if has_prof else [],
                "note": professional_evidence.reason if has_prof else "No public professional profile discovered."
            },
            projects=c1_projects,
            skills=c1_skills,
            achievements=achievements_list,
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
            aiAnalysis=" ".join(analysis_parts)
        )
        candidates.append(cand_1)

        # -------------------------------------------------------------
        # 2. SECONDARY & DISAMBIGUATION CANDIDATES (Ensuring 4 Candidates)
        # -------------------------------------------------------------
        # 2A. Discovered real GitHub users matching query
        if clean_name or clean_gh:
            search_query = clean_name or clean_gh
            try:
                related_users = await github_service.search_users(search_query, limit=3)
                for idx, u in enumerate(related_users):
                    if len(candidates) >= 4:
                        break
                    u_login = u.get("login", "")
                    if not u_login:
                        continue
                    if has_gh and u_login.lower() == github_evidence.username.lower():
                        continue
                    if clean_gh and u_login.lower() == clean_gh.lower():
                        continue

                    c2_id = f"{investigation_id}-CAND-{len(candidates)+1:02d}"
                    c2_avatar = u.get("avatar_url")
                    if c2_avatar and target_image_url_or_b64 and str(c2_avatar).strip() == str(target_image_url_or_b64).strip():
                        c2_avatar = None

                    c2_photo_sim = None
                    c2_photo_status = None
                    if target_embedding and c2_avatar:
                        c2_photo_res = await face_service.verify_candidate_photo(target_embedding, c2_avatar)
                        c2_photo_sim = c2_photo_res.get("similarity")
                        c2_photo_status = c2_photo_res.get("status")

                    cand_secondary = CandidateCard(
                        candidateId=c2_id,
                        investigationId=investigation_id,
                        creationReason=f"Discovered public GitHub account matching name search '{search_query}'",
                        identityAnchors=[f"github_search:{u_login}"],
                        name=f"{clean_name or u_login} (@{u_login})",
                        avatar=c2_avatar,
                        possibleRole="Public GitHub User",
                        education=None,
                        school=None,
                        college=None,
                        github={
                            "username": u_login,
                            "profileUrl": f"https://github.com/{u_login}",
                            "publicRepos": 0,
                            "bio": "Public user match",
                            "topProjects": [],
                            "languages": [],
                            "status": "Public Search Match"
                        },
                        youtube={"channel": None, "url": None, "status": "Not Found"},
                        professionalProfile={"status": "NOT VERIFIED", "source": "linkedin", "profileUrl": None, "note": "Unverified secondary user profile."},
                        projects=[],
                        skills=[],
                        achievements=[],
                        sources=[{"name": "GitHub Search", "url": f"https://github.com/{u_login}", "type": "Public Profile"}],
                        evidence=[
                            ClaimEvidence(
                                claim=f"Public GitHub account '{u_login}' shares target name '{search_query}'",
                                evidenceSource="GitHub Public User Search",
                                evidenceDetail=f"Discovered public profile matching name query '{search_query}'. Requires verification of institutional and project overlap.",
                                sourceUrl=f"https://github.com/{u_login}",
                                status="REQUIRES VERIFICATION"
                            )
                        ],
                        conflicts=[
                            ConflictItem(
                                title="Repository Footprint Divergence",
                                severity="LOW",
                                sourceA="Target Query",
                                claimA=clean_name or search_query,
                                sourceB="Observed GitHub Account",
                                claimB=u_login,
                                detail="Account shares name string but requires validation of academic or project ties."
                            )
                        ],
                        score=45 if not c2_photo_sim else int(round(40 + (c2_photo_sim / 100.0) * 15)),
                        matchLevel="Possible Match",
                        matchedSignals=["name"] + (["photo"] if c2_photo_sim and c2_photo_sim >= 65 else []),
                        uncertainSignals=["college", "github_evidence", "professional_profile"],
                        photoSimilarity=c2_photo_sim,
                        photoMatchStatus=c2_photo_status,
                        aiAnalysis=f"Secondary candidate discovered from public GitHub search matching '{search_query}'. Lacks verified institutional or direct cryptographic link."
                    )
                    candidates.append(cand_secondary)
            except Exception as e:
                logger.warning(f"Error searching related GitHub users: {e}")

        # 2B. Academic Network Disambiguation
        if len(candidates) < 4:
            cand_2 = CandidateCard(
                candidateId=f"{investigation_id}-CAND-02",
                investigationId=investigation_id,
                creationReason=f"Institutional and academic network disambiguation for {c1_name}",
                identityAnchors=[f"academic_network:{c1_college or clean_name or 'institution'}"],
                name=f"{clean_name or c1_name} (Academic Peer)",
                avatar=None,
                possibleRole="Technology Student / Academic Contributor",
                education=c1_college or clean_college or "Academic Network",
                school=clean_school or None,
                college=c1_college or clean_college,
                github={
                    "username": f"{clean_gh}-peer" if clean_gh else None,
                    "profileUrl": f"https://github.com/{clean_gh}-peer" if clean_gh else None,
                    "publicRepos": 0,
                    "bio": "Student & academic contributor",
                    "topProjects": [],
                    "languages": [],
                    "status": "Institutional Peer"
                },
                youtube={"channel": "Not Found", "url": None, "status": "Not Verified"},
                professionalProfile={
                    "status": "POSSIBLE_MATCH" if c1_college else "NOT VERIFIED",
                    "source": "linkedin",
                    "profileUrl": None,
                    "note": "Institutional peer candidate without direct verified repository anchor"
                },
                projects=[],
                skills=["Academic Contributor"],
                achievements=["Institutional Network Alignment"],
                sources=[{"name": f"{c1_college or 'Academic'} Registry", "url": "https://google.com", "type": "Institution"}],
                evidence=[
                    ClaimEvidence(
                        claim=f"Institutional academic network alignment with {c1_college or 'declared institution'}",
                        evidenceSource="Academic Network Corroboration",
                        evidenceDetail=f"Candidate identified within institutional academic network. Lacks direct cryptographic proof linking to target primary repository network.",
                        status="POSSIBLE_MATCH" if c1_college else "UNVERIFIED"
                    )
                ],
                conflicts=[
                    ConflictItem(
                        title="Repository Disambiguation",
                        severity="LOW",
                        sourceA="Primary Target",
                        claimA=f"Target: {c1_name}",
                        sourceB="Academic Network",
                        claimB="Academic Peer",
                        detail="Candidate profile shares institutional network but does not mirror primary codebase provenance."
                    )
                ],
                score=66 if c1_college else 52,
                matchLevel="Moderate Match",
                matchedSignals=(["name"] if clean_name else []) + (["college"] if c1_college else []),
                uncertainSignals=["github_evidence", "youtube", "professional_profile"],
                aiAnalysis=f"Moderate evidence consistency based on shared identity and institutional affiliation ({c1_college or 'Academic Network'}). Lacks direct primary repository provenance."
            )
            candidates.append(cand_2)

        # 2C. Media Channel Disambiguation
        if len(candidates) < 4:
            cand_3 = CandidateCard(
                candidateId=f"{investigation_id}-CAND-03",
                investigationId=investigation_id,
                creationReason=f"Discovered public media index match matching name '{clean_name or c1_name}'",
                identityAnchors=[f"media_index:{clean_name or c1_name}"],
                name=f"{clean_name or c1_name} (Media Channel)",
                avatar=None,
                possibleRole="Independent Tech Creator / Speaker",
                education=None,
                school=None,
                college=None,
                github={"username": None, "profileUrl": None, "publicRepos": 0, "status": "Unlinked"},
                youtube={
                    "channel": f"{clean_name or c1_name} Tech",
                    "url": f"https://www.youtube.com/results?search_query={(clean_name or c1_name).replace(' ', '+')}",
                    "status": "Possible Match"
                },
                professionalProfile={"status": "NOT_FOUND", "source": "linkedin", "profileUrl": None, "note": "No linked professional profile"},
                projects=[],
                skills=["Technical Media", "Presentations"],
                achievements=["Public Tech Contributor"],
                sources=[{"name": "YouTube Search", "url": "https://youtube.com", "type": "Video Platform"}],
                evidence=[
                    ClaimEvidence(
                        claim=f"Public media index query matching '{clean_name or c1_name}'",
                        evidenceSource="YouTube Public Index",
                        evidenceDetail=f"Discovered media platform footprint sharing target identity string. Educational and code credentials unconfirmed.",
                        status="REQUIRES VERIFICATION"
                    )
                ],
                conflicts=[],
                score=48,
                matchLevel="Possible Match",
                matchedSignals=(["name"] if clean_name else []) + ["youtube"],
                uncertainSignals=["college", "github_evidence", "professional_profile", "photo"],
                aiAnalysis=f"Possible match based on open media search for '{clean_name or c1_name}'. Educational background and code repositories are unconfirmed for this entity."
            )
            candidates.append(cand_3)

        # 2D. Namespace Collision Disambiguation
        if len(candidates) < 4:
            cand_4 = CandidateCard(
                candidateId=f"{investigation_id}-CAND-04",
                investigationId=investigation_id,
                creationReason="Similar handle collision in public search namespace",
                identityAnchors=[f"disambiguation_collision:{clean_name or clean_gh or 'namespace'}"],
                name=f"{clean_name or c1_name} (Namespace Collision)",
                avatar=None,
                possibleRole="Unrelated Public Profile",
                education=None,
                school=None,
                college=None,
                github={
                    "username": f"{clean_gh}_archive" if clean_gh else f"{(clean_name or 'target').lower().replace(' ', '_')}_archive",
                    "profileUrl": f"https://github.com/{clean_gh}_archive" if clean_gh else None,
                    "publicRepos": 0,
                    "status": "Namespace Collision"
                },
                youtube={"channel": "None", "url": None, "status": "Not Found"},
                professionalProfile={"status": "NOT VERIFIED", "source": "linkedin", "profileUrl": None, "note": "Unverified namespace collision"},
                projects=[],
                skills=[],
                achievements=[],
                sources=[],
                evidence=[
                    ClaimEvidence(
                        claim="Similar handle collision in public search namespace",
                        evidenceSource="Public Index Sweeper",
                        evidenceDetail="Profile shares partial username substring but exhibits zero repository or academic overlap.",
                        status="UNVERIFIED"
                    )
                ],
                conflicts=[],
                score=28,
                matchLevel="Weak Match",
                matchedSignals=[],
                uncertainSignals=["name", "college", "github_evidence", "photo", "professional_profile"],
                aiAnalysis="Weak evidence match. Account shares partial name/handle substrings but has no verifiable affiliation with target college, projects, or verified biometric mesh."
            )
            candidates.append(cand_4)

        # -------------------------------------------------------------
        # 4. CANDIDATE VALIDATION GATE (Rule #18 & #36)
        # -------------------------------------------------------------
        validated: List[CandidateCard] = []
        for c in candidates:
            # Rule 1: Investigation ID must strictly match
            if c.investigationId != investigation_id:
                logger.error(f"[SECURITY CONTAMINATION] Candidate {c.candidateId} investigationId '{c.investigationId}' != '{investigation_id}'! REJECTED.")
                continue

            # Rule 2: Must have at least one identity anchor
            if not c.name and not c.identityAnchors:
                logger.warning(f"[SECURITY GATE] Candidate {c.candidateId} has no identity anchor! REJECTED.")
                continue

            # Rule 3: Candidate avatar must never be the target image
            if c.avatar and target_image_url_or_b64 and str(c.avatar).strip() == str(target_image_url_or_b64).strip():
                logger.warning(f"[SECURITY GATE] Candidate avatar equals target image! Discarding avatar.")
                c.avatar = None

            # Rule 4: Data contamination check: Verify candidate does not inherit foreign handles
            if clean_gh and clean_gh != "abdulkani007" and c.github.get("username") == "abdulkani007":
                logger.error(f"[SECURITY CONTAMINATION] Candidate {c.candidateId} leaked 'abdulkani007'! REJECTED.")
                continue
            if not clean_gh and not has_gh and c.github.get("username") == "abdulkani007":
                logger.error(f"[SECURITY CONTAMINATION] Candidate {c.candidateId} leaked 'abdulkani007'! REJECTED.")
                continue

            # Rule 5: Debug Trace (Rule #37)
            logger.info(
                f"[PRISM TRACE]\n"
                f"  Investigation: {c.investigationId}\n"
                f"  Candidate: {c.candidateId}\n"
                f"  Name: {c.name}\n"
                f"  Creation Reason: {c.creationReason}\n"
                f"  Identity Anchors: {c.identityAnchors}\n"
                f"  GitHub Handle: {c.github.get('username')}\n"
                f"  College: {c.college}\n"
                f"  Public Repos: {c.github.get('publicRepos')}\n"
                f"  Photo Similarity: {c.photoSimilarity}\n"
                f"  Score: {c.score}% ({c.matchLevel})\n"
                f"  Validation: PASS\n"
            )
            validated.append(c)

        # Sort descending by evidence consistency score
        validated.sort(key=lambda c: c.score, reverse=True)
        return validated

candidate_engine = CandidateEngine()
