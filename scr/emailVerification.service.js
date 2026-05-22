const db = require('./db');
const { createSecureToken, hashToken, minutesFromNow } = require('./token.service');
const { sendVerificationEmail } = require('./mail.service');

const EMAIL_VERIFICATION_TTL_MINUTES = 24 * 60;

// Creates a new email verification token and invalidates any previous unused tokens for the same user.
async function createEmailVerificationToken(connection, userId) {
  const token = createSecureToken();
  const tokenHash = hashToken(token);

  await connection.query(
    `
    UPDATE email_verification_tokens
    SET used_at = NOW()
    WHERE user_id = ? AND used_at IS NULL
    `,
    [userId]
  );

  await connection.query(
    `
    INSERT INTO email_verification_tokens (user_id, token_hash, expires_at)
    VALUES (?, ?, ?)
    `,
    [userId, tokenHash, minutesFromNow(EMAIL_VERIFICATION_TTL_MINUTES)]
  );

  return token;
}

// Saves the token and sends the email in one transaction to keep the verification state consistent.
async function sendVerificationToken(user) {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();
    const token = await createEmailVerificationToken(connection, user.id);
    await sendVerificationEmail(user.email, token);
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function verifyEmailToken(token) {
  const tokenHash = hashToken(token);
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const [tokens] = await connection.query(
      `
      SELECT id, user_id
      FROM email_verification_tokens
      WHERE token_hash = ?
        AND used_at IS NULL
        AND expires_at > NOW()
      LIMIT 1
      FOR UPDATE
      `,
      [tokenHash]
    );

    if (tokens.length === 0) {
      await connection.rollback();
      return false;
    }

    const verificationToken = tokens[0];

    // Marks both the user email and the token itself as completed in the same database transaction.
    await connection.query(
      'UPDATE users SET email_verified_at = NOW() WHERE id = ? LIMIT 1',
      [verificationToken.user_id]
    );

    await connection.query(
      'UPDATE email_verification_tokens SET used_at = NOW() WHERE id = ? LIMIT 1',
      [verificationToken.id]
    );

    await connection.commit();
    return true;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = {
  createEmailVerificationToken,
  sendVerificationToken,
  verifyEmailToken
};
