require('dotenv').config();

const express = require('express');
const path = require('path');
const session = require('express-session');

const checkDatabase = require('./scr/checkDatabase');
const { attachUser } = require('./scr/middleware');

const pagesRoutes = require('./routes/pages.routes');
const authRoutes = require('./routes/auth.routes');
const familyRoutes = require('./routes/family.routes');
const categoriesRoutes = require('./routes/categories.routes');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use(
  session({
    secret: process.env.SESSION_SECRET || 'my-budget-secret-key',
    resave: false,
    saveUninitialized: false
  })
);

app.use(attachUser);
app.use(checkDatabase);

app.use(pagesRoutes);
app.use(authRoutes);
app.use(familyRoutes);
app.use(categoriesRoutes);

app.use((req, res) => {
  res.status(404).send('404 - Page not found');
});

app.listen(PORT, () => {
  console.log(`Server started on http://localhost:${PORT}`);
});