"""Seeds the default login user once, on startup, if it does not already exist.

The password is hashed here at RUNTIME (with a per-install salt) — this is
application behaviour, not generator output, so it does not affect the
deterministic, byte-for-byte generation guarantee (ADR-003).
"""
import os

import bcrypt
from sqlalchemy import text

from .db import engine


def run() -> None:
    username = os.environ.get("APP_SEED_ADMIN_USERNAME", "admin")
    password = os.environ.get("APP_SEED_ADMIN_PASSWORD", "admin123")
    with engine.begin() as conn:
        exists = conn.execute(
            text("SELECT 1 FROM users WHERE username = :u"), {"u": username}
        ).first()
        if not exists:
            # bcrypt only considers the first 72 bytes; truncate to stay within its limit.
            hashed = bcrypt.hashpw(password.encode("utf-8")[:72], bcrypt.gensalt()).decode("utf-8")
            conn.execute(
                text(
                    "INSERT INTO users (username, password_hash, enabled) "
                    "VALUES (:u, :p, TRUE)"
                ),
                {"u": username, "p": hashed},
            )
            print(f'Seeded default user "{username}"')
