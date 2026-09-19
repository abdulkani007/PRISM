"""
PRISM MongoDB Asynchronous Persistence Layer
Provides persistent storage for investigations, candidates, profiles, entities, evidence, queries, and relationships.
Includes automatic in-memory fallback if MongoDB connection fails.
"""

import logging
from typing import Dict, Any, List, Optional
from datetime import datetime
from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings

logger = logging.getLogger("prism.db")

class MongoDBService:
    def __init__(self):
        self.client: Optional[AsyncIOMotorClient] = None
        self.db = None
        self.is_connected = False
        
        # In-memory fallback stores
        self._memory_investigations: Dict[str, Dict[str, Any]] = {}
        self._memory_candidates: Dict[str, Dict[str, Any]] = {}
        self._memory_profiles: Dict[str, List[Dict[str, Any]]] = {}
        self._memory_entities: Dict[str, List[Dict[str, Any]]] = {}
        self._memory_evidence: Dict[str, List[Dict[str, Any]]] = {}
        self._memory_queries: Dict[str, List[Dict[str, Any]]] = {}
        self._memory_relationships: Dict[str, List[Dict[str, Any]]] = {}
        self._memory_cache: Dict[str, Any] = {}

    async def connect(self):
        """Establish asynchronous connection to MongoDB and ensure indexes."""
        try:
            logger.info(f"Connecting to MongoDB at {settings.MONGODB_URI}...")
            self.client = AsyncIOMotorClient(
                settings.MONGODB_URI,
                serverSelectionTimeoutMS=2000,
                connectTimeoutMS=2000
            )
            # Verify connectivity with a quick ping
            await self.client.admin.command('ping')
            self.db = self.client[settings.MONGODB_DB_NAME]
            self.is_connected = True
            logger.info(f"Successfully connected to MongoDB database: '{settings.MONGODB_DB_NAME}'")
            
            # Create required indexes
            await self._create_indexes()
        except Exception as e:
            self.is_connected = False
            logger.warning(f"MongoDB connection failed ({e}). Operating in resilient IN-MEMORY fallback mode.")

    async def _create_indexes(self):
        """Create indexes on frequently queried fields."""
        if not self.is_connected or self.db is None:
            return
        try:
            await self.db.investigations.create_index("investigationId", unique=True)
            await self.db.candidates.create_index("candidateId", unique=True)
            await self.db.candidates.create_index("investigationId")
            await self.db.entities.create_index("investigationId")
            await self.db.evidence.create_index("investigationId")
            await self.db.relationships.create_index("investigationId")
            await self.db.queries.create_index("investigationId")
            await self.db.queries.create_index("queryHash")
            logger.info("MongoDB indexes verified.")
        except Exception as e:
            logger.warning(f"Failed to create MongoDB indexes: {e}")

    # -------------------------------------------------------------
    # INVESTIGATION CRUD
    # -------------------------------------------------------------
    async def save_investigation(self, inv_data: Dict[str, Any]) -> bool:
        inv_id = inv_data.get("investigationId")
        if not inv_id:
            return False
        
        data = dict(inv_data)
        data["updatedAt"] = datetime.utcnow().isoformat() + "Z"
        self._memory_investigations[inv_id] = data
        
        if self.is_connected and self.db is not None:
            try:
                await self.db.investigations.update_one(
                    {"investigationId": inv_id},
                    {"$set": data},
                    upsert=True
                )
                return True
            except Exception as e:
                logger.error(f"Error saving investigation to MongoDB: {e}")
        return True

    async def get_investigation(self, inv_id: str) -> Optional[Dict[str, Any]]:
        if self.is_connected and self.db is not None:
            try:
                doc = await self.db.investigations.find_one({"investigationId": inv_id}, {"_id": 0})
                if doc:
                    return doc
            except Exception as e:
                logger.error(f"Error fetching investigation from MongoDB: {e}")
        return self._memory_investigations.get(inv_id)

    # -------------------------------------------------------------
    # CANDIDATE CRUD
    # -------------------------------------------------------------
    async def save_candidate(self, cand_data: Dict[str, Any]) -> bool:
        cand_id = cand_data.get("candidateId")
        if not cand_id:
            return False
        
        data = dict(cand_data)
        data["updatedAt"] = datetime.utcnow().isoformat() + "Z"
        self._memory_candidates[cand_id] = data
        
        if self.is_connected and self.db is not None:
            try:
                await self.db.candidates.update_one(
                    {"candidateId": cand_id},
                    {"$set": data},
                    upsert=True
                )
                return True
            except Exception as e:
                logger.error(f"Error saving candidate to MongoDB: {e}")
        return True

    async def get_candidate(self, cand_id: str) -> Optional[Dict[str, Any]]:
        if self.is_connected and self.db is not None:
            try:
                doc = await self.db.candidates.find_one({"candidateId": cand_id}, {"_id": 0})
                if doc:
                    return doc
            except Exception as e:
                logger.error(f"Error fetching candidate from MongoDB: {e}")
        return self._memory_candidates.get(cand_id)

    async def get_investigation_candidates(self, inv_id: str) -> List[Dict[str, Any]]:
        if self.is_connected and self.db is not None:
            try:
                cursor = self.db.candidates.find({"investigationId": inv_id}, {"_id": 0})
                results = await cursor.to_list(length=100)
                if results:
                    return results
            except Exception as e:
                logger.error(f"Error fetching candidates for investigation from MongoDB: {e}")
        return [c for c in self._memory_candidates.values() if c.get("investigationId") == inv_id]

    # -------------------------------------------------------------
    # ENTITIES & RELATIONSHIPS
    # -------------------------------------------------------------
    async def save_entities(self, inv_id: str, entities: List[Dict[str, Any]]) -> bool:
        self._memory_entities[inv_id] = entities
        if self.is_connected and self.db is not None and entities:
            try:
                # Remove existing entities for this investigation to avoid duplication
                await self.db.entities.delete_many({"investigationId": inv_id})
                for e in entities:
                    e["investigationId"] = inv_id
                await self.db.entities.insert_many(entities)
                return True
            except Exception as e:
                logger.error(f"Error saving entities to MongoDB: {e}")
        return True

    async def get_entities(self, inv_id: str) -> List[Dict[str, Any]]:
        if self.is_connected and self.db is not None:
            try:
                cursor = self.db.entities.find({"investigationId": inv_id}, {"_id": 0})
                results = await cursor.to_list(length=200)
                if results:
                    return results
            except Exception as e:
                logger.error(f"Error fetching entities from MongoDB: {e}")
        return self._memory_entities.get(inv_id, [])

    async def save_relationships(self, inv_id: str, relationships: List[Dict[str, Any]]) -> bool:
        self._memory_relationships[inv_id] = relationships
        if self.is_connected and self.db is not None and relationships:
            try:
                await self.db.relationships.delete_many({"investigationId": inv_id})
                for r in relationships:
                    r["investigationId"] = inv_id
                await self.db.relationships.insert_many(relationships)
                return True
            except Exception as e:
                logger.error(f"Error saving relationships to MongoDB: {e}")
        return True

    async def get_relationships(self, inv_id: str) -> List[Dict[str, Any]]:
        if self.is_connected and self.db is not None:
            try:
                cursor = self.db.relationships.find({"investigationId": inv_id}, {"_id": 0})
                results = await cursor.to_list(length=300)
                if results:
                    return results
            except Exception as e:
                logger.error(f"Error fetching relationships from MongoDB: {e}")
        return self._memory_relationships.get(inv_id, [])

    # -------------------------------------------------------------
    # EVIDENCE & QUERIES
    # -------------------------------------------------------------
    async def save_evidence(self, inv_id: str, evidence: List[Dict[str, Any]]) -> bool:
        self._memory_evidence[inv_id] = evidence
        if self.is_connected and self.db is not None and evidence:
            try:
                await self.db.evidence.delete_many({"investigationId": inv_id})
                for ev in evidence:
                    ev["investigationId"] = inv_id
                await self.db.evidence.insert_many(evidence)
                return True
            except Exception as e:
                logger.error(f"Error saving evidence to MongoDB: {e}")
        return True

    async def get_evidence(self, inv_id: str) -> List[Dict[str, Any]]:
        if self.is_connected and self.db is not None:
            try:
                cursor = self.db.evidence.find({"investigationId": inv_id}, {"_id": 0})
                results = await cursor.to_list(length=500)
                if results:
                    return results
            except Exception as e:
                logger.error(f"Error fetching evidence from MongoDB: {e}")
        return self._memory_evidence.get(inv_id, [])

    async def save_queries(self, inv_id: str, queries: List[Dict[str, Any]]) -> bool:
        self._memory_queries[inv_id] = queries
        if self.is_connected and self.db is not None and queries:
            try:
                await self.db.queries.delete_many({"investigationId": inv_id})
                for q in queries:
                    q["investigationId"] = inv_id
                await self.db.queries.insert_many(queries)
                return True
            except Exception as e:
                logger.error(f"Error saving queries to MongoDB: {e}")
        return True

    async def get_queries(self, inv_id: str) -> List[Dict[str, Any]]:
        if self.is_connected and self.db is not None:
            try:
                cursor = self.db.queries.find({"investigationId": inv_id}, {"_id": 0})
                results = await cursor.to_list(length=100)
                if results:
                    return results
            except Exception as e:
                logger.error(f"Error fetching queries from MongoDB: {e}")
        return self._memory_queries.get(inv_id, [])

    # -------------------------------------------------------------
    # GRAPH & TIMELINE AGGREGATIONS
    # -------------------------------------------------------------
    async def get_graph(self, inv_id: str) -> Dict[str, Any]:
        """Aggregate nodes (entities) and edges (relationships) for graph visualization."""
        entities = await self.get_entities(inv_id)
        relationships = await self.get_relationships(inv_id)
        return {
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
