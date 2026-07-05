-- V1 — initial schema.
--
-- Multi-user foundation (ADR-005): the `users` table and per-user ownership are
-- part of the project from day one, before any business entity exists. This is
-- the up-front multi-user decision made concrete — not a later toggle.

__DB_USERS_TABLE_DDL__

CREATE INDEX idx_users_username ON users (username);
