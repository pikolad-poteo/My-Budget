const crypto = require('crypto');

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const TOKEN_BYTES = 32;

function shouldSkipCsrf() {
  return process.env.NODE_ENV === 'test' || process.env.CSRF_DISABLED === 'true';
}

function createToken() {
  return crypto.randomBytes(TOKEN_BYTES).toString('hex');
}

function getSessionToken(req) {
  if (!req.session) {
    return null;
  }

  if (!req.session.csrfToken) {
    req.session.csrfToken = createToken();
  }

  return req.session.csrfToken;
}

function getRequestToken(req) {
  const bodyToken = req.body && req.body._csrf;
  const queryToken = req.query && req.query._csrf;
  const headerToken = req.get && (req.get('x-csrf-token') || req.get('csrf-token'));

  return bodyToken || queryToken || headerToken || '';
}

function areTokensEqual(sessionToken, requestToken) {
  if (!sessionToken || !requestToken) {
    return false;
  }

  const sessionBuffer = Buffer.from(String(sessionToken));
  const requestBuffer = Buffer.from(String(requestToken));

  if (sessionBuffer.length !== requestBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(sessionBuffer, requestBuffer);
}

function attachCsrfToken(req, res, next) {
  if (shouldSkipCsrf()) {
    res.locals.csrfToken = '';
    return next();
  }

  res.locals.csrfToken = getSessionToken(req);
  return next();
}

function renderCsrfError(req, res) {
  const title = req.t ? req.t('errors.accessDenied.title') : 'Access denied';
  const message = req.t
    ? req.t('errors.csrf.description')
    : 'The form session has expired. Please refresh the page and try again.';

  return res.status(403).render('errors/403', {
    title,
    activePage: '',
    message
  });
}

function validateCsrfToken(req, res, next) {
  if (shouldSkipCsrf() || SAFE_METHODS.has(req.method)) {
    return next();
  }

  const sessionToken = getSessionToken(req);
  const requestToken = getRequestToken(req);

  if (!areTokensEqual(sessionToken, requestToken)) {
    return renderCsrfError(req, res);
  }

  return next();
}

module.exports = {
  attachCsrfToken,
  validateCsrfToken,
  shouldSkipCsrf,
  getRequestToken,
  areTokensEqual
};
