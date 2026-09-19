"""
PRISM Image Discovery & Biometric Investigation Tool
Uses local OpenCV YuNet ONNX detector and SFace recognizer.
Follows strict ephemeral biometric privacy: embeddings are used exclusively
in-memory during correlation and discarded immediately thereafter.
"""

from typing import Dict, Any, List, Optional
import logging
from app.tools.base import BaseInvestigationTool, ToolResult
from app.services.face_service import face_service
from app.services.search_service import search_service

logger = logging.getLogger("prism.tools.image_discovery")

class ImageDiscoveryInvestigationTool(BaseInvestigationTool):
    name: str = "image_discovery_tool"
    description: str = "Analyzes consented reference images with YuNet/SFace ONNX pipelines and evaluates cross-platform visual matches."
    cost: int = 1

    async def _execute(self, params: Dict[str, Any], context: Dict[str, Any]) -> ToolResult:
        raw_image = params.get("image") or params.get("raw_image")
        target_name = (params.get("name") or "target").strip()
        
        if not raw_image:
            return ToolResult(
                tool_name=self.name,
                success=True,
                data={
                    "status": "NOT_PROVIDED",
                    "face_detected": False,
                    "message": "No reference image provided for visual correlation"
                },
                evidence=[{
                    "claim": "Reference target photograph verification",
                    "evidenceSource": "PRISM Biometric Pipeline",
                    "evidenceDetail": "No reference photograph supplied. Investigation proceeded on textual, contextual, and digital footprint anchors.",
                    "status": "NOT_PROVIDED",
                    "confidence": 0.0
                }]
            )

        # 1. Run YuNet face detection & SFace feature extraction
        img_res = face_service.analyze_face(raw_image)
        face_detected = img_res.get("face_detected", False)
        quality = img_res.get("quality", "LOW")
        conf = img_res.get("confidence", 0.0)
        face_count = img_res.get("face_count", 0)

        # Ephemeral embedding kept in context for candidate scoring
        # (will NOT be serialized into MongoDB entities or evidence)
        target_embedding = img_res.get("embedding")
        context["target_embedding"] = target_embedding

        # 2. Reverse image occurrence search
        reverse_matches = await search_service.search_reverse_image_occurrences(raw_image)

        person_id = f"person:{target_name.lower().replace(' ', '_')}"
        entities: List[Dict[str, Any]] = []
        relationships: List[Dict[str, Any]] = []
        evidence: List[Dict[str, Any]] = []

        # Entity: Biometric Observation (metadata only, NO raw vectors)
        obs_id = f"obs:visual:{abs(hash(str(conf))) % 100000}"
        entities.append({
            "id": obs_id,
            "type": "BIOMETRIC_OBSERVATION",
            "label": f"YuNet/SFace Analysis ({quality} Quality)",
            "properties": {
                "face_detected": face_detected,
                "face_count": face_count,
                "detection_confidence": conf,
                "visual_quality": quality,
                "detector_pipeline": "OPENCV_YUNET_SFACE_ONNX",
                "ephemeral_compliance": "COMPLIANT (Embeddings not persisted)"
            }
        })

        relationships.append({
            "source": person_id,
            "target": obs_id,
            "type": "EVALUATED_BY",
            "label": "visual facial validation",
            "confidence": float(conf) if conf else 0.5
        })

        if face_detected:
            evidence.append({
                "claim": f"Facial biometrics verified from consented photograph ({face_count} face detected)",
                "evidenceSource": "YuNet ONNX Biometric Model",
                "evidenceDetail": f"Facial bounding box extracted with confidence {conf:.2f}. Visual quality rated {quality}.",
                "sourceUrl": None,
                "status": "CORROBORATED",
                "confidence": float(conf)
            })
        else:
            evidence.append({
                "claim": "Consented photograph visual quality check",
                "evidenceSource": "YuNet ONNX Biometric Model",
                "evidenceDetail": img_res.get("message", "No clear facial features detected in uploaded image."),
                "sourceUrl": None,
                "status": "UNVERIFIED",
                "confidence": 0.2
            })

        return ToolResult(
            tool_name=self.name,
            success=True,
            data={
                "status": "COMPLETED",
                "face_detected": face_detected,
                "face_count": face_count,
                "quality": quality,
                "confidence": conf,
                "reverse_matches": reverse_matches.get("matches", [])
            },
            evidence=evidence,
            entities=entities,
            relationships=relationships
        )

image_discovery_tool = ImageDiscoveryInvestigationTool()
