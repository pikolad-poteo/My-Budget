const pool = require('./db');

let userAvatarColumnChecked = false;

async function ensureUserAvatarColumn() {
  if (userAvatarColumnChecked) return;

  const [columns] = await pool.query(`
    SELECT COLUMN_NAME
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'users'
      AND COLUMN_NAME = 'avatar_url'
    LIMIT 1
  `);

  if (columns.length === 0) {
    await pool.query('ALTER TABLE users ADD COLUMN avatar_url VARCHAR(255) NULL AFTER email');
  }

  userAvatarColumnChecked = true;
}

async function checkDatabase(req, res, next) {
  try {
    await pool.query('SELECT 1');
    await ensureUserAvatarColumn();
    next();
  } catch (error) {
    console.error('Database connection error:', error.message);

    return res.status(500).send(`
      <h1>Database connection error</h1>
      <p>My-Budget cannot connect to MySQL right now.</p>
      <p>Please check your .env configuration and database status.</p>
    `);
  }
}

module.exports = checkDatabase;