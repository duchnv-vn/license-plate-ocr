from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from ..database import get_session
from ..models import AppSetting, User
from ..schemas import SettingsRead, SettingsUpdate
from ..dependencies import current_user, authorize
from ..config import get_config

router = APIRouter(prefix="/settings", tags=["Settings"])


@router.get("", response_model=SettingsRead)
async def read_settings(db: AsyncSession = Depends(get_session), _: User = Depends(current_user)):
    return await db.get(AppSetting, 1)


@router.put("", response_model=SettingsRead)
async def update_settings(data: SettingsUpdate, db: AsyncSession = Depends(get_session), _: User = Depends(authorize("admin"))):
    if data.max_upload_mb > get_config().max_upload_mb:
        raise HTTPException(422, f"Configured maximum is {get_config().max_upload_mb} MB")
    settings = await db.get(AppSetting, 1)
    for key, value in data.model_dump().items():
        setattr(settings, key, value)
    await db.commit()
    await db.refresh(settings)
    return settings
