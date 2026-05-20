jest.mock('../../scr/db', () => ({
  getConnection: jest.fn()
}));

jest.mock('../../scr/token.service', () => ({
  createSecureToken: jest.fn(() => 'plain-verification-token'),
  hashToken: jest.fn((token) => `hashed:${token}`),
  minutesFromNow: jest.fn((minutes) => new Date(Date.UTC(2026, 0, 1, 0, minutes, 0)))
}));

jest.mock('../../scr/mail.service', () => ({
  sendVerificationEmail: jest.fn()
}));

const db = require('../../scr/db');
const { createSecureToken, hashToken, minutesFromNow } = require('../../scr/token.service');
const { sendVerificationEmail } = require('../../scr/mail.service');
const {
  createEmailVerificationToken,
  sendVerificationToken,
  verifyEmailToken
} = require('../../scr/emailVerification.service');

function createConnection() {
  return {
    query: jest.fn(),
    beginTransaction: jest.fn().mockResolvedValue(undefined),
    commit: jest.fn().mockResolvedValue(undefined),
    rollback: jest.fn().mockResolvedValue(undefined),
    release: jest.fn()
  };
}

describe('emailVerification.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createEmailVerificationToken', () => {
    test('marks old tokens as used and inserts a new hashed token', async () => {
      const connection = createConnection();
      connection.query.mockResolvedValue([{}]);

      const token = await createEmailVerificationToken(connection, 42);

      expect(token).toBe('plain-verification-token');
      expect(createSecureToken).toHaveBeenCalledTimes(1);
      expect(hashToken).toHaveBeenCalledWith('plain-verification-token');
      expect(minutesFromNow).toHaveBeenCalledWith(24 * 60);
      expect(connection.query).toHaveBeenCalledTimes(2);
      expect(connection.query.mock.calls[0][0]).toContain('UPDATE email_verification_tokens');
      expect(connection.query.mock.calls[0][1]).toEqual([42]);
      expect(connection.query.mock.calls[1][0]).toContain('INSERT INTO email_verification_tokens');
      expect(connection.query.mock.calls[1][1][0]).toBe(42);
      expect(connection.query.mock.calls[1][1][1]).toBe('hashed:plain-verification-token');
      expect(connection.query.mock.calls[1][1][2]).toBeInstanceOf(Date);
    });
  });

  describe('sendVerificationToken', () => {
    test('wraps token creation and email sending in a transaction', async () => {
      const connection = createConnection();
      connection.query.mockResolvedValue([{}]);
      db.getConnection.mockResolvedValueOnce(connection);
      sendVerificationEmail.mockResolvedValueOnce(undefined);

      await sendVerificationToken({ id: 8, email: 'student@example.com' });

      expect(connection.beginTransaction).toHaveBeenCalledTimes(1);
      expect(sendVerificationEmail).toHaveBeenCalledWith('student@example.com', 'plain-verification-token');
      expect(connection.commit).toHaveBeenCalledTimes(1);
      expect(connection.rollback).not.toHaveBeenCalled();
      expect(connection.release).toHaveBeenCalledTimes(1);
    });

    test('rolls back and releases the connection when email sending fails', async () => {
      const connection = createConnection();
      connection.query.mockResolvedValue([{}]);
      db.getConnection.mockResolvedValueOnce(connection);
      sendVerificationEmail.mockRejectedValueOnce(new Error('mail error'));

      await expect(sendVerificationToken({ id: 8, email: 'student@example.com' })).rejects.toThrow('mail error');

      expect(connection.commit).not.toHaveBeenCalled();
      expect(connection.rollback).toHaveBeenCalledTimes(1);
      expect(connection.release).toHaveBeenCalledTimes(1);
    });
  });

  describe('verifyEmailToken', () => {
    test('returns false and rolls back when the token is invalid', async () => {
      const connection = createConnection();
      connection.query.mockResolvedValueOnce([[]]);
      db.getConnection.mockResolvedValueOnce(connection);

      const result = await verifyEmailToken('missing-token');

      expect(result).toBe(false);
      expect(hashToken).toHaveBeenCalledWith('missing-token');
      expect(connection.rollback).toHaveBeenCalledTimes(1);
      expect(connection.commit).not.toHaveBeenCalled();
      expect(connection.release).toHaveBeenCalledTimes(1);
    });

    test('verifies the user and marks the token as used when token is valid', async () => {
      const connection = createConnection();
      connection.query
        .mockResolvedValueOnce([[{ id: 15, user_id: 6 }]])
        .mockResolvedValueOnce([{}])
        .mockResolvedValueOnce([{}]);
      db.getConnection.mockResolvedValueOnce(connection);

      const result = await verifyEmailToken('valid-token');

      expect(result).toBe(true);
      expect(connection.query.mock.calls[0][0]).toContain('FROM email_verification_tokens');
      expect(connection.query.mock.calls[0][1]).toEqual(['hashed:valid-token']);
      expect(connection.query.mock.calls[1][0]).toContain('UPDATE users SET email_verified_at = NOW()');
      expect(connection.query.mock.calls[1][1]).toEqual([6]);
      expect(connection.query.mock.calls[2][0]).toContain('UPDATE email_verification_tokens SET used_at = NOW()');
      expect(connection.query.mock.calls[2][1]).toEqual([15]);
      expect(connection.commit).toHaveBeenCalledTimes(1);
      expect(connection.rollback).not.toHaveBeenCalled();
      expect(connection.release).toHaveBeenCalledTimes(1);
    });
  });
});
