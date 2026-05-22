const db = require('./db');
const { createSecureToken, hashToken, minutesFromNow } = require('./token.service');
const { sendPasswordResetEmail } = require('./mail.service');

const PASSWORD_RESET_TTL_MINUTES = 30;

// Generates a short-lived reset token and invalidates older unused reset links for this user.
async function createPasswordResetToken(connection, userId) {
  const token = createSecureToken();
  const tokenHash = hashToken(token);

  await connection.query(
    `
    UPDATE password_reset_tokens
    SET used_at = NOW()
    WHERE user_id = ? AND used_at IS NULL
    `,
    [userId]
  );

  await connection.query(
    `
    INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
    VALUES (?, ?, ?)
    `,
    [userId, tokenHash, minutesFromNow(PASSWORD_RESET_TTL_MINUTES)]
  );

  return token;
}

// Creates the reset token and sends the email as a single controlled service operation.
async function sendPasswordResetToken(user) {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();
    const token = await createPasswordResetToken(connection, user.id);
    await sendPasswordResetEmail(user.email, token);
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

// Reads a reset token without consuming it so the reset form can be displayed safely.
async function getValidPasswordResetToken(token) {
  const tokenHash = hashToken(token);

  const [tokens] = await db.query(
    `
    SELECT prt.id, prt.user_id, u.email
    FROM password_reset_tokens prt
    INNER JOIN users u ON u.id = prt.user_id
    WHERE prt.token_hash = ?
      AND prt.used_at IS NULL
      AND prt.expires_at > NOW()
    LIMIT 1
    `,
    [tokenHash]
  );

  return tokens[0] || null;
}

async function usePasswordResetToken(token, passwordHash) {
  const tokenHash = hashToken(token);
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const [tokens] = await connection.query(
      `
      SELECT id, user_id
      FROM password_reset_tokens
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

    const resetToken = tokens[0];

    // Updates the password and consumes the token atomically so the same reset link cannot be reused.
    await connection.query(
      'UPDATE users SET password_hash = ? WHERE id = ? LIMIT 1',
      [passwordHash, resetToken.user_id]
    );

    await connection.query(
      'UPDATE password_reset_tokens SET used_at = NOW() WHERE id = ? LIMIT 1',
      [resetToken.id]
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
  sendPasswordResetToken,
  getValidPasswordResetToken,
  usePasswordResetToken
};
