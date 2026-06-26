require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const path = require('path');
const session = require('express-session');

const { initializeDatabase } = require('./scr/checkDatabase');
const { attachI18n } = require('./scr/i18n');
const { attachUser } = require('./scr/middleware');

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

app.set('trust proxy', 1);

// Configure EJS as the server-side rendering engine for all application pages.
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Add baseline HTTP security headers. CSP is kept off until inline assets are migrated.
app.use(
  helmet({
    contentSecurityPolicy: false
  })
);

function ensureErrorTemplateLocals(res) {
  const fallbackTranslations = {
    'app.name': 'My Budget',
    'nav.login': 'Login',
    'nav.register': 'Register',
    'language.label': 'Language',
    'language.english': 'English',
    'language.russian': 'Russian',
    'language.estonian': 'Estonian',
    'language.short.en': 'EN',
    'accessibility.toggleNavigation': 'Toggle navigation',
    'errors.accessDenied.title': 'Access denied',
    'errors.accessDenied.description': 'You do not have permission to open this page.',
    'errors.notFound.title': 'Page not found',
    'errors.notFound.description': 'The page you are looking for does not exist or may have been moved.',
    'errors.serverError.title': 'Server error',
    'errors.serverError.description': 'Something went wrong. Please try again later.',
    'errors.actions.backToDashboard': 'Back to dashboard',
    'errors.actions.backToLogin': 'Back to login'
  };

  res.locals.language = res.locals.language || 'en';
  res.locals.languages = res.locals.languages || ['en', 'ru', 'et'];
  res.locals.currentUser = res.locals.currentUser || null;
  res.locals.t = res.locals.t || ((key) => fallbackTranslations[key] || key);
}

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

// Attach shared template helpers and the current session user to every rendered view.
app.use(attachI18n);
app.use(attachUser);

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
  ensureErrorTemplateLocals(res);

  const t = res.locals.t;

  res.status(404).render('errors/404', {
    title: t('errors.notFound.title'),
    activePage: ''
  });
});

// Central production error response. Keep details visible in development only.
app.use((err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  const statusCode = err.status === 403 || err.statusCode === 403 ? 403 : 500;
  const view = statusCode === 403 ? 'errors/403' : 'errors/500';
  console.error(err);
  ensureErrorTemplateLocals(res);

  const t = res.locals.t;
  const productionMessage =
    statusCode === 403
      ? t('errors.accessDenied.description')
      : t('errors.serverError.description');

  return res.status(statusCode).render(view, {
    title: statusCode === 403 ? t('errors.accessDenied.title') : t('errors.serverError.title'),
    activePage: '',
    message:
      process.env.NODE_ENV === 'production'
        ? productionMessage
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
