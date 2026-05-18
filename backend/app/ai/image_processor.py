"""
Image processing pipeline for uploaded photos.

Responsibilities:
- Strip EXIF metadata (privacy — removes GPS, device info)
- Resize full-size image to max 1600px on longest side, JPEG @ 80%
- Generate 400px thumbnail, JPEG @ 75%

Returns (full_bytes, thumb_bytes) as a named tuple.
"""
import io
from typing import NamedTuple
from PIL import Image, ImageOps


MAX_FULL_PX = 1600
MAX_THUMB_PX = 400
FULL_QUALITY = 80
THUMB_QUALITY = 75


class ProcessedImage(NamedTuple):
    full: bytes       # resized full image
    thumbnail: bytes  # small thumbnail


def process(data: bytes) -> ProcessedImage:
    """
    Accept raw upload bytes, return (full, thumbnail) without EXIF.
    Raises ValueError for unrecognised image formats.
    """
    try:
        img = Image.open(io.BytesIO(data))
    except Exception as e:
        raise ValueError(f"Cannot open image: {e}") from e

    # Correct orientation from EXIF before stripping (handles phone uploads)
    img = ImageOps.exif_transpose(img)

    # Strip EXIF by converting through a clean RGB copy
    clean = Image.new(img.mode, img.size)
    clean.putdata(list(img.getdata()))
    clean = clean.convert("RGB")

    full = _resize(clean, MAX_FULL_PX)
    thumb = _resize(clean, MAX_THUMB_PX)

    return ProcessedImage(
        full=_encode(full, FULL_QUALITY),
        thumbnail=_encode(thumb, THUMB_QUALITY),
    )


def _resize(img: Image.Image, max_px: int) -> Image.Image:
    """Downscale so longest side ≤ max_px; never upscale."""
    w, h = img.size
    if max(w, h) <= max_px:
        return img
    if w >= h:
        new_w, new_h = max_px, int(h * max_px / w)
    else:
        new_w, new_h = int(w * max_px / h), max_px
    return img.resize((new_w, new_h), Image.LANCZOS)


def _encode(img: Image.Image, quality: int) -> bytes:
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=quality, optimize=True)
    return buf.getvalue()
