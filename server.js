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



// Route: root page
// Redirects user from the main URL to the dashboard page
app.get('/', (req, res) => {
  res.redirect('/dashboard');
});

// Route: dashboard page
// Renders the main dashboard interface
app.get('/dashboard', (req, res) => {
  res.render('dashboard/index', {
    title: 'Dashboard',
    activePage: 'dashboard'
  });
});

// Route: categories page
// Displays the categories management page
app.get('/categories', (req, res) => {
  res.render('categories/index', {
    title: 'Categories',
    activePage: 'categories'
  });
});

// Route: transactions page
// Displays the page with financial transactions
app.get('/transactions', (req, res) => {
  res.render('transactions/index', {
    title: 'Transactions',
    activePage: 'transactions'
  });
});

// Route: family page
// Displays the family members section
app.get('/family', (req, res) => {
  res.render('family/index', {
    title: 'Family',
    activePage: 'family'
  });
});

// Route: wishlist page
// Displays the wishlist page with planned purchases
app.get('/wishlist', (req, res) => {
  res.render('wishlist/index', {
    title: 'Wishlist',
    activePage: 'wishlist'
  });
});

// Route: calendar page
// Displays the calendar view for planning and events
app.get('/calendar', (req, res) => {
  res.render('calendar/index', {
    title: 'Calendar',
    activePage: 'calendar'
  });
});

// Route: login page
// Renders the user login form
app.get('/login', (req, res) => {
  res.render('login', {
    title: 'Login',
    activePage: 'login'
  });
});

// Route: register page
// Renders the user registration form
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