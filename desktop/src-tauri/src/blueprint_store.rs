// Thraksha desktop shell — the local BLUEPRINT STORE (Eco-Day 8, Option A).
//
// Persistence is a SHELL concern (architecture §4): the blueprint is stored here,
// in SQLite compiled into desktop.exe (rusqlite "bundled"). The GENERATOR stays
// pure Node — it never owns a database; the shell hands it canonical JSON.
//
// The store's determinism obligation is simple and total: persist the canonical
// blueprint bytes and return them BYTE-IDENTICAL. SQLite TEXT round-trips a string
// verbatim; this module + its test prove it (save→load == saved, save-twice ==).

use rusqlite::{params, Connection};
use sha2::{Digest, Sha256};

/// A local SQLite store of blueprints. Canonical JSON in, byte-identical JSON out.
pub struct BlueprintStore {
    conn: Connection,
}

impl BlueprintStore {
    /// Open (or create) a store at `path` (":memory:" for a transient store).
    pub fn open(path: &str) -> rusqlite::Result<Self> {
        let conn = Connection::open(path)?;
        conn.execute(
            "CREATE TABLE IF NOT EXISTS blueprints (
                id             INTEGER PRIMARY KEY AUTOINCREMENT,
                name           TEXT NOT NULL,
                canonical_json TEXT NOT NULL,
                sha256         TEXT NOT NULL
            )",
            [],
        )?;
        Ok(Self { conn })
    }

    fn sha256_hex(s: &str) -> String {
        let mut h = Sha256::new();
        h.update(s.as_bytes());
        h.finalize().iter().map(|b| format!("{:02x}", b)).collect()
    }

    /// Save a blueprint (canonical JSON). Returns its row id.
    pub fn save(&self, name: &str, canonical_json: &str) -> rusqlite::Result<i64> {
        let sha = Self::sha256_hex(canonical_json);
        self.conn.execute(
            "INSERT INTO blueprints (name, canonical_json, sha256) VALUES (?1, ?2, ?3)",
            params![name, canonical_json, sha],
        )?;
        Ok(self.conn.last_insert_rowid())
    }

    /// Load a blueprint's canonical JSON by row id (verbatim bytes).
    pub fn load(&self, id: i64) -> rusqlite::Result<String> {
        self.conn.query_row(
            "SELECT canonical_json FROM blueprints WHERE id = ?1",
            params![id],
            |row| row.get(0),
        )
    }

    /// Load the stored sha256 for a row (integrity check).
    pub fn load_sha(&self, id: i64) -> rusqlite::Result<String> {
        self.conn.query_row(
            "SELECT sha256 FROM blueprints WHERE id = ?1",
            params![id],
            |row| row.get(0),
        )
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    /// The load-bearing store proof. Driven by env vars for the end-to-end loop:
    ///   THRAKSHA_BP_IN  — a canonical blueprint file produced by the Node generator
    ///   THRAKSHA_BP_OUT — where to write the bytes AFTER a SQLite save→load round-trip
    /// so the Node bridge can regenerate from the round-tripped bytes and match the
    /// frozen digest. Falls back to an embedded string when the env vars are unset.
    #[test]
    fn blueprint_round_trips_byte_identical() {
        let input = match std::env::var("THRAKSHA_BP_IN") {
            Ok(p) => std::fs::read_to_string(&p).expect("read THRAKSHA_BP_IN"),
            Err(_) => r#"{"a":1,"entities":[{"name":"X"}],"z":"end"}"#.to_string(),
        };

        // Store on disk (a real SQLite file, not in-memory) to mirror production.
        let db_path = std::env::temp_dir().join("thraksha-blueprint-test.sqlite");
        let _ = std::fs::remove_file(&db_path);
        let store = BlueprintStore::open(db_path.to_str().unwrap()).expect("open store");

        let id = store.save("roundtrip", &input).expect("save");
        let loaded = store.load(id).expect("load");

        // (1) save→load is BYTE-IDENTICAL.
        assert_eq!(loaded, input, "loaded blueprint differs from saved (byte-identity broken)");
        // (2) the stored sha256 matches the loaded bytes (integrity).
        assert_eq!(store.load_sha(id).unwrap(), BlueprintStore::sha256_hex(&loaded));
        // (3) save-twice is identical (idempotent storage of the same canonical bytes).
        let id2 = store.save("roundtrip", &input).expect("save2");
        assert_eq!(store.load(id2).unwrap(), input, "save-twice differs");

        // Emit the round-tripped bytes for the Node bridge (end-to-end store→load→generate).
        if let Ok(out) = std::env::var("THRAKSHA_BP_OUT") {
            std::fs::write(&out, loaded.as_bytes()).expect("write THRAKSHA_BP_OUT");
        }
    }
}
