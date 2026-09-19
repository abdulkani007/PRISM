"""
PRISM End-to-End Test Suite: 6 Synthetic Scenarios
Tests the complete LangGraph Investigation Agent + MongoDB persistence
across all target hackathon edge cases.
"""

import asyncio
import logging
from app.graph.workflow import investigation_graph_app
from app.db.mongo import mongo_service

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("prism.tests")

SCENARIOS = [
    {
        "id": "SCENARIO-1-EASY",
        "name": "Scenario 1: Easy Identity (High context match)",
        "input": {
            "name": "Abdulkani B",
            "college": "Sri Eshwar College Of Engineering",
            "githubUsername": "abdulkani007",
            "description": "AI & Full Stack developer, student at Sri Eshwar"
        },
        "expected_min_score": 80,
        "expect_conflicts": False
    },
    {
        "id": "SCENARIO-2-NO-HANDLE",
        "name": "Scenario 2: Name & College Only (No explicit handle)",
        "input": {
            "name": "Abdulkani B",
            "college": "Sri Eshwar College Of Engineering",
            "description": "Student at Sri Eshwar College Of Engineering"
        },
        "expected_min_score": 60,
        "expect_conflicts": False
    },
    {
        "id": "SCENARIO-3-NAME-COLLISION",
        "name": "Scenario 3: Same Name Disambiguation",
        "input": {
            "name": "Abdul Kani",
            "college": "Anna University",
            "description": "Software engineer"
        },
        "expected_min_score": 30,
        "expect_conflicts": False
    },
    {
        "id": "SCENARIO-4-CONFLICTS",
        "name": "Scenario 4: Conflicting Institutional Claims",
        "input": {
            "name": "Abdulkani B",
            "college": "Stanford University",  # Intentional conflict
            "githubUsername": "abdulkani007",
            "description": "Student researcher"
        },
        "expected_min_score": 50,
        "expect_conflicts": True
    },
    {
        "id": "SCENARIO-5-HANDLE-ONLY",
        "name": "Scenario 5: Handle Only (Missing name)",
        "input": {
            "githubUsername": "abdulkani007"
        },
        "expected_min_score": 60,
        "expect_conflicts": False
    },
    {
        "id": "SCENARIO-6-SPARSE",
        "name": "Scenario 6: Insufficient Evidence (Sparse seed)",
        "input": {
            "description": "Just someone interested in coding"
        },
        "expected_min_score": 0,
        "expect_conflicts": False
    }
]

async def run_all_tests():
    await mongo_service.connect()
    print("\n=======================================================")
    print("STARTING PRISM 6-SCENARIO VERIFICATION SUITE")
    print("=======================================================\n")
    
    passed = 0
    total = len(SCENARIOS)

    for sc in SCENARIOS:
        print(f"\n--- Running {sc['name']} ---")
        state = {
            "investigation_id": sc["id"],
            "input": sc["input"],
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
        
        try:
            result = await investigation_graph_app.ainvoke(state)
            status = result.get("status")
            cands = result.get("candidates", [])
            top_cand = cands[0] if cands else {}
            score = top_cand.get("score", 0)
            conflicts = result.get("conflicts", [])
            clarifications = result.get("clarification_questions", [])
            timeline = result.get("timeline", [])
            graph = result.get("graph", {})
            
            print(f"Status: {status}")
            print(f"Executed Tools: {result.get('executed_tools')}")
            print(f"Candidates Generated: {len(cands)}")
            print(f"Top Candidate: {top_cand.get('name')} (Score: {score}%)")
            print(f"Conflicts Detected: {len(conflicts)}")
            print(f"Clarifications: {len(clarifications)}")
            print(f"Timeline Milestones: {len(timeline)}")
            print(f"Graph Entities: {len(graph.get('nodes', []))}, Edges: {len(graph.get('edges', []))}")
            
            # Check conditions
            assert status == "COMPLETED", f"Expected COMPLETED status, got {status}"
            assert len(cands) > 0, "Expected at least 1 candidate"
            print(f"-> PASS: {sc['name']}")
            passed += 1
        except Exception as e:
            print(f"-> FAIL: {sc['name']} - Error: {e}")

    print("\n=======================================================")
    print(f"TEST RESULTS: {passed}/{total} SCENARIOS PASSED")
    print("=======================================================\n")

if __name__ == "__main__":
    asyncio.run(run_all_tests())
