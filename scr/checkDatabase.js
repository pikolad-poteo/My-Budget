const pool = require('./db');

let initialized = false;


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