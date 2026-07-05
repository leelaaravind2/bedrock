'use strict';

// A tiny, deterministic migration runner (the Express equivalent of Flyway).
// It applies every migrations/V*.sql file in filename order exactly once,
// recording applied versions in a schema_migrations table. Standard SQL; no
// platform-specific markers (Laws 19-21).
const fs = require('fs');
const path = require('path');
const pool = require('./db');

const MIGRATIONS_DIR = path.join(__dirname, '..', 'migrations');

async function migrate() {
  await pool.query(
    'CREATE TABLE IF NOT EXISTS schema_migrations (version VARCHAR(255) PRIMARY KEY, applied_at __DB_SCHEMA_MIGRATIONS_TS__)',
  );
  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();
  for (const file of files) {
    const version = file;
    const { rowCount } = await pool.query('SELECT 1 FROM schema_migrations WHERE version = $1', [version]);
    if (rowCount > 0) continue;
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations (version) VALUES ($1)', [version]);
      await client.query('COMMIT');
      console.log('Applied migration ' + version);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}

module.exports = migrate;
