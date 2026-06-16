// Stores and compares emails in one predictable format across registration, login and account settings.
const USER_STATUSES = Object.freeze({
  ACTIVE: 'active',
  BLOCKED: 'blocked',
  DELETED: 'deleted'
});

const GLOBAL_ROLES = Object.freeze({
  USER: 'user',
  SUPPORT_ADMIN: 'support_admin',
  GLOBAL_ADMIN: 'global_admin'
});

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

// Returns translated validation labels when a translation function is available.
function getPasswordRuleLabels(t) {
  if (typeof t !== 'function') {
    return {
      atLeastEightCharacters: 'at least 8 characters',
      lowercase: 'one lowercase letter',
      uppercase: 'one uppercase letter',
      number: 'one number',
      specialCharacter: 'one special character',
      noSpaces: 'no spaces',
      messagePrefix: 'Password must contain'
    };
  }

  return {
    atLeastEightCharacters: t('auth.passwordRules.atLeastEightCharacters'),
    lowercase: t('auth.passwordRules.lowercase'),
    uppercase: t('auth.passwordRules.uppercase'),
    number: t('auth.passwordRules.number'),
    specialCharacter: t('auth.passwordRules.specialCharacter'),
    noSpaces: t('auth.passwordRules.noSpaces'),
    messagePrefix: t('auth.passwordRules.messagePrefix')
  };
}

// Enforces the same password policy for registration, password reset and account password changes.
function validatePassword(password, t) {
  const value = String(password || '');
  const labels = getPasswordRuleLabels(t);
  const errors = [];

  if (value.length < 8) {
    errors.push(labels.atLeastEightCharacters);
  }

  if (!/[a-z]/.test(value)) {
    errors.push(labels.lowercase);
  }

  if (!/[A-Z]/.test(value)) {
    errors.push(labels.uppercase);
  }

  if (!/[0-9]/.test(value)) {
    errors.push(labels.number);
  }

  if (!/[^A-Za-z0-9]/.test(value)) {
    errors.push(labels.specialCharacter);
  }

  if (/\s/.test(value)) {
    errors.push(labels.noSpaces);
  }

  return {
    isValid: errors.length === 0,
    message: errors.length === 0
      ? ''
      : `${labels.messagePrefix} ${errors.join(', ')}.`
  };
}

function normalizeUserStatus(status) {
  return Object.values(USER_STATUSES).includes(status) ? status : USER_STATUSES.BLOCKED;
}

function isActiveUserStatus(status) {
  return normalizeUserStatus(status) === USER_STATUSES.ACTIVE;
}

module.exports = {
  USER_STATUSES,
  GLOBAL_ROLES,
  normalizeEmail,
  isValidEmail,
  validatePassword,
  normalizeUserStatus,
  isActiveUserStatus
};
