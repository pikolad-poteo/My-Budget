require('dotenv').config();

const express = require('express');
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

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/vendor/chart.js', express.static(path.join(__dirname, 'node_modules/chart.js/dist')));

app.use(
  session({
    secret: process.env.SESSION_SECRET || 'my-budget-secret-key',
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

app.use((req, res) => {
  res.status(404).send('404 - Page not found');
});

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