const db = require('./db');
const { createSecureToken, hashToken, minutesFromNow } = require('./token.service');

const PENDING_EMAIL_TTL_MINUTES = 24 * 60;

// Stores the requested email separately until the user confirms ownership through the emailed token.
async function createPendingEmailChange(connection, userId, pendingEmail) {
  const token = createSecureToken();
  const tokenHash = hashToken(token);

  await connection.query(
    `
    UPDATE users
    SET pending_email = ?,
        pending_email_token_hash = ?,
        pending_email_token_expires = ?
    WHERE id = ?
    LIMIT 1
    `,
    [pendingEmail, tokenHash, minutesFromNow(PENDING_EMAIL_TTL_MINUTES), userId]
  );

  return token;
}

async function confirmPendingEmailChange(token) {
  const tokenHash = hashToken(token);
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const [users] = await connection.query(
      `
      SELECT id, pending_email
      FROM users
      WHERE pending_email_token_hash = ?
        AND pending_email_token_expires > NOW()
        AND pending_email IS NOT NULL
      LIMIT 1
      FOR UPDATE
      `,
      [tokenHash]
    );

    if (users.length === 0) {
      await connection.rollback();
      return 'invalid';
    }

    const user = users[0];

    // Re-check duplicates at confirmation time in case another account claimed the email meanwhile.
    const [duplicates] = await connection.query(
      `
      SELECT id
      FROM users
      WHERE email = ? AND id <> ?
      LIMIT 1
      `,
      [user.pending_email, user.id]
    );

    if (duplicates.length > 0) {
      await connection.rollback();
      return 'duplicate';
    }

    // Promotes the pending email to the active email and clears all temporary verification data.
    await connection.query(
      `
      UPDATE users
      SET email = pending_email,
          pending_email = NULL,
          pending_email_token_hash = NULL,
          pending_email_token_expires = NULL,
          email_verified_at = NOW()
      WHERE id = ?
      LIMIT 1
      `,
      [user.id]
    );

    await connection.commit();
    return 'confirmed';
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function cancelPendingEmailChange(userId) {
  await db.query(
    `
    UPDATE users
    SET pending_email = NULL,
        pending_email_token_hash = NULL,
        pending_email_token_expires = NULL
    WHERE id = ?
    LIMIT 1
    `,
    [userId]
  );
}

module.exports = {
  createPendingEmailChange,
  confirmPendingEmailChange,
  cancelPendingEmailChange
};
