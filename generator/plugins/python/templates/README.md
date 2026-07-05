# __PROJECT_NAME__ (FastAPI backend)

A multi-user-ready **FastAPI + __DB_DISPLAY_NAME__** REST API.

| Layer    | Technology   |
|----------|--------------|
| Backend  | FastAPI (Python) |
| Database | __DB_DISPLAY_NAME__   |
| Auth     | Simple login (HTTP Basic) |

This is a **standard Python project**. It has no dependency on the tool that
generated it and runs perfectly on its own.

## Run it

```bash
docker compose up --build
```

Then:

- Health: <http://localhost:8000/api/health> → `{"status":"ok","app":"__PROJECT_NAME__"}`
- Interactive docs: <http://localhost:8000/docs>
- Default login: `admin` / `admin123`

Every other endpoint requires authentication. Each entity exposes CRUD under
`/api/<entity-plural>`, owner-scoped to the logged-in user. Example:

```bash
curl -u admin:admin123 -X POST http://localhost:8000/api/tickets \
  -H 'Content-Type: application/json' -d '{"title":"First"}'
curl -u admin:admin123 http://localhost:8000/api/tickets
```

## Multi-user-ready by design

- a `users` table exists from the first migration;
- every business entity carries an `owner_id` and is scoped to its owner;
- authentication is backed by the database users table.

## Layout

```
__PROJECT_NAME__/
├── docker-compose.yml      # db + backend
├── Dockerfile
├── requirements.txt
├── migrations/             # V1 users, V2+ per entity (applied on startup)
└── app/
    ├── main.py             # FastAPI app; auto-mounts entity routers
    ├── config.py           # settings from the environment
    ├── db.py               # SQLAlchemy engine / session / Base
    ├── auth.py             # simple-login dependency (owner id)
    ├── migrate.py / seed.py
    └── entities/<name>/    # per-entity model, schemas, repository, service, routes
```

## Run without Docker (optional)

```bash
pip install -r requirements.txt
uvicorn app.main:app --reload
```

with a local __DB_DISPLAY_NAME__ reachable on `localhost:__DB_PORT__`.
