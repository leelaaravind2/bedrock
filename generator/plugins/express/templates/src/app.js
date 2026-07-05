'use strict';

// The Express application. Entity routers are auto-discovered by convention:
// every src/entities/<name>/<name>.routes.js that exports { basePath, router }
// is mounted automatically. This is the Express equivalent of Spring's component
// scan — the shell does not need to know which entities exist; it just mounts
// whatever entity routers are present. Public health check; everything else
// requires an authenticated user.
const fs = require('fs');
const path = require('path');
const express = require('express');
const { requireUser } = require('./auth');

const app = express();
app.use(express.json());

// Public endpoint — proves the API is up without logging in.
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', app: '__PROJECT_NAME__' });
});

// Everything below requires authentication (simple login).
app.use(requireUser);

// Auto-mount every generated entity router (sorted for deterministic order).
const entitiesDir = path.join(__dirname, 'entities');
if (fs.existsSync(entitiesDir)) {
  for (const name of fs.readdirSync(entitiesDir).sort()) {
    const routesFile = path.join(entitiesDir, name, name + '.routes.js');
    if (fs.existsSync(routesFile)) {
      const mounted = require(routesFile);
      app.use(mounted.basePath, mounted.router);
    }
  }
}

// JSON error handler. ResponseStatusError carries an HTTP status; anything else
// is a 500.
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  const status = err && err.status ? err.status : 500;
  res.status(status).json({ error: err && err.message ? err.message : 'Internal error' });
});

module.exports = app;
