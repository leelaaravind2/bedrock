// THRAKSHA-owned shell. Opens the database/sql connection.
//
// The driver import, the registered driver name, and the DSN format all come from
// the Thraksha database provider (the same seam every backend uses) — nothing here
// is hardcoded to one database (Constitution Law 25).
package db

import (
	"database/sql"
	"fmt"

	_ "__DB_GO_DRIVER_IMPORT__"

	"app/internal/config"
)

// Open connects to the database using the configured driver and DSN, and verifies
// the connection with a ping.
func Open(cfg config.Config) (*sql.DB, error) {
	dsn := fmt.Sprintf("__DB_GO_DSN_FORMAT__", cfg.User, cfg.Password, cfg.Host, cfg.Port, cfg.Database)
	database, err := sql.Open("__DB_GO_DRIVER_NAME__", dsn)
	if err != nil {
		return nil, err
	}
	if err := database.Ping(); err != nil {
		return nil, err
	}
	return database, nil
}
