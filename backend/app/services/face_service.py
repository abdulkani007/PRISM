import os
import re
import base64
import logging
import numpy as np
import cv2
import onnxruntime as ort
import httpx
from typing import Optional, Dict, Any, Tuple, List, Union

logger = logging.getLogger("prism.face_service")

# Silence noisy ONNX Runtime warnings
ort.set_default_logger_severity(3)

class FaceService:
    def __init__(self):
        self.weights_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "models", "weights")
        self.yunet_path = os.path.join(self.weights_dir, "face_detection_yunet.onnx")
        self.sface_path = os.path.join(self.weights_dir, "face_recognition_sface.onnx")
        
        self.detector = None
        self.sface_session = None
        self._init_models()

    def _init_models(self):
        """Initializes OpenCV YuNet and SFace ONNX models, auto-downloading if missing."""
        os.makedirs(self.weights_dir, exist_ok=True)
        try:
            if not os.path.exists(self.yunet_path):
                logger.info(f"Downloading YuNet model to {self.yunet_path}...")
                import urllib.request
                urllib.request.urlretrieve(
                    "https://github.com/opencv/opencv_zoo/raw/main/models/face_detection_yunet/face_detection_yunet_2023mar.onnx",
                    self.yunet_path
                )

            if os.path.exists(self.yunet_path):
                self.detector = cv2.FaceDetectorYN.create(self.yunet_path, "", (320, 320))
                logger.info("OpenCV YuNet face detector loaded successfully.")

            if not os.path.exists(self.sface_path):
                logger.info(f"Downloading SFace model to {self.sface_path}...")
                import urllib.request
                urllib.request.urlretrieve(
                    "https://media.githubusercontent.com/media/opencv/opencv_zoo/main/models/face_recognition_sface/face_recognition_sface_2021dec.onnx",
                    self.sface_path
                )

            if os.path.exists(self.sface_path):
                self.sface_session = ort.InferenceSession(self.sface_path)
                logger.info("SFace ONNX recognition model loaded successfully into ONNX Runtime.")
        except Exception as e:
            logger.error(f"Error initializing face analysis models: {e}")

    def decode_image(self, image_input: Any) -> Optional[np.ndarray]:
        """
        Decodes base64 data URLs, raw base64, bytes, or file paths into a BGR numpy array.
        """
        if image_input is None:
            return None

        try:
            # If dictionary with base64/url/data field
            if isinstance(image_input, dict):
                image_input = image_input.get("base64") or image_input.get("url") or image_input.get("data")
                if not image_input:
                    return None

            # If numpy array already
            if isinstance(image_input, np.ndarray):
                return image_input

            # If bytes
            if isinstance(image_input, bytes):
                nparr = np.frombuffer(image_input, np.uint8)
                return cv2.imdecode(nparr, cv2.IMREAD_COLOR)

            # If string
            if isinstance(image_input, str):
                # Data URL e.g. data:image/jpeg;base64,....
                if image_input.startswith("data:"):
                    parts = image_input.split(",", 1)
                    if len(parts) == 2:
                        raw_bytes = base64.b64decode(parts[1])
                        nparr = np.frombuffer(raw_bytes, np.uint8)
                        return cv2.imdecode(nparr, cv2.IMREAD_COLOR)

                # Check if file path
                if os.path.exists(image_input):
                    return cv2.imread(image_input)

                # Raw base64 string
                try:
                    raw_bytes = base64.b64decode(image_input)
                    nparr = np.frombuffer(raw_bytes, np.uint8)
                    decoded = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
                    if decoded is not None:
                        return decoded
                except Exception:
                    pass

        except Exception as e:
            logger.warning(f"Error decoding image input: {e}")

        return None

    def assess_quality(self, img_bgr: np.ndarray) -> Dict[str, Any]:
        """
        Checks image sharpness (Laplacian variance), brightness, contrast, and resolution.
        """
        h, w = img_bgr.shape[:2]
        gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
        
        # Laplacian variance measures edge sharpness
        sharpness = float(cv2.Laplacian(gray, cv2.CV_64F).var())
        brightness = float(np.mean(gray))
        contrast = float(np.std(gray))

        quality_label = "Optimal"
        if sharpness < 40.0:
            quality_label = "Blurred / Low Sharpness"
        elif brightness < 30.0:
            quality_label = "Under-exposed / Dark"
        elif brightness > 225.0:
            quality_label = "Over-exposed / Glare"
        elif contrast < 20.0:
            quality_label = "Low Contrast"

        return {
            "resolution": f"{w}x{h}",
            "width": w,
            "height": h,
            "sharpness": round(sharpness, 2),
            "brightness": round(brightness, 2),
            "contrast": round(contrast, 2),
            "quality_label": quality_label
        }

    def analyze_face(self, image_input: Any) -> Dict[str, Any]:
        """
        Performs validation, quality check, face detection, and generates a temporary embedding.
        If no face is detected, returns '⚠ No usable face detected'.
        """
        img_bgr = self.decode_image(image_input)
        if img_bgr is None:
            return {
                "validated": False,
                "face_detected": False,
                "message": "No valid image data received",
                "embedding": None,
                "quality": None
            }

        h, w = img_bgr.shape[:2]
        if w < 48 or h < 48:
            return {
                "validated": False,
                "face_detected": False,
                "message": f"Image resolution too low ({w}x{h}). Minimum required: 48x48",
                "embedding": None,
                "quality": None
            }

        quality = self.assess_quality(img_bgr)

        if not self.detector:
            return {
                "validated": True,
                "face_detected": False,
                "message": "Face detector model unavailable",
                "quality": quality,
                "embedding": None
            }

        try:
            self.detector.setInputSize((w, h))
            _, faces = self.detector.detect(img_bgr)

            if faces is None or len(faces) == 0:
                return {
                    "validated": True,
                    "face_detected": False,
                    "message": "⚠ No usable face detected",
                    "quality": quality,
                    "face_count": 0,
                    "embedding": None
                }

            # Best face by confidence
            best_face = faces[0]
            conf = float(best_face[14])
            box = best_face[:4].astype(int)
            x, y, bw, bh = box

            # Extract 112x112 face crop with margin for embedding
            margin = int(bw * 0.1)
            x0 = max(0, x - margin)
            y0 = max(0, y - margin)
            x1 = min(w, x + bw + margin)
            y1 = min(h, y + bh + margin)
            face_crop = img_bgr[y0:y1, x0:x1]

            embedding = None
            if self.sface_session and face_crop.size > 0:
                resized = cv2.resize(face_crop, (112, 112)).astype(np.float32)
                blob = np.transpose(resized, (2, 0, 1))[np.newaxis, ...]
                out = self.sface_session.run(None, {"data": blob})
                raw_emb = out[0][0]
                norm = np.linalg.norm(raw_emb)
                if norm > 0:
                    embedding = (raw_emb / norm).tolist()

            return {
                "validated": True,
                "face_detected": True,
                "face_count": int(len(faces)),
                "confidence": round(conf, 3),
                "face_box": [int(x), int(y), int(bw), int(bh)],
                "quality": quality,
                "embedding": embedding,
                "message": "Face detected and biometric vector extracted"
            }

        except Exception as e:
            logger.error(f"Error analyzing face in image: {e}")
            return {
                "validated": True,
                "face_detected": False,
                "message": f"Error during face analysis: {str(e)}",
                "quality": quality,
                "embedding": None
            }

    def compute_similarity(
        self,
        emb_target: Optional[List[float]],
        emb_candidate: Optional[List[float]]
    ) -> Tuple[int, str]:
        """
        Computes cosine similarity between two 128-d face embeddings.
        Returns (similarity_percent, status_label).
        Adheres strictly to the rule: "Do NOT claim this is definitive identity probability".
        """
        if not emb_target or not emb_candidate:
            return 0, "No face detected for comparison"

        try:
            vec1 = np.array(emb_target, dtype=np.float32)
            vec2 = np.array(emb_candidate, dtype=np.float32)

            norm1 = np.linalg.norm(vec1)
            norm2 = np.linalg.norm(vec2)

            if norm1 == 0 or norm2 == 0:
                return 0, "Invalid biometric vector"

            cos_sim = float(np.dot(vec1, vec2) / (norm1 * norm2))
            # Rescale slightly for human readability (SFace cosine threshold for match is ~0.36)
            # SFace cosine similarity is ~0.36 for different views of same person, ~0.6-0.8 for strong match
            # We map standard SFace cosine [-1, 1] into a normalized visual percentage
            if cos_sim <= 0:
                pct = int(max(0, (cos_sim + 1.0) * 15))
            elif cos_sim < 0.36:
                # 0.0 -> 30%, 0.36 -> 65%
                pct = int(30 + (cos_sim / 0.36) * 35)
            else:
                # 0.36 -> 65%, 0.7+ -> 94%
                pct = int(65 + min(1.0, (cos_sim - 0.36) / 0.34) * 29)

            pct = min(94, max(5, pct))  # Capped at 94% per anti-fabrication rule

            if pct >= 85:
                status = "Strong visual match"
            elif pct >= 65:
                status = "Moderate visual match"
            elif pct >= 40:
                status = "Weak visual match"
            else:
                status = "Low visual similarity"

            return pct, status

        except Exception as e:
            logger.warning(f"Error computing face similarity: {e}")
            return 0, "Comparison error"

    async def verify_candidate_photo(
        self,
        target_embedding: Optional[List[float]],
        candidate_image_url_or_data: Any
    ) -> Dict[str, Any]:
        """
        Downloads or decodes permitted candidate profile photo (e.g. GitHub avatar),
        extracts its face embedding, and compares against the target investigation embedding.
        """
        if not target_embedding:
            return {
                "similarity": None,
                "status": "Target photo not provided",
                "candidate_face_detected": False,
                "match": False
            }

        candidate_bgr = None

        # Check if URL
        if isinstance(candidate_image_url_or_data, str) and candidate_image_url_or_data.startswith("http"):
            try:
                async with httpx.AsyncClient(timeout=8.0, follow_redirects=True) as client:
                    resp = await client.get(candidate_image_url_or_data)
                    if resp.status_code == 200:
                        nparr = np.frombuffer(resp.content, np.uint8)
                        candidate_bgr = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            except Exception as e:
                logger.warning(f"Could not download candidate image from {candidate_image_url_or_data}: {e}")

        if candidate_bgr is None:
            candidate_bgr = self.decode_image(candidate_image_url_or_data)

        if candidate_bgr is None:
            return {
                "similarity": 0,
                "status": "Candidate photo unavailable",
                "candidate_face_detected": False,
                "match": False
            }

        cand_analysis = self.analyze_face(candidate_bgr)
        if not cand_analysis.get("face_detected"):
            return {
                "similarity": 0,
                "status": "No face detected in candidate image",
                "candidate_face_detected": False,
                "match": False
            }

        cand_emb = cand_analysis.get("embedding")
        sim_pct, sim_status = self.compute_similarity(target_embedding, cand_emb)

        return {
            "similarity": sim_pct,
            "status": sim_status,
            "candidate_face_detected": True,
            "match": sim_pct >= 65,
            "quality": cand_analysis.get("quality")
        }

face_service = FaceService()
