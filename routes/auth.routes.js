const express = require('express');
const bcrypt = require('bcryptjs');

const router = express.Router();
const db = require('../scr/db');

router.get('/login', (req, res) => {
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

router.get('/register', (req, res) => {
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

router.post('/login', async (req, res) => {
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

router.post('/register', async (req, res) => {
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

router.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login');
  });
});

module.exports = router;