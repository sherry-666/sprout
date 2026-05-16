import face_recognition
import numpy as np
from typing import List, Tuple

def get_face_embedding(image_path: str) -> bytes:
    """
    Extracts the 128-d face embedding from an image file.
    Returns the first face found as bytes, or None if no face is detected.
    """
    image = face_recognition.load_image_file(image_path)
    face_encodings = face_recognition.face_encodings(image)
    
    if not face_encodings:
        return None
        
    # Return the first detected face as bytes for storage in MongoDB
    return face_encodings[0].tobytes()

def identify_kids_in_photo(photo_path: str, known_embeddings: dict) -> List[str]:
    """
    Takes a photo path and a dictionary of known embeddings {kid_id: embedding_bytes}.
    Returns a list of kid_ids that were detected in the photo.
    """
    image = face_recognition.load_image_file(photo_path)
    face_encodings = face_recognition.face_encodings(image)
    
    if not face_encodings:
        return []
        
    detected_kid_ids = set()
    
    # Convert known embeddings back to numpy arrays
    known_encodings = []
    kid_ids = []
    for kid_id, emb_bytes in known_embeddings.items():
        if emb_bytes:
            known_encodings.append(np.frombuffer(emb_bytes, dtype=np.float64))
            kid_ids.append(kid_id)
            
    if not known_encodings:
        return []
        
    for unknown_encoding in face_encodings:
        # Compare unknown face with all known kids
        results = face_recognition.compare_faces(known_encodings, unknown_encoding, tolerance=0.5)
        
        for i, is_match in enumerate(results):
            if is_match:
                detected_kid_ids.add(kid_ids[i])
                
    return list(detected_kid_ids)
