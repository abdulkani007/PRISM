"""
PRISM Cross-Investigation Data Isolation & Zero-Contamination Regression Suite
Verifies strict isolation between Investigation A (Abdulkani B) and Investigation B (Famiez Z).
Tests sequential runs, reverse order runs, and candidate storage scoping.
"""

import asyncio
import json
import logging
from app.graph.workflow import investigation_graph_app
from app.db.mongo import mongo_service

logging.basicConfig(level=logging.WARNING)
logger = logging.getLogger("prism.isolation_test")

CONTAMINATION_MARKERS = [
    "abdulkani007",
    "Sri Eshwar",
    "srieshwar",
    "sece.ac.in",
    "Campus_Care",
    "CIVIX",
    "189441807"  # Abdulkani GitHub avatar ID
]

async def run_investigation(inv_id: str, input_data: dict) -> dict:
    init_state = {
        "investigation_id": inv_id,
        "input": input_data,
        "status": "INITIALIZING",
        "current_step": "START",
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
    final_state = await investigation_graph_app.ainvoke(init_state)
    return final_state

async def main():
    print("\n" + "="*70)
    print("PRISM DATA CONTAMINATION & ISOLATION REGRESSION TEST")
    print("="*70)

    # -------------------------------------------------------------
    # TEST 1: Investigation A (Abdulkani B) -> Investigation B (Famiez Z)
    # -------------------------------------------------------------
    print("\n[TEST 1] Running Investigation A: Abdulkani B (with full context)...")
    inv_a_id = "INV-TEST-ABDULKANI"
    input_a = {
        "name": "Abdulkani B",
        "college": "Sri Eshwar College Of Engineering",
        "githubUsername": "abdulkani007",
        "description": "Information Technology student and AI / Full Stack developer"
    }
    result_a = await run_investigation(inv_a_id, input_a)
    cands_a = result_a.get("candidates", [])
    print(f"  -> Investigation A completed: {len(cands_a)} candidate(s) generated.")
    assert len(cands_a) >= 1, "Investigation A should generate at least 1 candidate"
    assert cands_a[0]["investigationId"] == inv_a_id, f"Candidate should be tagged with {inv_a_id}"
    assert inv_a_id in cands_a[0]["candidateId"], f"Candidate ID should contain {inv_a_id}"
    print("  -> Investigation A integrity PASS.")

    print("\n[TEST 2] Running Investigation B: Famiez Z (zero context, blank college/gh)...")
    inv_b_id = "INV-TEST-FAMIEZ"
    input_b = {
        "name": "Famiez Z",
        "college": "",
        "githubUsername": "",
        "description": ""
    }
    result_b = await run_investigation(inv_b_id, input_b)
    cands_b = result_b.get("candidates", [])
    print(f"  -> Investigation B completed: {len(cands_b)} candidate(s) generated.")

    # Dump Investigation B to string to search for ANY cross-contamination
    serialized_b = json.dumps(result_b, default=str)

    for marker in CONTAMINATION_MARKERS:
        if marker.lower() in serialized_b.lower():
            raise AssertionError(f"CONTAMINATION DETECTED in Investigation B: Found marker '{marker}' in result B!")

    print("  -> Zero contamination markers found in Investigation B serialization: PASS.")

    # Validate candidates in B
    for c in cands_b:
        assert c.get("investigationId") == inv_b_id, f"Candidate in B has wrong investigationId: {c.get('investigationId')}"
        assert inv_a_id not in c.get("candidateId", ""), f"Candidate in B has candidateId from A: {c.get('candidateId')}"
        assert c.get("college") != "Sri Eshwar College Of Engineering", f"Candidate in B received A's college!"
        if c.get("github"):
            assert c["github"].get("username") != "abdulkani007", "Candidate in B received A's github username!"
            assert c["github"].get("publicRepos") != 36, "Candidate in B received A's repo count 36!"

    print("  -> Investigation B candidate attributes isolated: PASS.")

    # Check MongoDB / memory isolation
    db_cands_b = await mongo_service.get_investigation_candidates(inv_b_id)
    for c in db_cands_b:
        assert c.get("investigationId") == inv_b_id
        for marker in CONTAMINATION_MARKERS:
            assert marker.lower() not in json.dumps(c, default=str).lower(), f"Contamination in DB for B: {marker}"

    print("  -> Database candidate isolation for B: PASS.")

    # -------------------------------------------------------------
    # TEST 3: Reverse Sequence: Famiez Z first, then Abdulkani, then Famiez again
    # -------------------------------------------------------------
    print("\n[TEST 3] Reverse Order Isolation Test (B2 -> A2 -> B3)...")
    inv_b2_id = "INV-TEST-REVERSE-B2"
    result_b2 = await run_investigation(inv_b2_id, input_b)
    serialized_b2 = json.dumps(result_b2, default=str)
    for marker in CONTAMINATION_MARKERS:
        assert marker.lower() not in serialized_b2.lower(), f"Contamination in B2: {marker}"

    inv_a2_id = "INV-TEST-REVERSE-A2"
    result_a2 = await run_investigation(inv_a2_id, input_a)
    assert len(result_a2.get("candidates", [])) >= 1

    inv_b3_id = "INV-TEST-REVERSE-B3"
    result_b3 = await run_investigation(inv_b3_id, input_b)
    serialized_b3 = json.dumps(result_b3, default=str)
    for marker in CONTAMINATION_MARKERS:
        assert marker.lower() not in serialized_b3.lower(), f"Contamination in B3: {marker}"

    print("  -> Reverse order sequence (B2 -> A2 -> B3) completely isolated: PASS.")

    print("\n" + "="*70)
    print("ALL ISOLATION & ZERO-CONTAMINATION REGRESSION TESTS PASSED (100% SUCCESS)")
    print("="*70 + "\n")

if __name__ == "__main__":
    asyncio.run(main())
