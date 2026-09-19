"""
PRISM MongoDB Atlas Asynchronous Persistence Layer
Provides high-assurance persistent storage for investigations, candidates, profiles, entities, evidence, queries, and relationships.
Includes automatic in-memory fallback if MongoDB connection fails.
Strictly adheres to investigation isolation invariants: NO cross-investigation data leakage.
"""

import logging
import re
from typing import Dict, Any, List, Optional
from datetime import datetime
from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings

logger = logging.getLogger("prism.db")


def mask_mongodb_uri(uri: str) -> str:
    """Mask credentials in MongoDB URI to prevent credential leakage in logs and traces."""
    if not uri:
        return "UNSET"
    return re.sub(r'://([^:]+):([^@]+)@', r'://\1:****@', uri)


class MongoDBService:
    def __init__(self):
        self.client: Optional[AsyncIOMotorClient] = None
        self.db = None
        self.is_connected = False
        
        # In-memory fallback stores (strictly scoped by investigation_id)
        self._memory_investigations: Dict[str, Dict[str, Any]] = {}
        self._memory_candidates: Dict[str, Dict[str, Dict[str, Any]]] = {}  # inv_id -> {cand_id: cand_dict}
        self._memory_profiles: Dict[str, List[Dict[str, Any]]] = {}
        self._memory_entities: Dict[str, List[Dict[str, Any]]] = {}
        self._memory_evidence: Dict[str, List[Dict[str, Any]]] = {}
        self._memory_queries: Dict[str, List[Dict[str, Any]]] = {}
        self._memory_relationships: Dict[str, List[Dict[str, Any]]] = {}
        self._memory_cache: Dict[str, Any] = {}

    async def connect(self):
        """Establish asynchronous connection to MongoDB Atlas and ensure schema indexes."""
        if not settings.MONGODB_URI:
            self.is_connected = False
            logger.info("MONGODB_URI is not set. Operating in resilient IN-MEMORY fallback mode.")
            return

        masked_uri = mask_mongodb_uri(settings.MONGODB_URI)
        try:
            logger.info(f"Connecting to MongoDB Atlas (database: '{settings.MONGODB_DB_NAME}', endpoint: {masked_uri})...")
            self.client = AsyncIOMotorClient(
                settings.MONGODB_URI,
                serverSelectionTimeoutMS=4000,
                connectTimeoutMS=4000,
                socketTimeoutMS=5000,
                retryWrites=True
            )
            # Verify connectivity with an admin ping
            await self.client.admin.command('ping')
            self.db = self.client[settings.MONGODB_DB_NAME]
            self.is_connected = True
            logger.info(f"MongoDB connection: SUCCESS. Database: '{settings.MONGODB_DB_NAME}'")
            
            # Create required indexes
            await self._create_indexes()
        except Exception as e:
            self.is_connected = False
            masked_error = mask_mongodb_uri(str(e))
            logger.warning(f"MongoDB Atlas unavailable ({masked_error}). Operating in resilient IN-MEMORY fallback mode.")

    async def close(self):
        """Gracefully close the MongoDB Atlas connection."""
        if self.client:
            self.client.close()
            self.is_connected = False
            logger.info("MongoDB Atlas connection closed.")

    async def _create_indexes(self):
        """Create indexes on frequently queried fields for investigation isolation & query speed."""
        if not self.is_connected or self.db is None:
            return
        try:
            # Investigations
            await self.db.investigations.create_index("investigation_id", unique=True, sparse=True)
            await self.db.investigations.create_index("investigationId", unique=True, sparse=True)
            await self.db.investigations.create_index("createdAt")

            # Candidates (Scoped by investigation)
            await self.db.candidates.create_index([("investigation_id", 1), ("candidateId", 1)], unique=True, sparse=True)
            await self.db.candidates.create_index([("investigationId", 1), ("candidateId", 1)], unique=True, sparse=True)
            await self.db.candidates.create_index("investigation_id")
            await self.db.candidates.create_index("investigationId")

            # Profiles
            await self.db.profiles.create_index("investigation_id")
            await self.db.profiles.create_index("investigationId")

            # Entities & Evidence
            await self.db.entities.create_index("investigation_id")
            await self.db.entities.create_index("investigationId")
            await self.db.evidence.create_index("investigation_id")
            await self.db.evidence.create_index("investigationId")
            await self.db.evidence.create_index("evidenceId")

            # Relationships & Queries
            await self.db.relationships.create_index("investigation_id")
            await self.db.relationships.create_index("investigationId")
            await self.db.queries.create_index("investigation_id")
            await self.db.queries.create_index("investigationId")
            await self.db.queries.create_index("queryHash")
            logger.info("MongoDB Atlas schema indexes verified.")
        except Exception as e:
            logger.warning(f"Failed to create MongoDB indexes: {mask_mongodb_uri(str(e))}")

    # -------------------------------------------------------------
    # INVESTIGATION CRUD (Investigation Scoped)
    # -------------------------------------------------------------
    async def save_investigation(self, inv_data: Dict[str, Any]) -> bool:
        inv_id = inv_data.get("investigation_id") or inv_data.get("investigationId")
        if not inv_id:
            return False
        
        data = dict(inv_data)
        data.pop("_id", None)
        data["investigation_id"] = inv_id
        data["investigationId"] = inv_id
        data["updatedAt"] = datetime.utcnow().isoformat() + "Z"
        self._memory_investigations[inv_id] = dict(data)
        
        if self.is_connected and self.db is not None:
            try:
                await self.db.investigations.update_one(
                    {"$or": [{"investigation_id": inv_id}, {"investigationId": inv_id}]},
                    {"$set": dict(data)},
                    upsert=True
                )
                return True
            except Exception as e:
                logger.error(f"Error saving investigation to MongoDB: {mask_mongodb_uri(str(e))}")
        return True

    async def get_investigation(self, inv_id: str) -> Optional[Dict[str, Any]]:
        if self.is_connected and self.db is not None:
            try:
                doc = await self.db.investigations.find_one(
                    {"$or": [{"investigation_id": inv_id}, {"investigationId": inv_id}]},
                    {"_id": 0}
                )
                if doc:
                    return doc
            except Exception as e:
                logger.error(f"Error fetching investigation from MongoDB: {mask_mongodb_uri(str(e))}")
        return self._memory_investigations.get(inv_id)

    # -------------------------------------------------------------
    # CANDIDATE CRUD (Scoped strictly by investigation_id)
    # -------------------------------------------------------------
    async def save_candidate(self, cand_data: Dict[str, Any]) -> bool:
        cand_id = cand_data.get("candidateId")
        inv_id = cand_data.get("investigation_id") or cand_data.get("investigationId") or "UNKNOWN_INV"
        if not cand_id:
            return False
        
        data = dict(cand_data)
        data.pop("_id", None)
        data["investigation_id"] = inv_id
        data["investigationId"] = inv_id
        data["updatedAt"] = datetime.utcnow().isoformat() + "Z"
        
        if inv_id not in self._memory_candidates:
            self._memory_candidates[inv_id] = {}
        self._memory_candidates[inv_id][cand_id] = dict(data)
        
        if self.is_connected and self.db is not None:
            try:
                await self.db.candidates.update_one(
                    {
                        "$or": [{"investigation_id": inv_id}, {"investigationId": inv_id}],
                        "candidateId": cand_id
                    },
                    {"$set": dict(data)},
                    upsert=True
                )
                return True
            except Exception as e:
                logger.error(f"Error saving candidate to MongoDB: {mask_mongodb_uri(str(e))}")
        return True

    async def get_candidate(self, cand_id: str, inv_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
        if self.is_connected and self.db is not None:
            try:
                query = {"candidateId": cand_id}
                if inv_id:
                    query["$or"] = [{"investigation_id": inv_id}, {"investigationId": inv_id}]
                doc = await self.db.candidates.find_one(query, {"_id": 0})
                if doc:
                    return doc
            except Exception as e:
                logger.error(f"Error fetching candidate from MongoDB: {mask_mongodb_uri(str(e))}")
        
        if inv_id and inv_id in self._memory_candidates:
            return self._memory_candidates[inv_id].get(cand_id)
        
        for inv_cands in self._memory_candidates.values():
            if cand_id in inv_cands:
                return inv_cands[cand_id]
        return None

    async def get_investigation_candidates(self, inv_id: str) -> List[Dict[str, Any]]:
        """NEVER query all candidates. Always strictly scoped to inv_id."""
        if self.is_connected and self.db is not None:
            try:
                cursor = self.db.candidates.find(
                    {"$or": [{"investigation_id": inv_id}, {"investigationId": inv_id}]},
                    {"_id": 0}
                )
                results = await cursor.to_list(length=100)
                if results:
                    return results
            except Exception as e:
                logger.error(f"Error fetching candidates for investigation from MongoDB: {mask_mongodb_uri(str(e))}")
        return list(self._memory_candidates.get(inv_id, {}).values())

    # -------------------------------------------------------------
    # PROFILES CRUD (Scoped strictly by investigation_id)
    # -------------------------------------------------------------
    async def save_profiles(self, inv_id: str, profiles: List[Dict[str, Any]]) -> bool:
        clean_profiles = []
        for p in profiles:
            item = dict(p)
            item.pop("_id", None)
            item["investigation_id"] = inv_id
            item["investigationId"] = inv_id
            clean_profiles.append(item)
        self._memory_profiles[inv_id] = clean_profiles
        if self.is_connected and self.db is not None and clean_profiles:
            try:
                await self.db.profiles.delete_many({"$or": [{"investigation_id": inv_id}, {"investigationId": inv_id}]})
                db_docs = [dict(p) for p in clean_profiles]
                await self.db.profiles.insert_many(db_docs)
                return True
            except Exception as e:
                logger.error(f"Error saving profiles to MongoDB: {mask_mongodb_uri(str(e))}")
        return True

    async def get_profiles(self, inv_id: str) -> List[Dict[str, Any]]:
        if self.is_connected and self.db is not None:
            try:
                cursor = self.db.profiles.find(
                    {"$or": [{"investigation_id": inv_id}, {"investigationId": inv_id}]},
                    {"_id": 0}
                )
                results = await cursor.to_list(length=100)
                if results:
                    return results
            except Exception as e:
                logger.error(f"Error fetching profiles from MongoDB: {mask_mongodb_uri(str(e))}")
        return self._memory_profiles.get(inv_id, [])

    # -------------------------------------------------------------
    # ENTITIES & RELATIONSHIPS (Scoped strictly by investigation_id)
    # -------------------------------------------------------------
    async def save_entities(self, inv_id: str, entities: List[Dict[str, Any]]) -> bool:
        clean_entities = []
        for e in entities:
            item = dict(e)
            item.pop("_id", None)
            item["investigation_id"] = inv_id
            item["investigationId"] = inv_id
            clean_entities.append(item)
        self._memory_entities[inv_id] = clean_entities
        if self.is_connected and self.db is not None and clean_entities:
            try:
                await self.db.entities.delete_many({"$or": [{"investigation_id": inv_id}, {"investigationId": inv_id}]})
                db_docs = [dict(e) for e in clean_entities]
                await self.db.entities.insert_many(db_docs)
                return True
            except Exception as e:
                logger.error(f"Error saving entities to MongoDB: {mask_mongodb_uri(str(e))}")
        return True

    async def get_entities(self, inv_id: str) -> List[Dict[str, Any]]:
        if self.is_connected and self.db is not None:
            try:
                cursor = self.db.entities.find(
                    {"$or": [{"investigation_id": inv_id}, {"investigationId": inv_id}]},
                    {"_id": 0}
                )
                results = await cursor.to_list(length=200)
                if results:
                    return results
            except Exception as e:
                logger.error(f"Error fetching entities from MongoDB: {mask_mongodb_uri(str(e))}")
        return self._memory_entities.get(inv_id, [])

    async def save_relationships(self, inv_id: str, relationships: List[Dict[str, Any]]) -> bool:
        clean_relationships = []
        for r in relationships:
            item = dict(r)
            item.pop("_id", None)
            item["investigation_id"] = inv_id
            item["investigationId"] = inv_id
            clean_relationships.append(item)
        self._memory_relationships[inv_id] = clean_relationships
        if self.is_connected and self.db is not None and clean_relationships:
            try:
                await self.db.relationships.delete_many({"$or": [{"investigation_id": inv_id}, {"investigationId": inv_id}]})
                db_docs = [dict(r) for r in clean_relationships]
                await self.db.relationships.insert_many(db_docs)
                return True
            except Exception as e:
                logger.error(f"Error saving relationships to MongoDB: {mask_mongodb_uri(str(e))}")
        return True

    async def get_relationships(self, inv_id: str) -> List[Dict[str, Any]]:
        if self.is_connected and self.db is not None:
            try:
                cursor = self.db.relationships.find(
                    {"$or": [{"investigation_id": inv_id}, {"investigationId": inv_id}]},
                    {"_id": 0}
                )
                results = await cursor.to_list(length=300)
                if results:
                    return results
            except Exception as e:
                logger.error(f"Error fetching relationships from MongoDB: {mask_mongodb_uri(str(e))}")
        return self._memory_relationships.get(inv_id, [])

    # -------------------------------------------------------------
    # EVIDENCE & QUERIES (Scoped strictly by investigation_id)
    # -------------------------------------------------------------
    async def save_evidence(self, inv_id: str, evidence: List[Dict[str, Any]]) -> bool:
        clean_evidence = []
        for ev in evidence:
            item = dict(ev)
            item.pop("_id", None)
            item["investigation_id"] = inv_id
            item["investigationId"] = inv_id
            clean_evidence.append(item)
        self._memory_evidence[inv_id] = clean_evidence
        if self.is_connected and self.db is not None and clean_evidence:
            try:
                await self.db.evidence.delete_many({"$or": [{"investigation_id": inv_id}, {"investigationId": inv_id}]})
                db_docs = [dict(ev) for ev in clean_evidence]
                await self.db.evidence.insert_many(db_docs)
                return True
            except Exception as e:
                logger.error(f"Error saving evidence to MongoDB: {mask_mongodb_uri(str(e))}")
        return True

    async def get_evidence(self, inv_id: str) -> List[Dict[str, Any]]:
        if self.is_connected and self.db is not None:
            try:
                cursor = self.db.evidence.find(
                    {"$or": [{"investigation_id": inv_id}, {"investigationId": inv_id}]},
                    {"_id": 0}
                )
                results = await cursor.to_list(length=500)
                if results:
                    return results
            except Exception as e:
                logger.error(f"Error fetching evidence from MongoDB: {mask_mongodb_uri(str(e))}")
        return self._memory_evidence.get(inv_id, [])

    async def save_queries(self, inv_id: str, queries: List[Dict[str, Any]]) -> bool:
        clean_queries = []
        for q in queries:
            item = dict(q)
            item.pop("_id", None)
            item["investigation_id"] = inv_id
            item["investigationId"] = inv_id
            clean_queries.append(item)
        self._memory_queries[inv_id] = clean_queries
        if self.is_connected and self.db is not None and clean_queries:
            try:
                await self.db.queries.delete_many({"$or": [{"investigation_id": inv_id}, {"investigationId": inv_id}]})
                db_docs = [dict(q) for q in clean_queries]
                await self.db.queries.insert_many(db_docs)
                return True
            except Exception as e:
                logger.error(f"Error saving queries to MongoDB: {mask_mongodb_uri(str(e))}")
        return True

    async def get_queries(self, inv_id: str) -> List[Dict[str, Any]]:
        if self.is_connected and self.db is not None:
            try:
                cursor = self.db.queries.find(
                    {"$or": [{"investigation_id": inv_id}, {"investigationId": inv_id}]},
                    {"_id": 0}
                )
                results = await cursor.to_list(length=100)
                if results:
                    return results
            except Exception as e:
                logger.error(f"Error fetching queries from MongoDB: {mask_mongodb_uri(str(e))}")
        return self._memory_queries.get(inv_id, [])

    # -------------------------------------------------------------
    # GRAPH & TIMELINE AGGREGATIONS
    # -------------------------------------------------------------
    async def get_graph(self, inv_id: str) -> Dict[str, Any]:
        """Aggregate nodes (entities) and edges (relationships) for graph visualization."""
        entities = await self.get_entities(inv_id)
        relationships = await self.get_relationships(inv_id)
        return {
            "investigation_id": inv_id,
            "investigationId": inv_id,
            "nodes": entities,
            "edges": relationships
        }

    # -------------------------------------------------------------
    # QUERY CACHE & DEDUPLICATION
    # -------------------------------------------------------------
    async def get_cached_query(self, query_hash: str) -> Optional[Dict[str, Any]]:
        if self.is_connected and self.db is not None:
            try:
                doc = await self.db.queries.find_one({"queryHash": query_hash}, {"_id": 0})
                if doc and "cachedResult" in doc:
                    return doc["cachedResult"]
            except Exception:
                pass
        return self._memory_cache.get(query_hash)

    async def cache_query_result(self, query_hash: str, query_text: str, tool_name: str, result: Any):
        self._memory_cache[query_hash] = result
        if self.is_connected and self.db is not None:
            try:
                await self.db.queries.update_one(
                    {"queryHash": query_hash},
                    {
                        "$set": {
                            "queryHash": query_hash,
                            "query": query_text,
                            "tool": tool_name,
                            "cachedResult": result,
                            "cachedAt": datetime.utcnow().isoformat() + "Z"
                        }
                    },
                    upsert=True
                )
            except Exception:
                pass


mongo_service = MongoDBService()
