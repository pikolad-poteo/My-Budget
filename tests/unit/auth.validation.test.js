const { normalizeEmail, isValidEmail, validatePassword } = require('../../scr/auth.validation');

describe('auth.validation helpers', () => {
  describe('normalizeEmail', () => {
    test('trims whitespace and converts email to lowercase', () => {
      expect(normalizeEmail('  User.Name@Example.COM  ')).toBe('user.name@example.com');
    });

    test('returns an empty string for missing values', () => {
      expect(normalizeEmail()).toBe('');
      expect(normalizeEmail(null)).toBe('');
    });
  });

  describe('isValidEmail', () => {
    test('accepts a correctly formatted email address', () => {
      expect(isValidEmail('student@example.com')).toBe(true);
    });

    test('rejects missing or incorrectly formatted email addresses', () => {
      expect(isValidEmail('')).toBe(false);
      expect(isValidEmail('student.example.com')).toBe(false);
      expect(isValidEmail('student@example')).toBe(false);
      expect(isValidEmail('student @example.com')).toBe(false);
    });

    test('rejects emails longer than the allowed length', () => {
      const longEmail = `${'a'.repeat(151)}@example.com`;
      expect(isValidEmail(longEmail)).toBe(false);
    });
  });

  describe('validatePassword', () => {
    test('accepts a strong password', () => {
      expect(validatePassword('StrongPass1!')).toEqual({
        isValid: true,
        message: ''
      });
    });

    test('rejects a weak password and returns a readable message', () => {
      const result = validatePassword('weak');

      expect(result.isValid).toBe(false);
      expect(result.message).toContain('Password must contain');
      expect(result.message).toContain('at least 8 characters');
      expect(result.message).toContain('one uppercase letter');
      expect(result.message).toContain('one number');
      expect(result.message).toContain('one special character');
    });

    test('rejects passwords with spaces', () => {
      const result = validatePassword('Strong Pass1!');

      expect(result.isValid).toBe(false);
      expect(result.message).toContain('no spaces');
    });
  });
});
