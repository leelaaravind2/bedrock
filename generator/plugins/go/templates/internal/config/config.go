// THRAKSHA-owned shell. Runtime configuration, read from the environment.
//
// Values are supplied by docker-compose (see docker-compose.yml), with localhost
// defaults so the app can also run directly. Standard 12-factor config — no
// dependency on the tool that generated this project (Laws 19-21).
package config

import "os"

// Config holds the database connection settings.
type Config struct {
	Host     string
	Port     string
	Database string
	User     string
	Password string
}

// Load reads the configuration from the environment.
func Load() Config {
	return Config{
		Host:     getenv("PGHOST", "localhost"),
		Port:     getenv("PGPORT", "__DB_PORT__"),
		Database: getenv("PGDATABASE", "__DB_NAME__"),
		User:     getenv("PGUSER", "__DB_USER__"),
		Password: getenv("PGPASSWORD", "__DB_PASSWORD__"),
	}
}

func getenv(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}
