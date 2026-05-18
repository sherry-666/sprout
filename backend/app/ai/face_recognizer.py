"""
Face recognition using the face_recognition library (dlib backend).
Embeddings are 128-d float64 vectors stored in MongoDB on the Kid document.

encode_face(image_bytes)  → Optional[List[float]]  — extract dominant face
match_faces(image_bytes, candidates) → List[Tuple[str, float]]  — match all faces
"""
from __future__ import annotations
import io
import logging
import numpy as np
from typing import Optional
from PIL import Image as PILImage

log = logging.getLogger(__name__)

_TOLERANCE = 0.5  # cosine distance threshold; lower = stricter


def _to_rgb_array(image_bytes: bytes) -> np.ndarray:
    img = PILImage.open(io.BytesIO(image_bytes)).convert("RGB")
    return np.array(img)


def encode_face(image_bytes: bytes) -> Optional[list[float]]:
    """
    Extract a 128-d face embedding from image bytes.
    Returns the embedding of the largest (most prominent) face, or None if
    no face is detected or face_recognition is unavailable.
    """
    try:
        import face_recognition
        img = _to_rgb_array(image_bytes)
        locations = face_recognition.face_locations(img, model="hog")
        if not locations:
            return None
        encodings = face_recognition.face_encodings(img, locations)
        if not encodings:
            return None
        if len(locations) > 1:
            # Pick largest face by bounding-box area
            areas = [(b - t) * (r - l) for (t, r, b, l) in locations]
            idx = max(range(len(areas)), key=lambda i: areas[i])
            return encodings[idx].tolist()
        return encodings[0].tolist()
    except ImportError:
        log.warning("face_recognition not installed — face embedding skipped")
        return None
    except Exception as e:
        log.warning("encode_face failed: %s", e)
        return None


def match_faces(
    image_bytes: bytes,
    candidates: dict[str, list[float]],  # {kid_id: embedding}
) -> list[tuple[str, float]]:
    """
    Detect every face in the image and compare against stored kid embeddings.
    Returns a list of (kid_id, confidence) tuples for all matches within tolerance,
    sorted by descending confidence.  Confidence = 1 - face_distance (0–1 scale).
    """
    if not candidates:
        return []
    try:
        import face_recognition
        img = _to_rgb_array(image_bytes)
        unknown_encodings = face_recognition.face_encodings(img)
        if not unknown_encodings:
            return []

        kid_ids = list(candidates.keys())
        known = [np.array(candidates[kid_id]) for kid_id in kid_ids]

        matched: dict[str, float] = {}
        for unk in unknown_encodings:
            distances = face_recognition.face_distance(known, unk)
            for i, dist in enumerate(distances):
                if dist <= _TOLERANCE:
                    confidence = round(float(1.0 - dist), 3)
                    # Keep highest confidence per kid across multiple detected faces
                    kid_id = kid_ids[i]
                    if confidence > matched.get(kid_id, 0):
                        matched[kid_id] = confidence

        return sorted(matched.items(), key=lambda x: -x[1])
    except ImportError:
        log.warning("face_recognition not installed — face matching skipped")
        return []
    except Exception as e:
        log.warning("match_faces failed: %s", e)
        return []
