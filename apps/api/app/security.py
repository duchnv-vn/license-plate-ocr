from datetime import datetime, timedelta, timezone
import jwt
from pwdlib import PasswordHash
from .config import get_config

hasher = PasswordHash.recommended()


def hash_password(raw: str) -> str:
    return hasher.hash(raw)


def check_password(raw: str, digest: str) -> bool:
    return hasher.verify(raw, digest)


def issue_token(user_id: int) -> str:
    config = get_config()
    now = datetime.now(timezone.utc)
    return jwt.encode({
        "sub": str(user_id), "iat": now, "exp": now + timedelta(minutes=config.jwt_expire_minutes),
    }, config.jwt_secret, algorithm="HS256")


def decode_token(token: str) -> int:
    payload = jwt.decode(token, get_config().jwt_secret, algorithms=["HS256"], options={"require": ["sub", "exp", "iat"]})
    return int(payload["sub"])
