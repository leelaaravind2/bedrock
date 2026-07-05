// THRAKSHA-owned shell. Simple-login auth (Phase-A: Authentication = Simple login).
//
// HTTP Basic against the users table; the authenticated user's id is stored in the
// request context and read by the generated entity code for per-user owner scoping
// (multi-user foundation, ADR-005).
package auth

import (
	"context"
	"database/sql"
	"encoding/base64"
	"net/http"
	"strings"

	"golang.org/x/crypto/bcrypt"

	"app/internal/web"
)

type ctxKey int

const userIDKey ctxKey = 0

// RequireUser is middleware that authenticates the request via HTTP Basic and puts
// the user's id in the context, or responds 401.
func RequireUser(db *sql.DB, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		username, password, ok := basicAuth(r.Header.Get("Authorization"))
		if !ok {
			unauthorized(w)
			return
		}
		var id int64
		var hash string
		var enabled bool
		err := db.QueryRow("SELECT id, password_hash, enabled FROM users WHERE username = __DB_PH1__", username).
			Scan(&id, &hash, &enabled)
		if err != nil || !enabled {
			unauthorized(w)
			return
		}
		// bcrypt only considers the first 72 bytes; truncate to stay within its limit.
		pw := []byte(password)
		if len(pw) > 72 {
			pw = pw[:72]
		}
		if bcrypt.CompareHashAndPassword([]byte(hash), pw) != nil {
			unauthorized(w)
			return
		}
		ctx := context.WithValue(r.Context(), userIDKey, id)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// UserID returns the authenticated user's id from the request context.
func UserID(r *http.Request) int64 {
	id, _ := r.Context().Value(userIDKey).(int64)
	return id
}

func basicAuth(header string) (string, string, bool) {
	const prefix = "Basic "
	if !strings.HasPrefix(header, prefix) {
		return "", "", false
	}
	decoded, err := base64.StdEncoding.DecodeString(header[len(prefix):])
	if err != nil {
		return "", "", false
	}
	user, pass, found := strings.Cut(string(decoded), ":")
	if !found {
		return "", "", false
	}
	return user, pass, true
}

func unauthorized(w http.ResponseWriter) {
	w.Header().Set("WWW-Authenticate", `Basic realm="__PROJECT_NAME__"`)
	web.WriteError(w, http.StatusUnauthorized, "authentication required")
}
