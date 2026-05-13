const express = require('express');
const bcrypt = require('bcryptjs');

const router = express.Router();
const db = require('../scr/db');
const { normalizeEmail, isValidEmail, validatePassword } = require('../scr/auth.validation');
const { createEmailVerificationToken, sendVerificationToken, verifyEmailToken } = require('../scr/emailVerification.service');
const { sendVerificationEmail } = require('../scr/mail.service');
const {
  sendPasswordResetToken,
  getValidPasswordResetToken,
  usePasswordResetToken
} = require('../scr/passwordReset.service');

function setAuthFlash(req, type, message) {
  req.session.authFlash = { type, message };
}

function getAuthFlash(req) {
  const flash = req.session.authFlash || null;
  delete req.session.authFlash;
  return flash;
}

function renderLogin(req, res, overrides = {}) {
  const flash = getAuthFlash(req);

  return res.render('login', {
    title: 'Login',
    activePage: 'login',
    errorMessage: flash && flash.type === 'error' ? flash.message : '',
    successMessage: flash && flash.type === 'success' ? flash.message : '',
    ...overrides
  });
}

function renderRegister(req, res, overrides = {}) {
  return res.render('register', {
    title: 'Register',
    activePage: 'register',
    errorMessage: '',
    successMessage: '',
    formData: {
      name: '',
      email: ''
    },
    ...overrides
  });
}

function renderForgotPassword(res, overrides = {}) {
  return res.render('forgot-password', {
    title: 'Forgot password',
    activePage: 'login',
    errorMessage: '',
    successMessage: '',
    email: '',
    ...overrides
  });
}

function renderResetPassword(res, token, overrides = {}) {
  return res.render('reset-password', {
    title: 'Reset password',
    activePage: 'login',
    errorMessage: '',
    successMessage: '',
    token,
    isTokenValid: true,
    ...overrides
  });
}

function renderResendVerification(res, overrides = {}) {
  return res.render('resend-verification', {
    title: 'Resend verification email',
    activePage: 'login',
    errorMessage: '',
    successMessage: '',
    email: '',
    ...overrides
  });
}

router.get('/login', (req, res) => {
  if (req.session.user) {
    return res.redirect('/dashboard');
  }

  return renderLogin(req, res);
});

router.get('/register', (req, res) => {
  if (req.session.user) {
    return res.redirect('/dashboard');
  }

  return renderRegister(req, res);
});

router.post('/login', async (req, res) => {
  const email = normalizeEmail(req.body.email);
  const password = String(req.body.password || '');

  if (!email || !password) {
    return renderLogin(req, res, {
      errorMessage: 'Please enter both email and password.',
      successMessage: ''
    });
  }

  try {
    const [rows] = await db.query(
      'SELECT id, name, email, avatar_url, password_hash, email_verified_at FROM users WHERE email = ? LIMIT 1',
      [email]
    );

    if (rows.length === 0) {
      return renderLogin(req, res, {
        errorMessage: 'Invalid email or password.',
        successMessage: ''
      });
    }

    const user = rows[0];
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      return renderLogin(req, res, {
        errorMessage: 'Invalid email or password.',
        successMessage: ''
      });
    }

    if (!user.email_verified_at) {
      return renderLogin(req, res, {
        errorMessage: 'Please verify your email before signing in. You can request a new verification email below.',
        successMessage: ''
      });
    }

    req.session.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      avatar_url: user.avatar_url || null
    };

    return res.redirect('/dashboard');
  } catch (error) {
    console.error('Login error:', error.message);

    return renderLogin(req, res, {
      errorMessage: 'Failed to sign in. Please try again.',
      successMessage: ''
    });
  }
});

router.post('/register', async (req, res) => {
  const name = String(req.body.name || '').trim();
  const email = normalizeEmail(req.body.email);
  const password = String(req.body.password || '');
  const confirmPassword = String(req.body.confirmPassword || '');

  if (!name || !email || !password || !confirmPassword) {
    return renderRegister(req, res, {
      errorMessage: 'Please fill in all fields.',
      formData: { name, email }
    });
  }

  if (!isValidEmail(email)) {
    return renderRegister(req, res, {
      errorMessage: 'Please enter a valid email address.',
      formData: { name, email }
    });
  }

  const passwordValidation = validatePassword(password);
  if (!passwordValidation.isValid) {
    return renderRegister(req, res, {
      errorMessage: passwordValidation.message,
      formData: { name, email }
    });
  }

  if (password !== confirmPassword) {
    return renderRegister(req, res, {
      errorMessage: 'Passwords do not match.',
      formData: { name, email }
    });
  }

  const connection = await db.getConnection();

  try {
    const [existingUsers] = await connection.query(
      'SELECT id FROM users WHERE email = ? LIMIT 1',
      [email]
    );

    if (existingUsers.length > 0) {
      return renderRegister(req, res, {
        errorMessage: 'A user with this email already exists.',
        formData: { name, email }
      });
    }

    await connection.beginTransaction();

    const passwordHash = await bcrypt.hash(password, 12);
    const [result] = await connection.query(
      'INSERT INTO users (name, email, password_hash, email_verified_at) VALUES (?, ?, ?, NULL)',
      [name, email, passwordHash]
    );

    const token = await createEmailVerificationToken(connection, result.insertId);
    await sendVerificationEmail(email, token);

    await connection.commit();

    setAuthFlash(req, 'success', 'Account created. Please check your email and verify your account before signing in.');
    return res.redirect('/login');
  } catch (error) {
    await connection.rollback();
    console.error('Registration error:', error.message);

    return renderRegister(req, res, {
      errorMessage: error.message.includes('Email sending is not configured')
        ? 'Email sending is not configured. Please check SMTP settings in .env.'
        : 'Failed to register user. Please try again.',
      formData: { name, email }
    });
  } finally {
    connection.release();
  }
});

router.get('/verify-email/:token', async (req, res) => {
  try {
    const isVerified = await verifyEmailToken(req.params.token);

    if (!isVerified) {
      setAuthFlash(req, 'error', 'Verification link is invalid or expired. Request a new verification email.');
      return res.redirect('/resend-verification');
    }

    setAuthFlash(req, 'success', 'Email verified successfully. You can now sign in.');
    return res.redirect('/login');
  } catch (error) {
    console.error('Email verification error:', error.message);
    setAuthFlash(req, 'error', 'Failed to verify email. Please try again.');
    return res.redirect('/login');
  }
});

router.get('/resend-verification', (req, res) => {
  return renderResendVerification(res);
});

router.post('/resend-verification', async (req, res) => {
  const email = normalizeEmail(req.body.email);

  if (!isValidEmail(email)) {
    return renderResendVerification(res, {
      errorMessage: 'Please enter a valid email address.',
      email
    });
  }

  try {
    const [users] = await db.query(
      'SELECT id, email, email_verified_at FROM users WHERE email = ? LIMIT 1',
      [email]
    );

    if (users.length === 0) {
      return renderResendVerification(res, {
        successMessage: 'If this email exists and is not verified, a new verification link has been sent.',
        email: ''
      });
    }

    const user = users[0];

    if (user.email_verified_at) {
      return renderResendVerification(res, {
        successMessage: 'This email is already verified. You can sign in.',
        email: ''
      });
    }

    await sendVerificationToken(user);

    return renderResendVerification(res, {
      successMessage: 'If this email exists and is not verified, a new verification link has been sent.',
      email: ''
    });
  } catch (error) {
    console.error('Resend verification error:', error.message);

    return renderResendVerification(res, {
      errorMessage: error.message.includes('Email sending is not configured')
        ? 'Email sending is not configured. Please check SMTP settings in .env.'
        : 'Failed to send verification email. Please try again.',
      email
    });
  }
});

router.get('/forgot-password', (req, res) => {
  if (req.session.user) {
    return res.redirect('/dashboard');
  }

  return renderForgotPassword(res);
});

router.post('/forgot-password', async (req, res) => {
  const email = normalizeEmail(req.body.email);

  if (!isValidEmail(email)) {
    return renderForgotPassword(res, {
      errorMessage: 'Please enter a valid email address.',
      email
    });
  }

  try {
    const [users] = await db.query(
      'SELECT id, email, email_verified_at FROM users WHERE email = ? LIMIT 1',
      [email]
    );

    if (users.length > 0 && users[0].email_verified_at) {
      await sendPasswordResetToken(users[0]);
    } else if (users.length > 0 && !users[0].email_verified_at) {
      await sendVerificationToken(users[0]);
    }

    return renderForgotPassword(res, {
      successMessage: 'If this email exists in our system, instructions have been sent to it.',
      email: ''
    });
  } catch (error) {
    console.error('Forgot password error:', error.message);

    return renderForgotPassword(res, {
      errorMessage: error.message.includes('Email sending is not configured')
        ? 'Email sending is not configured. Please check SMTP settings in .env.'
        : 'Failed to send email. Please try again.',
      email
    });
  }
});

router.get('/reset-password/:token', async (req, res) => {
  try {
    const resetToken = await getValidPasswordResetToken(req.params.token);

    if (!resetToken) {
      return renderResetPassword(res, req.params.token, {
        isTokenValid: false,
        errorMessage: 'Reset link is invalid or expired. Request a new password reset link.'
      });
    }

    return renderResetPassword(res, req.params.token);
  } catch (error) {
    console.error('Reset password page error:', error.message);
    return renderResetPassword(res, req.params.token, {
      isTokenValid: false,
      errorMessage: 'Failed to open reset page. Please try again.'
    });
  }
});

router.post('/reset-password/:token', async (req, res) => {
  const token = req.params.token;
  const password = String(req.body.password || '');
  const confirmPassword = String(req.body.confirmPassword || '');

  const passwordValidation = validatePassword(password);
  if (!passwordValidation.isValid) {
    return renderResetPassword(res, token, {
      errorMessage: passwordValidation.message
    });
  }

  if (password !== confirmPassword) {
    return renderResetPassword(res, token, {
      errorMessage: 'Passwords do not match.'
    });
  }

  try {
    const passwordHash = await bcrypt.hash(password, 12);
    const wasUpdated = await usePasswordResetToken(token, passwordHash);

    if (!wasUpdated) {
      return renderResetPassword(res, token, {
        isTokenValid: false,
        errorMessage: 'Reset link is invalid or expired. Request a new password reset link.'
      });
    }

    setAuthFlash(req, 'success', 'Password was changed. You can now sign in with your new password.');
    return res.redirect('/login');
  } catch (error) {
    console.error('Reset password error:', error.message);
    return renderResetPassword(res, token, {
      errorMessage: 'Failed to change password. Please try again.'
    });
  }
});

router.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login');
  });
});

module.exports = router;
