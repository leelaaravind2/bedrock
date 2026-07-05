'use strict';

// Seeds the default login user once, on startup, if it does not already exist.
// The password is hashed here at RUNTIME (with a per-install salt) — this is
// application behaviour, not generator output, so it does not affect the
// deterministic, byte-for-byte generation guarantee (ADR-003).
const bcrypt = require('bcryptjs');
const pool = require('./db');

async function seed() {
  const username = process.env.APP_SEED_ADMIN_USERNAME || 'admin';
  const password = process.env.APP_SEED_ADMIN_PASSWORD || 'admin123';
  const { rowCount } = await pool.query('SELECT 1 FROM users WHERE username = $1', [username]);
  if (rowCount === 0) {
    const hash = bcrypt.hashSync(password, 10);
    await pool.query('INSERT INTO users (username, password_hash, enabled) VALUES ($1, $2, TRUE)', [
      username,
      hash,
    ]);
    console.log('Seeded default user "' + username + '"');
  }
}

module.exports = seed;
