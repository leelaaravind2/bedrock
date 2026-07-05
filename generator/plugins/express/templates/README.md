# __PROJECT_NAME__ (Express backend)

A multi-user-ready **Express + __DB_DISPLAY_NAME__** REST API.

| Layer    | Technology   |
|----------|--------------|
| Backend  | Express (Node.js) |
| Database | __DB_DISPLAY_NAME__   |
| Auth     | Simple login (HTTP Basic) |

This is a **standard Node project**. It has no dependency on the tool that
generated it and runs perfectly on its own.

## Run it

```bash
docker compose up --build
```

Then:

- Health: <http://localhost:8080/api/health> → `{"status":"ok","app":"__PROJECT_NAME__"}`
- Default login: `admin` / `admin123`

Every other endpoint requires authentication. Each entity exposes CRUD under
`/api/<entity-plural>`, owner-scoped to the logged-in user. Example:

```bash
curl -u admin:admin123 -X POST http://localhost:8080/api/tickets \
  -H 'Content-Type: application/json' -d '{"title":"First"}'
curl -u admin:admin123 http://localhost:8080/api/tickets
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
├── package.json
├── migrations/             # V1 users, V2+ per entity (applied on startup)
└── src/
    ├── server.js           # entry: migrate -> seed -> listen
    ├── app.js              # Express app; auto-mounts entity routers
    ├── db.js / migrate.js / seed.js / auth.js
    └── entities/<name>/    # per-entity model, repository, dto, service, routes
```

## Run without Docker (optional)

`npm install` then `npm start`, with a local __DB_DISPLAY_NAME__ reachable on
`localhost:__DB_PORT__`.
