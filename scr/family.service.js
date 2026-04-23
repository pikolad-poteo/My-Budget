const db = require('./db');

async function getUserFamily(userId) {
  const [rows] = await db.query(
    `
    SELECT f.id, f.name, f.owner_user_id, fm.role
    FROM family_members fm
    INNER JOIN families f ON f.id = fm.family_id
    WHERE fm.user_id = ?
    LIMIT 1
    `,
    [userId]
  );

  return rows[0] || null;
}

async function getFamilyMembers(familyId) {
  const [rows] = await db.query(
    `
    SELECT u.id, u.name, u.email, fm.role
    FROM family_members fm
    INNER JOIN users u ON u.id = fm.user_id
    WHERE fm.family_id = ?
    ORDER BY
      CASE WHEN fm.role = 'owner' THEN 0 ELSE 1 END,
      u.name ASC
    `,
    [familyId]
  );

  return rows;
}

module.exports = {
  getUserFamily,
  getFamilyMembers
};