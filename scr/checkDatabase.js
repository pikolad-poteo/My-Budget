const pool = require('./db');

let initialized = false;

/**
 * Performs only a startup connectivity check.
 *
 * Schema changes must be applied with SQL migrations before deployment.
 * This keeps production startup predictable and avoids hidden ALTER TABLE
 * statements every time the application starts.
 */
async function initializeDatabase() {
  if (initialized) return;

  try {
    await pool.query('SELECT 1');
    initialized = true;
  } catch (error) {
    console.error('Database connection error:', error.message);
    throw error;
  }
}

module.exports = { initializeDatabase };
