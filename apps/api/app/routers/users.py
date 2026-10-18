from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from ..database import get_session
from ..dependencies import authorize
from ..models import User
from ..schemas import UserCreate, UserRead, UserUpdate
from ..security import hash_password

router = APIRouter(prefix="/users", tags=["Users"])


async def protect_admin(db: AsyncSession, target: User):
    if target.role == "admin":
        count = await db.scalar(select(func.count(User.id)).where(User.role == "admin", User.is_active.is_(True)))
        if count is not None and count <= 1 and target.is_active:
            raise HTTPException(409, "Cannot remove or deactivate the last active administrator")


@router.get("", response_model=list[UserRead])
async def list_users(db: AsyncSession = Depends(get_session), _: User = Depends(authorize("admin"))):
    return (await db.scalars(select(User).order_by(User.id))).all()


@router.post("", response_model=UserRead, status_code=201)
async def create_user(data: UserCreate, db: AsyncSession = Depends(get_session), _: User = Depends(authorize("admin"))):
    user = User(email=data.email.lower(), full_name=data.full_name, password_hash=hash_password(data.password), role=data.role, is_active=data.is_active)
    db.add(user)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(409, "Email is already registered") from None
    await db.refresh(user)
    return user


@router.patch("/{user_id}", response_model=UserRead)
async def update_user(user_id: int, data: UserUpdate, db: AsyncSession = Depends(get_session), actor: User = Depends(authorize("admin"))):
    user = await db.get(User, user_id)
    if user is None:
        raise HTTPException(404, "User not found")
    patch = data.model_dump(exclude_unset=True)
    dropping_admin = user.role == "admin" and (patch.get("role", user.role) != "admin" or not patch.get("is_active", user.is_active))
    if dropping_admin:
        await protect_admin(db, user)
    if actor.id == user.id and (patch.get("role", "admin") != "admin" or patch.get("is_active", True) is False):
        raise HTTPException(409, "You cannot remove your own administrative access")
    for key, value in patch.items():
        if key == "password":
            user.password_hash = hash_password(value)
        elif key == "email":
            user.email = value.lower()
        elif value is not None:
            setattr(user, key, value)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(409, "Email is already registered") from None
    await db.refresh(user)
    return user


@router.delete("/{user_id}", status_code=204)
async def delete_user(user_id: int, db: AsyncSession = Depends(get_session), actor: User = Depends(authorize("admin"))):
    user = await db.get(User, user_id)
    if user is None:
        raise HTTPException(404, "User not found")
    if user.id == actor.id:
        raise HTTPException(409, "You cannot delete your own account")
    await protect_admin(db, user)
    await db.delete(user)
    await db.commit()
