# __PROJECT_NAME__ (Django backend)

A **Django + Django REST Framework + __DB_DISPLAY_NAME__** REST API.

| Layer    | Technology   |
|----------|--------------|
| Backend  | Django + DRF (Python) |
| Database | __DB_DISPLAY_NAME__   |

This is a **standard Django project**. It has no dependency on the tool that
generated it and runs perfectly on its own.

## Run it

```bash
docker compose up --build
```

Then:

- Health: <http://localhost:8000/api/health/> → `{"status":"ok","app":"__PROJECT_NAME__"}`
- Default login: `admin` / `admin123`.

Every entity endpoint requires authentication and is owner-scoped to the logged-in
user (multi-user). Each entity exposes CRUD under `/api/<entity-plural>/`:

```bash
curl -u admin:admin123 -X POST http://localhost:8000/api/tickets/ \
  -H 'Content-Type: application/json' -d '{"title":"First"}'
curl -u admin:admin123 http://localhost:8000/api/tickets/
```

## Layout

```
__PROJECT_NAME__/
├── docker-compose.yml      # db + backend
├── Dockerfile
├── manage.py
├── requirements.txt
├── config/                 # Django project (settings, urls, wsgi/asgi)
└── entities/<name>/        # one Django app per entity (model, serializer, viewset, migration)
```

## Run without Docker (optional)

```bash
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

with a local __DB_DISPLAY_NAME__ reachable on `localhost:__DB_PORT__`.
