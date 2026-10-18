import asyncio
from sqlalchemy import select
from .config import get_config
from .database import SessionLocal
from .models import User, AppSetting
from .security import hash_password


async def bootstrap():
    cfg = get_config()
    async with SessionLocal() as db:
        setting = await db.get(AppSetting, 1)
        if setting is None:
            db.add(AppSetting(id=1, max_upload_mb=min(8, cfg.max_upload_mb)))
        user_exists = await db.scalar(select(User.id).limit(1))
        if user_exists is None:
            if not cfg.bootstrap_admin_email or len(cfg.bootstrap_admin_password) < 12:
                raise RuntimeError("Set BOOTSTRAP_ADMIN_EMAIL and BOOTSTRAP_ADMIN_PASSWORD (12+ characters) for the first startup")
            db.add(User(email=cfg.bootstrap_admin_email.lower(), full_name="System Administrator",
                        password_hash=hash_password(cfg.bootstrap_admin_password), role="admin", is_active=True))
        await db.commit()


if __name__ == "__main__":
    asyncio.run(bootstrap())
