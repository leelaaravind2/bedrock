// __PROJECT_NAME__ — Go (net/http + database/sql) API.
//
// Standard Go; runs with no dependency on the tool that generated it
// (Laws 19-21). Startup order: load config, open the database, apply migrations,
// seed the default user, then serve. Entity routes are wired by the generated
// internal/entities package; the public health check needs no login.
package main

import (
	"log"
	"net/http"

	"app/internal/auth"
	"app/internal/config"
	"app/internal/db"
	"app/internal/entities"
	"app/internal/migrate"
	"app/internal/seed"
	"app/internal/web"
)

func main() {
	cfg := config.Load()

	database, err := db.Open(cfg)
	if err != nil {
		log.Fatalf("database: %v", err)
	}
	defer database.Close()

	if err := migrate.Run(database); err != nil {
		log.Fatalf("migrate: %v", err)
	}
	if err := seed.Run(database); err != nil {
		log.Fatalf("seed: %v", err)
	}

	mux := http.NewServeMux()
	mux.HandleFunc("GET /api/health", func(w http.ResponseWriter, r *http.Request) {
		web.WriteJSON(w, http.StatusOK, map[string]string{"status": "ok", "app": "__PROJECT_NAME__"})
	})

	// Every entity endpoint requires an authenticated user (owner scoping, ADR-005).
	api := http.NewServeMux()
	entities.Register(api, database)
	mux.Handle("/api/", auth.RequireUser(database, api))

	log.Println("listening on :8080")
	if err := http.ListenAndServe(":8080", mux); err != nil {
		log.Fatal(err)
	}
}
