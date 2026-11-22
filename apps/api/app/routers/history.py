"""Authenticated access to saved plate detections and their crops."""
from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_session
from ..dependencies import current_user
from ..models import Operation, PlateDetection, User

router = APIRouter(prefix="/history", tags=["History"])


def record_json(plate: PlateDetection, operation: Operation) -> dict:
    return {
        "id": plate.id,
        "operation_id": operation.id,
        "timestamp": operation.timestamp,
        "user_id": operation.user_id,
        "duration_ms": operation.duration_ms,
        "text": plate.text,
        "detection_confidence": plate.detection_confidence,
        "ocr_confidence": plate.ocr_confidence,
        "bbox": plate.bbox,
        "character_confidences": plate.character_confidences,
        "region": plate.region,
        "image_url": f"/api/history/{plate.id}/image",
    }


@router.get("")
async def list_history(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_session),
    _: User = Depends(current_user),
):
    total = await db.scalar(select(func.count(PlateDetection.id)))
    rows = (await db.execute(
        select(PlateDetection, Operation)
        .join(Operation, PlateDetection.operation_id == Operation.id)
        .order_by(desc(Operation.timestamp), desc(PlateDetection.id))
        .offset((page - 1) * page_size).limit(page_size)
    )).all()
    return {"items": [record_json(plate, operation) for plate, operation in rows],
            "total": total or 0, "page": page, "page_size": page_size}


@router.get("/{record_id}")
async def get_history_record(record_id: int, db: AsyncSession = Depends(get_session), _: User = Depends(current_user)):
    row = (await db.execute(
        select(PlateDetection, Operation).join(Operation, PlateDetection.operation_id == Operation.id)
        .where(PlateDetection.id == record_id)
    )).one_or_none()
    if row is None:
        raise HTTPException(404, "Detection record not found")
    return record_json(*row)


@router.get("/{record_id}/image")
async def get_plate_image(record_id: int, db: AsyncSession = Depends(get_session), _: User = Depends(current_user)):
    image = await db.scalar(select(PlateDetection.image).where(PlateDetection.id == record_id))
    if image is None:
        raise HTTPException(404, "Plate image not found")
    return Response(content=image, media_type="image/jpeg")
