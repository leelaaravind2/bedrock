# __PROJECT_NAME__

A multi-user-ready web application shell.

| Layer    | Technology   |
|----------|--------------|
| Backend  | Spring Boot  |
| Frontend | React (Vite) |
| Database | __DB_DISPLAY_NAME__   |
| Auth     | Simple login |

This is a **standard project**. It has no dependency on the tool that generated
it and runs perfectly on its own.

## Run it

You need Docker Desktop (or Docker Engine) with Compose v2.

```bash
docker compose up --build
```

Then open:

- Frontend: <http://localhost:3000>
- Backend health: <http://localhost:8080/api/health>

The frontend page shows the backend health status, proving the full stack
(frontend → nginx → backend → database) is wired up.

To stop and remove everything (including the database volume):

```bash
docker compose down -v
```

## Default login

A default user is seeded on first startup:

- Username: `admin`
- Password: `admin123`

Public endpoints (`/`, `/api/health`, `/actuator/health`) need no login; every
other endpoint requires authentication. Override the seed credentials with the
`APP_SEED_ADMIN_USERNAME` / `APP_SEED_ADMIN_PASSWORD` environment variables.

## Multi-user-ready by design

This project was generated multi-user-ready from the start (not as a later
toggle):

- a `users` table exists from the first migration;
- `common/BaseOwnedEntity` provides per-user ownership (`owner_id`) and audit
  timestamps that every future business entity inherits;
- authentication is backed by the database users table.

## Project layout

```
__PROJECT_NAME__/
├── docker-compose.yml      # db + backend + frontend
├── backend/                # Spring Boot service
│   ├── Dockerfile
│   ├── pom.xml
│   └── src/main/...
└── frontend/               # React app served by nginx
    ├── Dockerfile
    ├── nginx.conf
    └── src/...
```

## Run without Docker (optional)

- Backend: `cd backend && mvn spring-boot:run` (requires Maven + JDK 21) with a
  local __DB_DISPLAY_NAME__ reachable on `localhost:__DB_PORT__`.
- Frontend: `cd frontend && npm install && npm run dev`.
