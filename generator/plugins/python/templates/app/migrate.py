"""A tiny, deterministic migration runner (the FastAPI equivalent of Flyway).

It applies every migrations/V*.sql file in filename order exactly once, recording
applied versions in a schema_migrations table. Standard SQL; no platform-specific
markers (Laws 19-21).
"""
import os

from sqlalchemy import text

from .db import engine

MIGRATIONS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "migrations")


def run() -> None:
    with engine.begin() as conn:
        conn.execute(
            text(
                "CREATE TABLE IF NOT EXISTS schema_migrations ("
                "version VARCHAR(255) PRIMARY KEY, "
                "applied_at __DB_SCHEMA_MIGRATIONS_TS__)"
            )
        )

    files = sorted(f for f in os.listdir(MIGRATIONS_DIR) if f.endswith(".sql"))
    for version in files:
        with engine.begin() as conn:
            already = conn.execute(
                text("SELECT 1 FROM schema_migrations WHERE version = :v"),
                {"v": version},
            ).first()
            if already:
                continue
            with open(os.path.join(MIGRATIONS_DIR, version), "r", encoding="utf-8") as fh:
                sql = fh.read()
            conn.exec_driver_sql(sql)
            conn.execute(
                text("INSERT INTO schema_migrations (version) VALUES (:v)"),
                {"v": version},
            )
            print(f"Applied migration {version}")
