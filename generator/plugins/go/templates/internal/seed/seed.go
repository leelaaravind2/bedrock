// THRAKSHA-owned shell. Seeds the default login user once, on startup.
//
// The password is hashed here at RUNTIME (with a per-install salt) — application
// behaviour, not generator output — so it does not affect the deterministic,
// byte-for-byte generation guarantee (ADR-003).
package seed

import (
	"database/sql"
	"log"
	"os"

	"golang.org/x/crypto/bcrypt"
)

// Run inserts the default admin user if it does not already exist.
func Run(db *sql.DB) error {
	username := getenv("APP_SEED_ADMIN_USERNAME", "admin")
	password := getenv("APP_SEED_ADMIN_PASSWORD", "admin123")

	var one int
	err := db.QueryRow("SELECT 1 FROM users WHERE username = __DB_PH1__", username).Scan(&one)
	if err == nil {
		return nil // already seeded
	}
	if err != sql.ErrNoRows {
		return err
	}

	// bcrypt only considers the first 72 bytes; truncate to stay within its limit.
	pw := []byte(password)
	if len(pw) > 72 {
		pw = pw[:72]
	}
	hash, err := bcrypt.GenerateFromPassword(pw, bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	if _, err := db.Exec(
		"INSERT INTO users (username, password_hash, enabled) VALUES (__DB_PH1__, __DB_PH2__, TRUE)",
		username, string(hash),
	); err != nil {
		return err
	}
	log.Printf("Seeded default user %q", username)
	return nil
}

func getenv(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}
