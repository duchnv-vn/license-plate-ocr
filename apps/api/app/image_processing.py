"""Bounded in-memory upload handling and plate crop encoding."""
from __future__ import annotations
import io
import cv2
import numpy as np
from PIL import Image, ImageOps, UnidentifiedImageError
from fastapi import HTTPException, Request

ACCEPTED = {"image/jpeg", "image/png", "image/webp", "application/octet-stream"}


async def read_memory_only(request: Request, max_bytes: int) -> bytes:
    length = request.headers.get("content-length")
    if length:
        try:
            if int(length) > max_bytes:
                raise HTTPException(413, "Image exceeds configured size limit")
        except ValueError:
            raise HTTPException(400, "Invalid Content-Length") from None
    parts = bytearray()
    async for part in request.stream():
        if len(parts) + len(part) > max_bytes:
            raise HTTPException(413, "Image exceeds configured size limit")
        parts.extend(part)
    if not parts:
        raise HTTPException(400, "Empty image")
    return bytes(parts)


def decode_image(payload: bytes, max_pixels: int) -> np.ndarray:
    try:
        with Image.open(io.BytesIO(payload)) as picture:
            if picture.format not in {"JPEG", "PNG", "WEBP"}:
                raise ValueError("Only JPEG, PNG and WebP are supported")
            if picture.width * picture.height > max_pixels:
                raise ValueError("Image dimensions are too large")
            image = ImageOps.exif_transpose(picture).convert("RGB")
            data = np.asarray(image)
            return cv2.cvtColor(data, cv2.COLOR_RGB2BGR)
    except (UnidentifiedImageError, OSError, Image.DecompressionBombError, ValueError) as exc:
        raise HTTPException(422, f"Invalid image: {str(exc)[:100]}") from None


def encode_plate_crop(frame: np.ndarray, bbox: dict[str, int]) -> bytes:
    """Encode only the detected plate, capped at 512 pixels on its long side."""
    x, y = bbox["x"], bbox["y"]
    crop = frame[y:y + bbox["height"], x:x + bbox["width"]]
    if crop.size == 0:
        raise ValueError("Empty plate crop")
    height, width = crop.shape[:2]
    if max(height, width) > 512:
        scale = 512 / max(height, width)
        crop = cv2.resize(crop, (max(1, round(width * scale)), max(1, round(height * scale))), interpolation=cv2.INTER_AREA)
    ok, encoded = cv2.imencode(".jpg", crop, [cv2.IMWRITE_JPEG_QUALITY, 85])
    if not ok:
        raise ValueError("Could not encode plate crop")
    return encoded.tobytes()


