const crypto = require('crypto');

// Generates a high-entropy token that can be safely sent to the user by email.
function createSecureToken() {
  return crypto.randomBytes(32).toString('hex');
}

// Stores only token hashes in the database so leaked rows cannot be used as valid links.
function hashToken(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

function minutesFromNow(minutes) {
  return new Date(Date.now() + minutes * 60 * 1000);
}

module.exports = {
  createSecureToken,
  hashToken,
  minutesFromNow
};
