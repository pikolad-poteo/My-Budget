// Makes the authenticated user available in all EJS templates through res.locals.
function attachUser(req, res, next) {
  res.locals.currentUser = req.session.user || null;
  next();
}

// Protects private pages from unauthenticated access.
function requireAuth(req, res, next) {
  if (!req.session.user) {
    return res.redirect('/login');
  }

  next();
}

// Renders the shared 403 page for routes that need a direct permission failure.
function renderForbidden(req, res, message) {
  const title = req.t ? req.t('errors.accessDenied.title') : 'Access denied';

  return res.status(403).render('errors/403', {
    title,
    activePage: '',
    message
  });
}

module.exports = {
  attachUser,
  requireAuth,
  renderForbidden
};
