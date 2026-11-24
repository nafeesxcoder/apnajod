/**
 * The request a sign-in is happening in (its browser or app, and its address),
 * so a new session can record the device without every caller passing the request.
 */
const { AsyncLocalStorage } = require('async_hooks');

const store = new AsyncLocalStorage();

function requestContext(req, res, next) {
  store.run(
    { userAgent: String(req.headers['user-agent'] || ''), ip: String(req.ip || '') },
    next,
  );
}

function currentRequest() {
  return store.getStore() || {};
}

module.exports = { requestContext, currentRequest };
