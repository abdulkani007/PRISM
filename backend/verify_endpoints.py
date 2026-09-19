"""
PRISM Backend Endpoints Live Verification Script
Tests all REST endpoints including LangGraph execution, MongoDB persistence,
and new Graph and Timeline visualization routes.
"""

import asyncio
from fastapi.testclient import TestClient
from app.main import app
from app.db.mongo import mongo_service

client = TestClient(app)

def test_api():
    print("\n=======================================================")
    print("VERIFYING PRISM BACKEND API ENDPOINTS")
    print("=======================================================\n")

    # 1. Root & Health
    r_root = client.get("/")
    assert r_root.status_code == 200
    root_json = r_root.json()
    print("1. Root Endpoint (/):", root_json["status"], "| Orchestrator:", root_json.get("orchestration"), "| DB:", root_json.get("database"))

    r_health = client.get("/api/v1/health")
    assert r_health.status_code == 200
    print("2. Health Endpoint (/api/v1/health):", r_health.json()["status"])

    # 2. Create Investigation
    inv_req = {
        "name": "Abdulkani B",
        "college": "Sri Eshwar College Of Engineering",
        "githubUsername": "abdulkani007",
        "description": "Information Technology student & AI / Full Stack developer"
    }
    r_create = client.post("/api/v1/investigations", json=inv_req)
    assert r_create.status_code == 200
    inv_data = r_create.json()
    inv_id = inv_data["investigationId"]
    print(f"3. Created Investigation ({inv_id}): status={inv_data['status']}")

    # 3. Run Investigation (Executes LangGraph Agent)
    print(f"4. Executing LangGraph agent workflow for {inv_id}...")
    r_run = client.post(f"/api/v1/investigations/{inv_id}/run")
    assert r_run.status_code == 200
    completed = r_run.json()
    print(f"   -> Completed: status={completed['status']}, candidates={len(completed['candidates'])}")
    if completed["candidates"]:
        top = completed["candidates"][0]
        print(f"   -> Top Candidate: {top['name']} ({top['score']}%, {top['matchLevel']})")

    # 4. Graph Endpoint
    r_graph = client.get(f"/api/v1/investigations/{inv_id}/graph")
    assert r_graph.status_code == 200
    graph = r_graph.json()
    print(f"5. Graph Endpoint: {len(graph.get('nodes', []))} nodes, {len(graph.get('edges', []))} edges")

    # 5. Timeline Endpoint
    r_timeline = client.get(f"/api/v1/investigations/{inv_id}/timeline")
    assert r_timeline.status_code == 200
    timeline = r_timeline.json()
    print(f"6. Timeline Endpoint: {len(timeline)} chronological milestones")

    # 6. Entities & Evidence Endpoints
    r_entities = client.get(f"/api/v1/investigations/{inv_id}/entities")
    assert r_entities.status_code == 200
    print(f"7. Entities Endpoint: {len(r_entities.json())} entities recorded")

    r_evidence = client.get(f"/api/v1/investigations/{inv_id}/evidence")
    assert r_evidence.status_code == 200
    print(f"8. Evidence Endpoint: {len(r_evidence.json())} evidence items corroborated")

    # 7. Candidate Details
    if completed["candidates"]:
        cand_id = completed["candidates"][0]["candidateId"]
        r_cand = client.get(f"/api/v1/candidates/{cand_id}")
        assert r_cand.status_code == 200
        print(f"9. Candidate Details ({cand_id}): fetched successfully from DB")

    print("\n=======================================================")
    print("ALL ENDPOINTS VERIFIED SUCCESSFULLY!")
    print("=======================================================\n")

if __name__ == "__main__":
    test_api()
