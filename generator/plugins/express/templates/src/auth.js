'use strict';

// Simple-login auth (Phase-A answer: Authentication = Simple login), the Express
// equivalent of the Spring HTTP Basic + users-table setup. The authenticated
// user's id is attached to the request as req.userId, which the generated entity
// code uses for per-user owner scoping (multi-user foundation, ADR-005).
const bcrypt = require('bcryptjs');
const pool = require('./db');

async function requireUser(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    if (!header.startsWith('Basic ')) {
      res.set('WWW-Authenticate', 'Basic realm="__PROJECT_NAME__"');
      return res.status(401).json({ error: 'Authentication required' });
    }
    const decoded = Buffer.from(header.slice(6), 'base64').toString('utf8');
    const sep = decoded.indexOf(':');
    const username = decoded.slice(0, sep);
    const password = decoded.slice(sep + 1);

    const { rows } = await pool.query(
      'SELECT id, password_hash, enabled FROM users WHERE username = $1',
      [username],
    );
    const user = rows[0];
    if (!user || !user.enabled || !bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    req.userId = user.id;
    return next();
  } catch (err) {
    return next(err);
  }
}

module.exports = { requireUser };
