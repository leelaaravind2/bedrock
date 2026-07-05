# __PROJECT_NAME__ (Go backend)

A multi-user-ready **Go (net/http + database/sql) + __DB_DISPLAY_NAME__** REST API.

| Layer    | Technology   |
|----------|--------------|
| Backend  | Go (net/http) |
| Database | __DB_DISPLAY_NAME__   |
| Auth     | Simple login (HTTP Basic) |

This is a **standard Go project**. It has no dependency on the tool that generated
it (Laws 19-21): `docker compose up --build`, or `go run .` with a local
__DB_DISPLAY_NAME__ reachable on `localhost:__DB_PORT__`.

## Layout
- `main.go` — server entry (config → db → migrate → seed → routes).
- `internal/entities/<name>/` — one CRUD slice per entity. The `*_base.go` files
  and `store.go` are Thraksha-owned (regenerated on every run); `service.go` and
  `routes.go` are yours — created once, then never overwritten (ADR-002).
- `migrations/` — SQL migrations applied in order on startup.
