const rateLimit = require('express-rate-limit');

function shouldSkipRateLimit() {
  return process.env.NODE_ENV === 'test' || process.env.RATE_LIMIT_DISABLED === 'true';
}

function getTooManyAttemptsMessage(req) {
  return req.t
    ? req.t('auth.messages.tooManyAttempts')
    : 'Too many attempts. Please wait and try again.';
}

function renderAuthRateLimitPage(req, res, viewName, locals = {}) {
  return res.status(429).render(viewName, {
    activePage: 'login',
    errorMessage: getTooManyAttemptsMessage(req),
    successMessage: '',
    ...locals
  });
}

function rateLimitHandler(req, res) {
  const path = req.path || req.originalUrl || '';
  const body = req.body || {};

  if (path.includes('/register')) {
    return renderAuthRateLimitPage(req, res, 'register', {
      title: req.t ? req.t('auth.registerTitle') : 'Register',
      formData: {
        name: body.name || '',
        email: body.email || ''
      }
    });
  }

  if (path.includes('/forgot-password')) {
    return renderAuthRateLimitPage(req, res, 'forgot-password', {
      title: req.t ? req.t('auth.forgotPasswordTitle') : 'Forgot password',
      email: body.email || ''
    });
  }

  if (path.includes('/resend-verification')) {
    return renderAuthRateLimitPage(req, res, 'resend-verification', {
      title: req.t ? req.t('auth.resendVerificationTitle') : 'Resend verification email',
      email: body.email || ''
    });
  }

  if (path.includes('/reset-password')) {
    return renderAuthRateLimitPage(req, res, 'reset-password', {
      title: req.t ? req.t('auth.resetPasswordTitle') : 'Reset password',
      token: req.params?.token || '',
      isTokenValid: true
    });
  }

  return renderAuthRateLimitPage(req, res, 'login', {
    title: req.t ? req.t('auth.loginTitle') : 'Login',
    email: body.email || ''
  });
}

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skip: shouldSkipRateLimit,
  handler: rateLimitHandler
});

const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skip: shouldSkipRateLimit,
  handler: rateLimitHandler
});

module.exports = {
  authLimiter,
  passwordResetLimiter,
  rateLimitHandler,
  shouldSkipRateLimit,
  getTooManyAttemptsMessage
};
