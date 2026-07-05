'use strict';

// Small helper to throw errors that carry an HTTP status, which app.js's error
// handler turns into the right response code (e.g. 404 not found, 409 conflict).
function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

module.exports = { httpError };
