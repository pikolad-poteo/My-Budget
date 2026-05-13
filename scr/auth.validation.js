function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function isValidEmail(email) {
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail || normalizedEmail.length > 150) {
    return false;
  }

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail);
}

function validatePassword(password) {
  const value = String(password || '');
  const errors = [];

  if (value.length < 8) {
    errors.push('at least 8 characters');
  }

  if (!/[a-z]/.test(value)) {
    errors.push('one lowercase letter');
  }

  if (!/[A-Z]/.test(value)) {
    errors.push('one uppercase letter');
  }

  if (!/[0-9]/.test(value)) {
    errors.push('one number');
  }

  if (!/[^A-Za-z0-9]/.test(value)) {
    errors.push('one special character');
  }

  if (/\s/.test(value)) {
    errors.push('no spaces');
  }

  return {
    isValid: errors.length === 0,
    message: errors.length === 0
      ? ''
      : `Password must contain ${errors.join(', ')}.`
  };
}

module.exports = {
  normalizeEmail,
  isValidEmail,
  validatePassword
};
