require('dotenv').config();

const express = require('express');
const path = require('path');
const session = require('express-session');
const helmet = require('helmet');

const { initializeDatabase } = require('./scr/checkDatabase');
const { attachI18n } = require('./scr/i18n');
const { attachUser } = require('./scr/middleware');
const { attachCsrfToken, validateCsrfToken } = require('./scr/csrf');

const authRoutes = require('./routes/auth.routes');
const familyRoutes = require('./routes/family.routes');
const categoriesRoutes = require('./routes/categories.routes');
const transactionsRoutes = require('./routes/transactions.routes');
const wishlistRoutes = require('./routes/wishlist.routes');
const calendarRoutes = require('./routes/calendar.routes');
const accountRoutes = require('./routes/account.routes');
const pagesRoutes = require('./routes/pages.routes');
const languageRoutes = require('./routes/language.routes');

const app = express();
const PORT = process.env.PORT || 3000;
const SESSION_SECRET = process.env.SESSION_SECRET;

if (!SESSION_SECRET) {
  throw new Error('SESSION_SECRET is required');
}

// Required when the app runs behind a reverse proxy, for example on hosting with HTTPS/proxy.
app.set('trust proxy', 1);

// Configure EJS as the server-side rendering engine for all application pages.
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Basic security headers. CSP is disabled for now because the project uses EJS, Bootstrap,
// Chart.js and some inline scripts/styles. It can be configured more strictly later.
app.use(
  helmet({
    contentSecurityPolicy: false
  })
);

// Parse form submissions, JSON payloads and static assets before route handlers run.
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/vendor/chart.js', express.static(path.join(__dirname, 'node_modules/chart.js/dist')));

// Session cookie settings keep authenticated users signed in while limiting idle sessions to one hour.
app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      maxAge: 1000 * 60 * 60,
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production'
    }
  })
);

// Attach shared template helpers, current session user and CSRF token to every rendered view.
app.use(attachI18n);
app.use(attachUser);
app.use(attachCsrfToken);
app.use(validateCsrfToken);

/*
  Main application routes.
  Specific CRUD routes should be registered before general page routes.
*/
app.use(languageRoutes);
app.use(authRoutes);
app.use(familyRoutes);
app.use(categoriesRoutes);
app.use(transactionsRoutes);
app.use(wishlistRoutes);
app.use(calendarRoutes);
app.use(accountRoutes);
app.use(pagesRoutes);

// Final fallback for unknown routes that were not handled by any feature module.
app.use((req, res) => {
  res.status(404).render('errors/404', {
    title: req.t ? req.t('errors.notFound.title') : 'Page not found',
    activePage: ''
  });
});

// Final production-safe error handler.
app.use((err, req, res, next) => {
  console.error(err);

  if (res.headersSent) {
    return next(err);
  }

  return res.status(500).render('errors/500', {
    title: req.t ? req.t('errors.serverError.title') : 'Server error',
    activePage: '',
    message:
      process.env.NODE_ENV === 'production'
        ? req.t
          ? req.t('errors.serverError.description')
          : 'Something went wrong. Please try again later.'
        : err.message
  });
});

// Database checks run once during startup, not during requests, to avoid runtime schema changes.
initializeDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server started on http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  });
