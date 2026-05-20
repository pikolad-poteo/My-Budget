const crypto = require('crypto');
const { createSecureToken, hashToken, minutesFromNow } = require('../../scr/token.service');

describe('token.service', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  describe('createSecureToken', () => {
    test('creates a secure hex token with the expected length', () => {
      const token = createSecureToken();

      expect(token).toHaveLength(64);
      expect(token).toMatch(/^[a-f0-9]{64}$/);
    });

    test('creates different tokens on repeated calls', () => {
      const firstToken = createSecureToken();
      const secondToken = createSecureToken();

      expect(firstToken).not.toBe(secondToken);
    });
  });

  describe('hashToken', () => {
    test('returns a sha256 hash for the provided token', () => {
      const token = 'sample-token';
      const expectedHash = crypto.createHash('sha256').update(token).digest('hex');

      expect(hashToken(token)).toBe(expectedHash);
    });

    test('normalizes non-string values before hashing', () => {
      const expectedHash = crypto.createHash('sha256').update('12345').digest('hex');

      expect(hashToken(12345)).toBe(expectedHash);
    });
  });

  describe('minutesFromNow', () => {
    test('returns a date moved forward by the requested number of minutes', () => {
      jest.useFakeTimers().setSystemTime(new Date('2026-05-20T10:00:00.000Z'));

      expect(minutesFromNow(30).toISOString()).toBe('2026-05-20T10:30:00.000Z');
    });
  });
});
