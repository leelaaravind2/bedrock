'use strict';

// __DB_DISPLAY_NAME__ connection pool. Values come from the environment (set by
// docker-compose), with localhost defaults so the app can run directly too.
const { Pool } = require('__DB_NODE_DRIVER__');

const pool = new Pool({
  host: process.env.PGHOST || 'localhost',
  port: Number(process.env.PGPORT || __DB_PORT__),
  database: process.env.PGDATABASE || '__DB_NAME__',
  user: process.env.PGUSER || '__DB_USER__',
  password: process.env.PGPASSWORD || '__DB_PASSWORD__',
});

module.exports = pool;
