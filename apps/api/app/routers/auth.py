from collections import defaultdict, deque
from datetime import datetime, timedelta, timezone
from threading import Lock
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from ..database import get_session
from ..models import User
from ..schemas import LoginRequest, TokenResponse, UserRead
from ..security import check_password, issue_token
from ..dependencies import current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])
_attempts: dict[str, deque[datetime]] = defaultdict(deque)
_attempts_lock = Lock()


def limit_reached(key: str) -> bool:
    now = datetime.now(timezone.utc)
    with _attempts_lock:
        if len(_attempts) > 10000:
            _attempts.clear()
        attempts = _attempts[key]
        while attempts and attempts[0] < now - timedelta(minutes=15):
            attempts.popleft()
        return len(attempts) >= 12


def record_failure(key: str) -> None:
    with _attempts_lock:
        _attempts[key].append(datetime.now(timezone.utc))


def clear_failures(key: str) -> None:
    with _attempts_lock:
        _attempts.pop(key, None)


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest, request: Request, db: AsyncSession = Depends(get_session)):
    # Nginx overwrites X-Real-IP and the API is Docker-internal only.
    peer = request.headers.get("x-real-ip") or (request.client.host if request.client else "unknown")
    if limit_reached(peer):
        raise HTTPException(429, "Too many login attempts. Retry after 15 minutes.")
    user = await db.scalar(select(User).where(User.email == body.email.lower()))
    if not user or not user.is_active or not check_password(body.password, user.password_hash):
        record_failure(peer)
        raise HTTPException(401, "Invalid credentials")
    clear_failures(peer)
    return TokenResponse(access_token=issue_token(user.id))


@router.get("/me", response_model=UserRead)
async def me(user: User = Depends(current_user)):
    return user
