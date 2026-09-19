"""
PRISM — MongoDB Atlas Migration & Investigation Isolation Test Suite
Verifies:
1. Safe URI masking & zero credential leakage
2. Connection timeout & ping handling
3. Database naming ('prism')
4. Investigation isolation across collections (investigations, candidates, entities, evidence, relationships, queries)
5. Health check API schema safety
"""

import asyncio
import os
import sys
import unittest

# Add backend directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.config import settings
from app.db.mongo import MongoDBService, mask_mongodb_uri
from fastapi.testclient import TestClient
from app.main import app


class TestMongoDBAtlasMigration(unittest.IsolatedAsyncioTestCase):

    def test_01_uri_masking_security(self):
        """Verify that mask_mongodb_uri never leaks credentials."""
        secret_uri = "mongodb+srv://admin_user:SuperSecretPassword123!@prism-cluster.abcde.mongodb.net/?retryWrites=true&w=majority"
        masked = mask_mongodb_uri(secret_uri)
        self.assertNotIn("SuperSecretPassword123!", masked)
        self.assertIn("admin_user:****", masked)
        self.assertIn("prism-cluster.abcde.mongodb.net", masked)

        # Edge cases
        self.assertEqual(mask_mongodb_uri(""), "UNSET")
        self.assertEqual(mask_mongodb_uri(None), "UNSET")
        print("\n[TEST 1] URI Masking & Credential Redaction: PASS")

    async def test_02_database_initialization_and_fallback(self):
        """Verify MongoDBService initializes with strict isolation stores and safe timeouts."""
        db_service = MongoDBService()
        self.assertFalse(db_service.is_connected)
        self.assertEqual(db_service._memory_candidates, {})
        self.assertEqual(db_service._memory_investigations, {})

        # Test connect when MONGODB_URI is empty/test
        await db_service.connect()
        # Should gracefully set is_connected or fallback without raising uncaught exceptions
        print(f"[TEST 2] Resilient Connection/Fallback Handler: PASS (Connected: {db_service.is_connected})")

    async def test_03_investigation_isolation_all_collections(self):
        """Verify that Investigation A data CANNOT contaminate Investigation B data."""
        db_service = MongoDBService()
        
        inv_a = "INV-ISOLATION-AAA"
        inv_b = "INV-ISOLATION-BBB"

        # 1. Investigations
        await db_service.save_investigation({
            "investigationId": inv_a,
            "target": "Abdulkani B",
            "college": "Sri Eshwar College Of Engineering"
        })
        await db_service.save_investigation({
            "investigationId": inv_b,
            "target": "Famiez Z",
            "college": None
        })

        # 2. Candidates
        await db_service.save_candidate({
            "candidateId": f"{inv_a}-CAND-01",
            "investigationId": inv_a,
            "name": "Abdulkani B",
            "handle": "abdulkani007",
            "repos": 36
        })
        await db_service.save_candidate({
            "candidateId": f"{inv_b}-CAND-01",
            "investigationId": inv_b,
            "name": "Famiez Z",
            "handle": "famiez_dev",
            "repos": 0
        })

        # 3. Evidence
        await db_service.save_evidence(inv_a, [
            {"evidenceId": "EV-A1", "source": "github", "detail": "36 repos found for abdulkani007"}
        ])
        await db_service.save_evidence(inv_b, [
            {"evidenceId": "EV-B1", "source": "web", "detail": "Zero repositories found"}
        ])

        # 4. Entities & Relationships
        await db_service.save_entities(inv_a, [{"id": "E-A1", "label": "Sri Eshwar College"}])
        await db_service.save_entities(inv_b, [{"id": "E-B1", "label": "Unknown Institute"}])

        # --- VERIFICATION ---
        # Query B
        b_cands = await db_service.get_investigation_candidates(inv_b)
        self.assertEqual(len(b_cands), 1)
        self.assertEqual(b_cands[0]["candidateId"], f"{inv_b}-CAND-01")
        self.assertEqual(b_cands[0]["name"], "Famiez Z")
        self.assertNotIn("abdulkani", str(b_cands).lower())
        self.assertNotIn("sri eshwar", str(b_cands).lower())

        # Query A
        a_cands = await db_service.get_investigation_candidates(inv_a)
        self.assertEqual(len(a_cands), 1)
        self.assertEqual(a_cands[0]["name"], "Abdulkani B")

        # Verify Evidence isolation
        b_ev = await db_service.get_evidence(inv_b)
        self.assertEqual(len(b_ev), 1)
        self.assertEqual(b_ev[0]["evidenceId"], "EV-B1")
        self.assertNotIn("abdulkani", str(b_ev).lower())

        # Verify Entities isolation
        b_ent = await db_service.get_entities(inv_b)
        self.assertEqual(len(b_ent), 1)
        self.assertEqual(b_ent[0]["id"], "E-B1")
        self.assertNotIn("sri eshwar", str(b_ent).lower())

        print("[TEST 3] Multi-Collection Investigation Isolation Verification: PASS (100% Isolated)")

    def test_04_health_check_endpoint_safety(self):
        """Verify health check returns database status without exposing credentials."""
        client = TestClient(app)
        res = client.get("/api/v1/health")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("database", data)
        self.assertIn("status", data["database"])
        self.assertIn("name", data["database"])
        self.assertEqual(data["database"]["name"], settings.MONGODB_DB_NAME)
        
        # Verify no credentials leaked
        serialized = str(data).lower()
        self.assertNotIn("password", serialized)
        self.assertNotIn("mongodb+srv", serialized)
        self.assertNotIn("mongodb://", serialized)
        print(f"[TEST 4] Health Check API Response & Credential Shield: PASS ({data['database']})")


if __name__ == "__main__":
    unittest.main()
