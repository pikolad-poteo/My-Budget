// Import core dependencies
const express = require('express');
const path = require('path');

// Create Express application instance
const app = express();

// Define server port
const PORT = 3000;

// Configure template engine and views directory
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Register global middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Redirect root URL to the main dashboard page
app.get('/', (req, res) => {
  res.redirect('/dashboard');
});

// Dashboard page route
app.get('/dashboard', (req, res) => {
  res.render('dashboard/index', {
    title: 'Dashboard',
    activePage: 'dashboard'
  });
});

// Login page route
app.get('/login', (req, res) => {
  res.render('login', {
    title: 'Login',
    activePage: 'login'
  });
});

// Registration page route
app.get('/register', (req, res) => {
  res.render('register', {
    title: 'Register',
    activePage: 'register'
  });
});

// Start server and show local address in console
app.listen(PORT, () => {
  console.log(`Server started on http://localhost:${PORT}`);
});