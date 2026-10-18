"""Authenticated recognition endpoint; no uploaded media persistence."""
from __future__ import annotations
import asyncio
import time
from statistics import mean

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from ..config import get_config
from ..database import get_session
from ..dependencies import authorize
from ..models import AppSetting, Operation, User
from ..services import engine
from ..image_processing import ACCEPTED, read_memory_only, decode_image

router = APIRouter(prefix="/ocr", tags=["OCR"])
# Enforce a small bound on simultaneous in-memory payloads and inference requests.
_slots = asyncio.Semaphore(2)

@router.post("/predict")
async def predict(request: Request, db: AsyncSession = Depends(get_session), actor: User = Depends(authorize("admin", "operator"))):
    start = time.perf_counter()
    if request.headers.get("content-type", "").split(";")[0].lower() not in ACCEPTED:
        raise HTTPException(415, "Use JPEG, PNG or WebP as a raw binary request body")
    try:
        await asyncio.wait_for(_slots.acquire(), timeout=5.0)
    except asyncio.TimeoutError:
        raise HTTPException(429, "Recognition service is busy. Retry shortly.") from None
    try:
        setting = await db.get(AppSetting, 1)
        config = get_config()
        maximum = min(setting.max_upload_mb, config.max_upload_mb) * 1024 * 1024
        payload = await read_memory_only(request, maximum)
        frame = decode_image(payload, config.max_image_pixels)
        height, width = frame.shape[:2]
        del payload
        try:
            found = await asyncio.to_thread(engine.predict, frame, setting.detection_threshold, setting.ocr_threshold)
        except Exception:
            if setting.save_operation_metadata:
                db.add(Operation(user_id=actor.id, duration_ms=round((time.perf_counter() - start)*1000), plate_count=0, success=False))
                await db.commit()
            raise HTTPException(503, "OCR inference failed; check model availability and service logs") from None
        finally:
            del frame
        duration_ms = round((time.perf_counter() - start)*1000)
        scores = [r.ocr_confidence for r in found if r.ocr_confidence is not None]
        if setting.save_operation_metadata:
            db.add(Operation(user_id=actor.id, duration_ms=duration_ms,
                             plate_count=len(found), average_confidence=mean(scores) if scores else None, success=True))
            await db.commit()
        return {"width": width, "height": height, "duration_ms": duration_ms,
                "plates": [reading.to_dict() for reading in found], "plate_count": len(found)}
    finally:
        _slots.release()
