'use strict';

// Entry point: run migrations, seed the default user, then start the server.
const app = require('./app');
const migrate = require('./migrate');
const seed = require('./seed');

const PORT = Number(process.env.PORT || 8080);

async function start() {
  await migrate();
  await seed();
  app.listen(PORT, () => console.log('__PROJECT_NAME__ backend listening on port ' + PORT));
}

start().catch((err) => {
  console.error('Failed to start:', err);
  process.exit(1);
});
