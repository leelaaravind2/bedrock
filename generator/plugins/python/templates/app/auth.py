"""Simple-login auth (Phase-A answer: Authentication = Simple login).

The FastAPI equivalent of the Spring HTTP Basic + users-table setup. The
authenticated user's id is returned by the `require_user` dependency, which the
generated entity code uses for per-user owner scoping (multi-user foundation,
ADR-005).
"""
import base64
import binascii

import bcrypt
from fastapi import HTTPException, Request, status
from sqlalchemy import text

from .db import SessionLocal

_UNAUTHORIZED = {"WWW-Authenticate": 'Basic realm="__PROJECT_NAME__"'}


def _check_password(password: str, password_hash: str) -> bool:
    # bcrypt only considers the first 72 bytes; truncate to stay within its limit.
    return bcrypt.checkpw(
        password.encode("utf-8")[:72], password_hash.encode("utf-8")
    )


def require_user(request: Request) -> int:
    """Resolve the current user's id from HTTP Basic credentials, or 401."""
    header = request.headers.get("authorization", "")
    if not header.startswith("Basic "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers=_UNAUTHORIZED,
        )
    try:
        decoded = base64.b64decode(header[6:]).decode("utf-8")
    except (binascii.Error, UnicodeDecodeError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
            headers=_UNAUTHORIZED,
        )
    username, _, password = decoded.partition(":")

    db = SessionLocal()
    try:
        row = db.execute(
            text("SELECT id, password_hash, enabled FROM users WHERE username = :u"),
            {"u": username},
        ).first()
    finally:
        db.close()

    if row is None or not row.enabled or not _check_password(password, row.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
            headers=_UNAUTHORIZED,
        )
    return row.id
