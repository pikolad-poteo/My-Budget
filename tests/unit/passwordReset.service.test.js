// Unit tests for password reset token handling.
// External dependencies are mocked to verify secure token creation, expiration checks and password-update behavior.

// Mocks isolate the unit under test from the database, mail transport and runtime side effects.
jest.mock('../../scr/db', () => ({
  query: jest.fn(),
  getConnection: jest.fn()
}));

jest.mock('../../scr/token.service', () => ({
  createSecureToken: jest.fn(() => 'plain-reset-token'),
  hashToken: jest.fn((token) => `hashed:${token}`),
  minutesFromNow: jest.fn((minutes) => new Date(Date.UTC(2026, 0, 1, 0, minutes, 0)))
}));

jest.mock('../../scr/mail.service', () => ({
  sendPasswordResetEmail: jest.fn()
}));

const db = require('../../scr/db');
const { createSecureToken, hashToken, minutesFromNow } = require('../../scr/token.service');
const { sendPasswordResetEmail } = require('../../scr/mail.service');
const {
  sendPasswordResetToken,
  getValidPasswordResetToken,
  usePasswordResetToken
} = require('../../scr/passwordReset.service');

function createConnection() {
  return {
    query: jest.fn(),
    beginTransaction: jest.fn().mockResolvedValue(undefined),
    commit: jest.fn().mockResolvedValue(undefined),
    rollback: jest.fn().mockResolvedValue(undefined),
    release: jest.fn()
  };
}

describe('passwordReset.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('sendPasswordResetToken', () => {
    test('creates a reset token, sends email, and commits the transaction', async () => {
      const connection = createConnection();
      connection.query.mockResolvedValue([{}]);
      db.getConnection.mockResolvedValueOnce(connection);
      sendPasswordResetEmail.mockResolvedValueOnce(undefined);

      await sendPasswordResetToken({ id: 11, email: 'reset@example.com' });

      expect(connection.beginTransaction).toHaveBeenCalledTimes(1);
      expect(createSecureToken).toHaveBeenCalledTimes(1);
      expect(hashToken).toHaveBeenCalledWith('plain-reset-token');
      expect(minutesFromNow).toHaveBeenCalledWith(30);
      expect(connection.query).toHaveBeenCalledTimes(2);
      expect(connection.query.mock.calls[0][0]).toContain('UPDATE password_reset_tokens');
      expect(connection.query.mock.calls[0][1]).toEqual([11]);
      expect(connection.query.mock.calls[1][0]).toContain('INSERT INTO password_reset_tokens');
      expect(connection.query.mock.calls[1][1][0]).toBe(11);
      expect(connection.query.mock.calls[1][1][1]).toBe('hashed:plain-reset-token');
      expect(sendPasswordResetEmail).toHaveBeenCalledWith('reset@example.com', 'plain-reset-token');
      expect(connection.commit).toHaveBeenCalledTimes(1);
      expect(connection.rollback).not.toHaveBeenCalled();
      expect(connection.release).toHaveBeenCalledTimes(1);
    });

    test('rolls back and releases the connection when token email fails', async () => {
      const connection = createConnection();
      connection.query.mockResolvedValue([{}]);
      db.getConnection.mockResolvedValueOnce(connection);
      sendPasswordResetEmail.mockRejectedValueOnce(new Error('smtp failed'));

      await expect(sendPasswordResetToken({ id: 11, email: 'reset@example.com' })).rejects.toThrow('smtp failed');

      expect(connection.commit).not.toHaveBeenCalled();
      expect(connection.rollback).toHaveBeenCalledTimes(1);
      expect(connection.release).toHaveBeenCalledTimes(1);
    });
  });

  describe('getValidPasswordResetToken', () => {
    test('returns the first matching valid reset token', async () => {
      const row = { id: 4, user_id: 9, email: 'user@example.com' };
      db.query.mockResolvedValueOnce([[row]]);

      const result = await getValidPasswordResetToken('lookup-token');

      expect(result).toBe(row);
      expect(hashToken).toHaveBeenCalledWith('lookup-token');
      expect(db.query.mock.calls[0][0]).toContain('FROM password_reset_tokens prt');
      expect(db.query.mock.calls[0][1]).toEqual(['hashed:lookup-token']);
    });

    test('returns null when no valid reset token exists', async () => {
      db.query.mockResolvedValueOnce([[]]);

      const result = await getValidPasswordResetToken('expired-token');

      expect(result).toBeNull();
    });
  });

  describe('usePasswordResetToken', () => {
    test('returns false and rolls back when token cannot be used', async () => {
      const connection = createConnection();
      connection.query.mockResolvedValueOnce([[]]);
      db.getConnection.mockResolvedValueOnce(connection);

      const result = await usePasswordResetToken('bad-token', 'new-hash');

      expect(result).toBe(false);
      expect(connection.rollback).toHaveBeenCalledTimes(1);
      expect(connection.commit).not.toHaveBeenCalled();
      expect(connection.release).toHaveBeenCalledTimes(1);
    });

    test('updates the user password and marks reset token as used', async () => {
      const connection = createConnection();
      connection.query
        .mockResolvedValueOnce([[{ id: 22, user_id: 7 }]])
        .mockResolvedValueOnce([{}])
        .mockResolvedValueOnce([{}]);
      db.getConnection.mockResolvedValueOnce(connection);

      const result = await usePasswordResetToken('good-token', 'new-password-hash');

      expect(result).toBe(true);
      expect(connection.query.mock.calls[0][1]).toEqual(['hashed:good-token']);
      expect(connection.query.mock.calls[1][0]).toContain('UPDATE users SET password_hash = ?');
      expect(connection.query.mock.calls[1][1]).toEqual(['new-password-hash', 7]);
      expect(connection.query.mock.calls[2][0]).toContain('UPDATE password_reset_tokens SET used_at = NOW()');
      expect(connection.query.mock.calls[2][1]).toEqual([22]);
      expect(connection.commit).toHaveBeenCalledTimes(1);
      expect(connection.rollback).not.toHaveBeenCalled();
      expect(connection.release).toHaveBeenCalledTimes(1);
    });
  });
});
