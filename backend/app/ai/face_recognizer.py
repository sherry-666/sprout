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

_TOLERANCE = 0.6  # euclidean distance threshold; 0.6 is the face_recognition library default


def _to_rgb_array(image_bytes: bytes) -> np.ndarray:
    img = PILImage.open(io.BytesIO(image_bytes)).convert("RGB")
    return np.array(img)


def encode_face(image_bytes: bytes) -> Optional[list[float]]:
    """
    Extract a 128-d face embedding from image bytes.
    Returns the embedding of the largest (most prominent) face, or None if
    no face is detected or face_recognition is unavailable.
    upsample=2 finds faces at ~1/4 normal minimum size, important for
    profile photos where the subject's face may not fill the frame.
    """
    try:
        import face_recognition
        img = _to_rgb_array(image_bytes)
        locations = face_recognition.face_locations(img, number_of_times_to_upsample=2, model="hog")
        if not locations:
            log.warning("encode_face: no face detected in image (size=%dx%d)", img.shape[1], img.shape[0])
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
    upsample=2 finds smaller faces (important for group activity photos).
    """
    if not candidates:
        return []
    try:
        import face_recognition
        img = _to_rgb_array(image_bytes)
        # Detect locations first with upsampling so small faces in group photos are found
        locations = face_recognition.face_locations(img, number_of_times_to_upsample=2, model="hog")
        if not locations:
            log.warning("match_faces: no faces detected in activity photo (size=%dx%d)", img.shape[1], img.shape[0])
            return []
        log.warning("match_faces: detected %d face(s) in activity photo", len(locations))
        unknown_encodings = face_recognition.face_encodings(img, known_face_locations=locations)
        if not unknown_encodings:
            return []

        kid_ids = list(candidates.keys())
        known = [np.array(candidates[kid_id]) for kid_id in kid_ids]

        matched: dict[str, float] = {}
        for unk in unknown_encodings:
            distances = face_recognition.face_distance(known, unk)
            # Winner-takes-all: each detected face goes to its single best-matching kid only
            best_idx = int(np.argmin(distances))
            best_dist = distances[best_idx]
            if best_dist <= _TOLERANCE:
                kid_id = kid_ids[best_idx]
                confidence = round(float(1.0 - best_dist), 3)
                if confidence > matched.get(kid_id, 0):
                    matched[kid_id] = confidence

        log.warning("match_faces: matched %d kid(s) within tolerance %.2f", len(matched), _TOLERANCE)
        return sorted(matched.items(), key=lambda x: -x[1])
    except ImportError:
        log.warning("face_recognition not installed — face matching skipped")
        return []
    except Exception as e:
        log.warning("match_faces failed: %s", e)
        return []
