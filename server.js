// Import core dependencies
require('dotenv').config();

const express = require('express');
const path = require('path');
const session = require('express-session');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

// Create Express application instance
const app = express();

// Create MySQL connection pool
const db = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'my_budget',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4'
});

// Define server port
const PORT = process.env.PORT || 3000;

// Configure template engine and views directory
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Register global middleware
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

// Register shared template variables middleware
// Makes current user data available in all EJS templates
app.use((req, res, next) => {
  res.locals.currentUser = req.session.user || null;
  next();
});

// Middleware: database connection check
// Ensures that MySQL is available before handling application routes
app.use(async (req, res, next) => {
  try {
    await db.query('SELECT 1');
    next();
  } catch (error) {
    console.error('Database connection error:', error.message);

    res.status(500).send(`
      <h1>Database connection error</h1>
      <p>My-Budget cannot connect to MySQL right now.</p>
      <p>Please check your database settings and server status.</p>
    `);
  }
});

// Middleware: authentication guard
// Redirects guest users to the login page
function requireAuth(req, res, next) {
  if (!req.session.user) {
    return res.redirect('/login');
  }

  next();
}

// Helper: find family by current user id
// Returns the family where the current user is a member
async function getUserFamily(userId) {
  const [rows] = await db.query(
    `
    SELECT f.id, f.name, f.owner_user_id, fm.role
    FROM family_members fm
    INNER JOIN families f ON f.id = fm.family_id
    WHERE fm.user_id = ?
    LIMIT 1
    `,
    [userId]
  );

  return rows[0] || null;
}

// Helper: load categories available for current user
// Includes personal and family categories
async function getUserCategories(userId, familyId = null) {
  let query = `
    SELECT id, name, type, color, icon, family_id
    FROM categories
    WHERE user_id = ?
  `;
  const params = [userId];

  if (familyId) {
    query += ' OR family_id = ?';
    params.push(familyId);
  }

  query += ' ORDER BY type ASC, name ASC';

  const [rows] = await db.query(query, params);
  return rows;
}

// Route: root page
// Redirects user depending on authentication state
app.get('/', (req, res) => {
  if (req.session.user) {
    return res.redirect('/dashboard');
  }

  res.redirect('/login');
});

// Route: dashboard page
// Renders the main dashboard interface for authenticated users
app.get('/dashboard', requireAuth, (req, res) => {
  res.render('dashboard/index', {
    title: 'Dashboard',
    activePage: 'dashboard'
  });
});

// Route: categories page
// Displays the categories management page for authenticated users
app.get('/categories', requireAuth, async (req, res) => {
  try {
    const currentUserId = req.session.user.id;
    const family = await getUserFamily(currentUserId);
    const categories = await getUserCategories(
      currentUserId,
      family ? family.id : null
    );

    const incomeCategories = categories.filter(
      (category) => category.type === 'income'
    );

    const expenseCategories = categories.filter(
      (category) => category.type === 'expense'
    );

    res.render('categories/index', {
      title: 'Categories',
      activePage: 'categories',
      family,
      incomeCategories,
      expenseCategories,
      errorMessage: '',
      successMessage: ''
    });
  } catch (error) {
    console.error('Categories page error:', error.message);

    res.render('categories/index', {
      title: 'Categories',
      activePage: 'categories',
      family: null,
      incomeCategories: [],
      expenseCategories: [],
      errorMessage: 'Failed to load categories.',
      successMessage: ''
    });
  }
});

// Route: transactions page
// Displays the page with financial transactions for authenticated users
app.get('/transactions', requireAuth, (req, res) => {
  res.render('transactions/index', {
    title: 'Transactions',
    activePage: 'transactions'
  });
});

// Route: family page
// Displays the family members section for authenticated users
app.get('/family', requireAuth, async (req, res) => {
  try {
    const currentUserId = req.session.user.id;
    const family = await getUserFamily(currentUserId);

    let members = [];

    if (family) {
      const [rows] = await db.query(
        `
        SELECT u.id, u.name, u.email, fm.role
        FROM family_members fm
        INNER JOIN users u ON u.id = fm.user_id
        WHERE fm.family_id = ?
        ORDER BY
          CASE WHEN fm.role = 'owner' THEN 0 ELSE 1 END,
          u.name ASC
        `,
        [family.id]
      );

      members = rows;
    }

    res.render('family/index', {
      title: 'Family',
      activePage: 'family',
      family,
      members,
      errorMessage: '',
      successMessage: ''
    });
  } catch (error) {
    console.error('Family page error:', error.message);

    res.render('family/index', {
      title: 'Family',
      activePage: 'family',
      family: null,
      members: [],
      errorMessage: 'Failed to load family data.',
      successMessage: ''
    });
  }
});

// Route: wishlist page
// Displays the wishlist page with planned purchases for authenticated users
app.get('/wishlist', requireAuth, (req, res) => {
  res.render('wishlist/index', {
    title: 'Wishlist',
    activePage: 'wishlist'
  });
});

// Route: calendar page
// Displays the calendar view for planning and events for authenticated users
app.get('/calendar', requireAuth, (req, res) => {
  res.render('calendar/index', {
    title: 'Calendar',
    activePage: 'calendar'
  });
});

// Route: login page
// Renders the user login form for guest users
app.get('/login', (req, res) => {
  if (req.session.user) {
    return res.redirect('/dashboard');
  }

  res.render('login', {
    title: 'Login',
    activePage: 'login',
    errorMessage: '',
    successMessage: ''
  });
});

// Route: login form submission
// Checks user credentials and stores authenticated user in session

// Route: register page
// Renders the user registration form for guest users
app.get('/register', (req, res) => {
  if (req.session.user) {
    return res.redirect('/dashboard');
  }

  res.render('register', {
    title: 'Register',
    activePage: 'register',
    errorMessage: '',
    successMessage: ''
  });
});

app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.render('login', {
      title: 'Login',
      activePage: 'login',
      errorMessage: 'Please enter both email and password.',
      successMessage: ''
    });
  }

  try {
    const normalizedEmail = email.trim().toLowerCase();

    const [rows] = await db.query(
      'SELECT id, name, email, password_hash FROM users WHERE email = ? LIMIT 1',
      [normalizedEmail]
    );

    if (rows.length === 0) {
      return res.render('login', {
        title: 'Login',
        activePage: 'login',
        errorMessage: 'Invalid email or password.',
        successMessage: ''
      });
    }

    const user = rows[0];

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      return res.render('login', {
        title: 'Login',
        activePage: 'login',
        errorMessage: 'Invalid email or password.',
        successMessage: ''
      });
    }

    req.session.user = {
      id: user.id,
      name: user.name,
      email: user.email
    };

    return res.redirect('/dashboard');
  } catch (error) {
    console.error('Login error:', error.message);

    return res.render('login', {
      title: 'Login',
      activePage: 'login',
      errorMessage: 'Failed to sign in. Please try again.',
      successMessage: ''
    });
  }
});

// Route: register form submission
// Validates input and stores a temporary user in memory
app.post('/register', async (req, res) => {
  const { name, email, password, confirmPassword } = req.body;

  if (!name || !email || !password || !confirmPassword) {
    return res.render('register', {
      title: 'Register',
      activePage: 'register',
      errorMessage: 'Please fill in all fields.',
      successMessage: ''
    });
  }

  if (password !== confirmPassword) {
    return res.render('register', {
      title: 'Register',
      activePage: 'register',
      errorMessage: 'Passwords do not match.',
      successMessage: ''
    });
  }

  try {
    const normalizedEmail = email.trim().toLowerCase();

    const [existingUsers] = await db.query(
      'SELECT id FROM users WHERE email = ? LIMIT 1',
      [normalizedEmail]
    );

    if (existingUsers.length > 0) {
      return res.render('register', {
        title: 'Register',
        activePage: 'register',
        errorMessage: 'A user with this email already exists.',
        successMessage: ''
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    await db.query(
      'INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)',
      [name.trim(), normalizedEmail, passwordHash]
    );

    return res.redirect('/login');
  } catch (error) {
    console.error('Registration error:', error.message);

    return res.render('register', {
      title: 'Register',
      activePage: 'register',
      errorMessage: 'Failed to register user. Please try again.',
      successMessage: ''
    });
  }
});

// Route: family creation
// Creates a new family for the current authenticated user
app.post('/family/create', requireAuth, async (req, res) => {
  const { familyName } = req.body;

  if (!familyName || !familyName.trim()) {
    return res.redirect('/family');
  }

  try {
    const currentUserId = req.session.user.id;
    const existingFamily = await getUserFamily(currentUserId);

    if (existingFamily) {
      return res.redirect('/family');
    }

    const [result] = await db.query(
      'INSERT INTO families (name, owner_user_id) VALUES (?, ?)',
      [familyName.trim(), currentUserId]
    );

    await db.query(
      'INSERT INTO family_members (family_id, user_id, role) VALUES (?, ?, ?)',
      [result.insertId, currentUserId, 'owner']
    );

    res.redirect('/family');
  } catch (error) {
    console.error('Family creation error:', error.message);
    res.redirect('/family');
  }
});

// Route: category creation
// Creates a new personal or family category for the authenticated user
app.post('/categories/create', requireAuth, async (req, res) => {
  const { name, type, color, icon, scope } = req.body;

  if (!name || !type) {
    return res.redirect('/categories');
  }

  if (!['income', 'expense'].includes(type)) {
    return res.redirect('/categories');
  }

  try {
    const currentUserId = req.session.user.id;
    const family = await getUserFamily(currentUserId);

    let familyId = null;

    if (scope === 'family' && family) {
      familyId = family.id;
    }

    await db.query(
      `
      INSERT INTO categories (user_id, family_id, name, type, color, icon)
      VALUES (?, ?, ?, ?, ?, ?)
      `,
      [
        currentUserId,
        familyId,
        name.trim(),
        type,
        color || '#6c757d',
        icon || 'tag'
      ]
    );

    res.redirect('/categories');
  } catch (error) {
    console.error('Category creation error:', error.message);
    res.redirect('/categories');
  }
});

// Route: add family member
// Adds an existing registered user to the current user's family
app.post('/family/add-member', requireAuth, async (req, res) => {
  const { email } = req.body;

  if (!email || !email.trim()) {
    return res.redirect('/family');
  }

  try {
    const currentUserId = req.session.user.id;
    const family = await getUserFamily(currentUserId);

    if (!family) {
      return res.redirect('/family');
    }

    if (family.owner_user_id !== currentUserId) {
      return res.redirect('/family');
    }

    const normalizedEmail = email.trim().toLowerCase();

    const [usersFound] = await db.query(
      'SELECT id FROM users WHERE email = ? LIMIT 1',
      [normalizedEmail]
    );

    if (usersFound.length === 0) {
      return res.redirect('/family');
    }

    const memberUserId = usersFound[0].id;

    const [existingMember] = await db.query(
      'SELECT id FROM family_members WHERE family_id = ? AND user_id = ? LIMIT 1',
      [family.id, memberUserId]
    );

    if (existingMember.length > 0) {
      return res.redirect('/family');
    }

    await db.query(
      'INSERT INTO family_members (family_id, user_id, role) VALUES (?, ?, ?)',
      [family.id, memberUserId, 'member']
    );

    res.redirect('/family');
  } catch (error) {
    console.error('Add family member error:', error.message);
    res.redirect('/family');
  }
});

// Route: logout page
// Clears active user session and redirects to login page
app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login');
  });
});

// Fallback route: page not found
// Handles requests to undefined routes
app.use((req, res) => {
  res.status(404).send('404 - Page not found');
});

// Start server and show local address in console
app.listen(PORT, () => {
  console.log(`Server started on http://localhost:${PORT}`);
});