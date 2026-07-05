// THRAKSHA-owned shell. A tiny, deterministic migration runner (the Go equivalent
// of Flyway).
//
// It applies every migrations/V*.sql file in filename order exactly once, recording
// applied versions in a schema_migrations table. Standard SQL; no platform-specific
// markers (Laws 19-21). The bookkeeping timestamp type comes from the database
// provider, so it is correct for whichever database was selected.
package migrate

import (
	"database/sql"
	"log"
	"os"
	"path/filepath"
	"sort"
	"strings"
)

const migrationsDir = "migrations"

// Run applies all pending migrations in order.
func Run(db *sql.DB) error {
	if _, err := db.Exec(
		"CREATE TABLE IF NOT EXISTS schema_migrations (version VARCHAR(255) PRIMARY KEY, applied_at __DB_SCHEMA_MIGRATIONS_TS__)",
	); err != nil {
		return err
	}

	entries, err := os.ReadDir(migrationsDir)
	if err != nil {
		return err
	}
	var files []string
	for _, e := range entries {
		if strings.HasSuffix(e.Name(), ".sql") {
			files = append(files, e.Name())
		}
	}
	sort.Strings(files)

	for _, name := range files {
		var one int
		err := db.QueryRow("SELECT 1 FROM schema_migrations WHERE version = __DB_PH1__", name).Scan(&one)
		if err == nil {
			continue // already applied
		}
		if err != sql.ErrNoRows {
			return err
		}

		content, err := os.ReadFile(filepath.Join(migrationsDir, name))
		if err != nil {
			return err
		}
		tx, err := db.Begin()
		if err != nil {
			return err
		}
		if _, err := tx.Exec(string(content)); err != nil {
			_ = tx.Rollback()
			return err
		}
		if _, err := tx.Exec("INSERT INTO schema_migrations (version) VALUES (__DB_PH1__)", name); err != nil {
			_ = tx.Rollback()
			return err
		}
		if err := tx.Commit(); err != nil {
			return err
		}
		log.Printf("Applied migration %s", name)
	}
	return nil
}
