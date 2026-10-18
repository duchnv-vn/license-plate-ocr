from datetime import datetime, timedelta, timezone
from sqlalchemy import select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import APIRouter, Depends
from ..database import get_session
from ..dependencies import current_user
from ..models import Operation, User

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/summary")
async def summary(db: AsyncSession = Depends(get_session), _: User = Depends(current_user)):
    now = datetime.now(timezone.utc)
    today = now.replace(hour=0, minute=0, second=0, microsecond=0)
    totals = (await db.execute(select(
        func.count(Operation.id), func.coalesce(func.sum(Operation.plate_count), 0),
        func.coalesce(func.avg(Operation.duration_ms), 0),
        func.coalesce(func.avg(Operation.average_confidence), 0),
    ).where(Operation.timestamp >= today))).one()
    total_24 = await db.scalar(select(func.count(Operation.id)).where(Operation.timestamp >= now-timedelta(hours=24)))
    history = (await db.scalars(select(Operation).order_by(desc(Operation.timestamp)).limit(25))).all()
    daily_counts = (await db.execute(select(func.date(Operation.timestamp), func.count(Operation.id))
        .where(Operation.timestamp >= today - timedelta(days=6)).group_by(func.date(Operation.timestamp)))).all()
    by_day = {str(day): count for day, count in daily_counts}
    trends = [{"date": (today - timedelta(days=(6-i))).date().isoformat(),
               "count": by_day.get((today - timedelta(days=(6-i))).date().isoformat(), 0)} for i in range(7)]
    return {
        "operations_today": totals[0], "plates_today": int(totals[1]),
        "average_duration_ms": round(float(totals[2]), 1),
        "average_ocr_confidence": round(float(totals[3]), 4),
        "operations_last_24h": total_24,
        "trend": trends,
        "recent": [{"id": r.id, "timestamp": r.timestamp, "duration_ms": r.duration_ms,
                    "plate_count": r.plate_count, "average_confidence": r.average_confidence,
                    "success": r.success} for r in history],
    }
