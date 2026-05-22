/**
 * Language routes.
 * Stores the selected UI language in the session and redirects the user back
 * to the page they were viewing.
 */

const express = require('express');
const { SUPPORTED_LANGUAGES } = require('../scr/i18n');

const router = express.Router();

// Ignore unsupported language codes and keep the user on their previous page.
router.get('/language/:language', (req, res) => {
  const { language } = req.params;

  if (SUPPORTED_LANGUAGES.includes(language)) {
    req.session.language = language;
  }

  res.redirect(req.get('referer') || '/dashboard');
});

module.exports = router;
