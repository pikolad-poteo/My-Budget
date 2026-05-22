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

module.exports = {
  attachUser,
  requireAuth
};
