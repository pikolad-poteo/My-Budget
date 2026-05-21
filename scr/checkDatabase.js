const pool = require('./db');

let initialized = false;

async function columnExists(tableName, columnName) {
  const [rows] = await pool.query(
    `
    SELECT COLUMN_NAME
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = ?
      AND COLUMN_NAME = ?
    LIMIT 1
    `,
    [tableName, columnName]
  );

  return rows.length > 0;
}

async function addColumnIfMissing(tableName, columnName, definition) {
  const exists = await columnExists(tableName, columnName);

  if (!exists) {
    await pool.query(`ALTER TABLE \`${tableName}\` ADD COLUMN \`${columnName}\` ${definition}`);
  }
}

async function ensurePendingEmailColumns() {
  await addColumnIfMissing('users', 'pending_email', 'VARCHAR(150) NULL AFTER `email`');
  await addColumnIfMissing('users', 'pending_email_token_hash', 'VARCHAR(255) NULL AFTER `pending_email`');
  await addColumnIfMissing('users', 'pending_email_token_expires', 'DATETIME NULL AFTER `pending_email_token_hash`');
}

async function initializeDatabase() {
  if (initialized) return;

  try {
    await pool.query('SELECT 1');
    await ensurePendingEmailColumns();
    initialized = true;
  } catch (error) {
    console.error('Database connection error:', error.message);
    throw error;
  }
}

module.exports = { initializeDatabase };
