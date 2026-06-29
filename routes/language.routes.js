/**
 * Language routes.
 * Stores the selected UI language in the session and redirects the user back
 * to the page they were viewing.
 */

const express = require('express');
const { SUPPORTED_LANGUAGES } = require('../scr/i18n');

const router = express.Router();

function isSafeLocalPath(path) {
  return (
    typeof path === 'string' &&
    path.startsWith('/') &&
    !path.startsWith('//') &&
    !path.includes('\\') &&
    !/[\r\n]/.test(path) &&
    !path.startsWith('/language/')
  );
}

function getSafeReturnPath(req) {
  const requestedReturnPath = req.query.returnTo;

  if (isSafeLocalPath(requestedReturnPath)) {
    return requestedReturnPath;
  }

  const referer = req.get('referer');

  if (referer) {
    try {
      const currentOrigin = `${req.protocol}://${req.get('host')}`;
      const refererUrl = new URL(referer, currentOrigin);

      if (refererUrl.origin === currentOrigin) {
        const refererPath = `${refererUrl.pathname}${refererUrl.search}${refererUrl.hash}`;

        if (isSafeLocalPath(refererPath)) {
          return refererPath;
        }
      }
    } catch (error) {
      // If Referer is malformed, use the safe fallback below.
    }
  }

  return req.session.user ? '/dashboard' : '/login';
}

// Ignore unsupported language codes and keep the user on the same page.
router.get('/language/:language', (req, res) => {
  const { language } = req.params;
  const returnPath = getSafeReturnPath(req);

  if (SUPPORTED_LANGUAGES.includes(language)) {
    req.session.language = language;
  }

  res.redirect(returnPath);
});

module.exports = router;
