/**
 * Authentication routes.
 * Provides login, registration, email verification, pending email confirmation,
 * password reset, resend verification, and logout flows.
 */

const express = require('express');
const bcrypt = require('bcryptjs');

const router = express.Router();
const db = require('../scr/db');
const { normalizeEmail, isValidEmail, validatePassword, isActiveUserStatus } = require('../scr/auth.validation');
const { authLimiter, passwordResetLimiter } = require('../scr/rateLimiters');
const { createEmailVerificationToken, sendVerificationToken, verifyEmailToken } = require('../scr/emailVerification.service');
const { sendVerificationEmail } = require('../scr/mail.service');
const { confirmPendingEmailChange } = require('../scr/pendingEmail.service');
const {
  sendPasswordResetToken,
  getValidPasswordResetToken,
  usePasswordResetToken
} = require('../scr/passwordReset.service');
const { safeAuditFromRequest, getClientIp } = require('../scr/audit.service');

// Store authentication messages in the session so they remain visible after redirects.
function setAuthFlash(req, type, message) {
  req.session.authFlash = { type, message };
}

function getAuthFlash(req) {
  const flash = req.session.authFlash || null;
  delete req.session.authFlash;
  return flash;
}

// Centralize login view rendering to keep validation and redirect flows consistent.
function renderLogin(req, res, overrides = {}) {
  const flash = getAuthFlash(req);

  return res.render('login', {
    title: req.t('auth.loginTitle'),
    activePage: 'login',
    errorMessage: flash && flash.type === 'error' ? flash.message : '',
    successMessage: flash && flash.type === 'success' ? flash.message : '',
    ...overrides
  });
}

function renderRegister(req, res, overrides = {}) {
  return res.render('register', {
    title: req.t('auth.registerTitle'),
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

function renderForgotPassword(req, res, overrides = {}) {
  return res.render('forgot-password', {
    title: req.t('auth.forgotPasswordTitle'),
    activePage: 'login',
    errorMessage: '',
    successMessage: '',
    email: '',
    ...overrides
  });
}

// Render reset form only for a token that was already checked by the route handler.
function renderResetPassword(req, res, token, overrides = {}) {
  return res.render('reset-password', {
    title: req.t('auth.resetPasswordTitle'),
    activePage: 'login',
    errorMessage: '',
    successMessage: '',
    token,
    isTokenValid: true,
    ...overrides
  });
}

function renderResendVerification(req, res, overrides = {}) {
  return res.render('resend-verification', {
    title: req.t('auth.resendVerificationTitle'),
    activePage: 'login',
    errorMessage: '',
    successMessage: '',
    email: '',
    ...overrides
  });
}

function logLoginAttempt(req, { email, userId = null, action, reason }) {
  const payload = {
    userId,
    email: email || null,
    ip: getClientIp(req),
    userAgent: req.get('user-agent') || null,
    reason
  };

  safeAuditFromRequest(req, {
    userId,
    action,
    entityType: 'user',
    entityId: userId,
    details: {
      email: email || null,
      reason
    }
  });

  if (action === 'USER_LOGIN_SUCCESS') {
    console.info(action, payload);
    return;
  }

  console.warn(action, payload);
}

async function updateLastLogin(userId, ipAddress) {
  await db.query(
    'UPDATE users SET last_login_at = NOW(), last_login_ip = ? WHERE id = ? LIMIT 1',
    [ipAddress, userId]
  );
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

// Authenticate verified users and create the session user object used across protected pages.
router.post('/login', authLimiter, async (req, res) => {
  const email = normalizeEmail(req.body.email);
  const password = String(req.body.password || '');

  if (!email || !password) {
    logLoginAttempt(req, { email, action: 'USER_LOGIN_FAILED', reason: 'missing_credentials' });

    return renderLogin(req, res, {
      errorMessage: req.t('auth.messages.enterEmailAndPassword'),
      successMessage: ''
    });
  }

  try {
    const [rows] = await db.query(
      `
      SELECT id, name, email, avatar_url, password_hash, email_verified_at, status, global_role
      FROM users
      WHERE email = ?
      LIMIT 1
      `,
      [email]
    );

    if (rows.length === 0) {
      logLoginAttempt(req, { email, action: 'USER_LOGIN_FAILED', reason: 'unknown_email' });

      return renderLogin(req, res, {
        errorMessage: req.t('auth.messages.invalidEmailOrPassword'),
        successMessage: ''
      });
    }

    const user = rows[0];
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      logLoginAttempt(req, { email, userId: user.id, action: 'USER_LOGIN_FAILED', reason: 'invalid_password' });

      return renderLogin(req, res, {
        errorMessage: req.t('auth.messages.invalidEmailOrPassword'),
        successMessage: ''
      });
    }

    if (!isActiveUserStatus(user.status)) {
      logLoginAttempt(req, { email, userId: user.id, action: 'USER_LOGIN_FAILED', reason: `status_${user.status || 'unknown'}` });

      return renderLogin(req, res, {
        errorMessage: req.t('auth.messages.accountBlocked'),
        successMessage: ''
      });
    }

    if (!user.email_verified_at) {
      logLoginAttempt(req, { email, userId: user.id, action: 'USER_LOGIN_FAILED', reason: 'email_not_verified' });

      return renderLogin(req, res, {
        errorMessage: req.t('auth.messages.verifyEmailBeforeLogin'),
        successMessage: ''
      });
    }

    const loginIp = getClientIp(req);
    await updateLastLogin(user.id, loginIp);
    logLoginAttempt(req, { email, userId: user.id, action: 'USER_LOGIN_SUCCESS', reason: 'authenticated' });

    req.session.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      avatar_url: user.avatar_url || null,
      global_role: user.global_role || 'user'
    };

    return res.redirect('/dashboard');
  } catch (error) {
    console.error('Login error:', error.message);

    return renderLogin(req, res, {
      errorMessage: req.t('auth.messages.failedToSignIn'),
      successMessage: ''
    });
  }
});

// Create a new user with a hashed password and send the first verification email.
router.post('/register', authLimiter, async (req, res) => {
  const name = String(req.body.name || '').trim();
  const email = normalizeEmail(req.body.email);
  const password = String(req.body.password || '');
  const confirmPassword = String(req.body.confirmPassword || '');

  if (!name || !email || !password || !confirmPassword) {
    return renderRegister(req, res, {
      errorMessage: req.t('auth.messages.fillAllFields'),
      formData: { name, email }
    });
  }

  if (!isValidEmail(email)) {
    return renderRegister(req, res, {
      errorMessage: req.t('auth.messages.invalidEmail'),
      formData: { name, email }
    });
  }

  const passwordValidation = validatePassword(password, req.t);
  if (!passwordValidation.isValid) {
    return renderRegister(req, res, {
      errorMessage: passwordValidation.message,
      formData: { name, email }
    });
  }

  if (password !== confirmPassword) {
    return renderRegister(req, res, {
      errorMessage: req.t('auth.messages.passwordsDoNotMatch'),
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
        errorMessage: req.t('auth.messages.userAlreadyExists'),
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

    await safeAuditFromRequest(req, {
      userId: result.insertId,
      action: 'USER_REGISTERED',
      entityType: 'user',
      entityId: result.insertId,
      details: { email }
    }, connection);

    await connection.commit();

    setAuthFlash(req, 'success', req.t('auth.messages.accountCreated'));
    return res.redirect('/login');
  } catch (error) {
    await connection.rollback();
    console.error('Registration error:', error.message);

    return renderRegister(req, res, {
      errorMessage: error.message.includes('Email sending is not configured')
        ? req.t('auth.messages.emailNotConfigured')
        : req.t('auth.messages.failedToRegister'),
      formData: { name, email }
    });
  } finally {
    connection.release();
  }
});

// Consume a verification token and mark the related account as verified.
router.get('/verify-email/:token', async (req, res) => {
  try {
    const isVerified = await verifyEmailToken(req.params.token);

    if (!isVerified) {
      setAuthFlash(req, 'error', req.t('auth.messages.verificationInvalid'));
      return res.redirect('/resend-verification');
    }

    setAuthFlash(req, 'success', req.t('auth.messages.emailVerified'));
    await safeAuditFromRequest(req, {
      action: 'EMAIL_VERIFIED',
      entityType: 'user',
      details: { tokenVerified: true }
    });
    return res.redirect('/login');
  } catch (error) {
    console.error('Email verification error:', error.message);
    setAuthFlash(req, 'error', req.t('auth.messages.failedToVerifyEmail'));
    return res.redirect('/login');
  }
});


// Confirm a pending email change only through the verification token sent to the new address.
router.get('/verify-email-change/:token', async (req, res) => {
  try {
    const result = await confirmPendingEmailChange(req.params.token);

    if (result === 'invalid') {
      setAuthFlash(req, 'error', req.t('auth.messages.emailChangeInvalid'));
      return res.redirect('/login');
    }

    if (result === 'duplicate') {
      setAuthFlash(req, 'error', req.t('auth.messages.emailChangeAlreadyUsed'));
      return res.redirect('/login');
    }

    setAuthFlash(req, 'success', req.t('auth.messages.emailChangeConfirmed'));
    await safeAuditFromRequest(req, {
      action: 'EMAIL_CHANGED',
      entityType: 'user',
      details: { tokenVerified: true }
    });
    return res.redirect('/login');
  } catch (error) {
    console.error('Pending email verification error:', error.message);
    setAuthFlash(req, 'error', req.t('auth.messages.failedToVerifyEmail'));
    return res.redirect('/login');
  }
});

router.get('/resend-verification', (req, res) => {
  return renderResendVerification(req, res);
});

// Resend verification without revealing whether an address exists beyond normal form feedback.
router.post('/resend-verification', passwordResetLimiter, async (req, res) => {
  const email = normalizeEmail(req.body.email);

  if (!isValidEmail(email)) {
    return renderResendVerification(req, res, {
      errorMessage: req.t('auth.messages.invalidEmail'),
      email
    });
  }

  try {
    const [users] = await db.query(
      'SELECT id, email, email_verified_at FROM users WHERE email = ? LIMIT 1',
      [email]
    );

    if (users.length === 0) {
      return renderResendVerification(req, res, {
        successMessage: req.t('auth.messages.verificationSentIfNeeded'),
        email: ''
      });
    }

    const user = users[0];

    if (user.email_verified_at) {
      return renderResendVerification(req, res, {
        successMessage: req.t('auth.messages.emailAlreadyVerified'),
        email: ''
      });
    }

    await sendVerificationToken(user);

    return renderResendVerification(req, res, {
      successMessage: req.t('auth.messages.verificationSentIfNeeded'),
      email: ''
    });
  } catch (error) {
    console.error('Resend verification error:', error.message);

    return renderResendVerification(req, res, {
      errorMessage: error.message.includes('Email sending is not configured')
        ? req.t('auth.messages.emailNotConfigured')
        : req.t('auth.messages.failedToSendVerification'),
      email
    });
  }
});

router.get('/forgot-password', (req, res) => {
  if (req.session.user) {
    return res.redirect('/dashboard');
  }

  return renderForgotPassword(req, res);
});

// Start password reset by email while keeping the response safe for account enumeration.
router.post('/forgot-password', passwordResetLimiter, async (req, res) => {
  const email = normalizeEmail(req.body.email);

  if (!isValidEmail(email)) {
    return renderForgotPassword(req, res, {
      errorMessage: req.t('auth.messages.invalidEmail'),
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

    return renderForgotPassword(req, res, {
      successMessage: req.t('auth.messages.passwordInstructionsSent'),
      email: ''
    });
  } catch (error) {
    console.error('Forgot password error:', error.message);

    return renderForgotPassword(req, res, {
      errorMessage: error.message.includes('Email sending is not configured')
        ? req.t('auth.messages.emailNotConfigured')
        : req.t('auth.messages.failedToSendEmail'),
      email
    });
  }
});

router.get('/reset-password/:token', async (req, res) => {
  try {
    const resetToken = await getValidPasswordResetToken(req.params.token);

    if (!resetToken) {
      return renderResetPassword(req, res, req.params.token, {
        isTokenValid: false,
        errorMessage: req.t('auth.messages.resetLinkInvalid')
      });
    }

    return renderResetPassword(req, res, req.params.token);
  } catch (error) {
    console.error('Reset password page error:', error.message);
    return renderResetPassword(req, res, req.params.token, {
      isTokenValid: false,
      errorMessage: req.t('auth.messages.failedToOpenResetPage')
    });
  }
});

// Replace the password and invalidate the reset token in a single reset flow.
router.post('/reset-password/:token', passwordResetLimiter, async (req, res) => {
  const token = req.params.token;
  const password = String(req.body.password || '');
  const confirmPassword = String(req.body.confirmPassword || '');

  const passwordValidation = validatePassword(password, req.t);
  if (!passwordValidation.isValid) {
    return renderResetPassword(req, res, token, {
      errorMessage: passwordValidation.message
    });
  }

  if (password !== confirmPassword) {
    return renderResetPassword(req, res, token, {
      errorMessage: req.t('auth.messages.passwordsDoNotMatch')
    });
  }

  try {
    const validResetToken = await getValidPasswordResetToken(token);

    if (!validResetToken) {
      return renderResetPassword(req, res, token, {
        isTokenValid: false,
        errorMessage: req.t('auth.messages.resetLinkInvalid')
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const wasUpdated = await usePasswordResetToken(token, passwordHash);

    if (!wasUpdated) {
      return renderResetPassword(req, res, token, {
        isTokenValid: false,
        errorMessage: req.t('auth.messages.resetLinkInvalid')
      });
    }

    await safeAuditFromRequest(req, {
      userId: validResetToken.user_id,
      action: 'PASSWORD_RESET_COMPLETED',
      entityType: 'user',
      entityId: validResetToken.user_id
    });

    setAuthFlash(req, 'success', req.t('auth.messages.passwordChanged'));
    return res.redirect('/login');
  } catch (error) {
    console.error('Reset password error:', error.message);
    return renderResetPassword(req, res, token, {
      errorMessage: req.t('auth.messages.failedToChangePassword')
    });
  }
});

// Destroy the session and clear the browser cookie before returning to login.
router.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login');
  });
});

module.exports = router;
