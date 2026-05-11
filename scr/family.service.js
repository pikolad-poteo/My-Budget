const db = require('./db');
const { FAMILY_ROLES, normalizeRole } = require('./family.permissions');

async function getUserFamily(userId) {
  const [rows] = await db.query(
    `
    SELECT
      f.*,
      fm.id AS membership_id,
      fm.role,
      fm.joined_at
    FROM family_members fm
    INNER JOIN families f ON f.id = fm.family_id
    WHERE fm.user_id = ?
    LIMIT 1
    `,
    [userId]
  );

  return rows[0] || null;
}

async function getFamilyById(familyId) {
  const [rows] = await db.query('SELECT * FROM families WHERE id = ? LIMIT 1', [familyId]);
  return rows[0] || null;
}

async function getFamilyMember(familyId, userId) {
  const [rows] = await db.query(
    `
    SELECT fm.id, fm.family_id, fm.user_id, fm.role, fm.joined_at, u.name, u.email
    FROM family_members fm
    INNER JOIN users u ON u.id = fm.user_id
    WHERE fm.family_id = ? AND fm.user_id = ?
    LIMIT 1
    `,
    [familyId, userId]
  );

  return rows[0] || null;
}

async function getFamilyMembers(familyId) {
  const [rows] = await db.query(
    `
    SELECT
      fm.id AS membership_id,
      fm.family_id,
      fm.user_id AS id,
      fm.role,
      fm.joined_at,
      fm.updated_at,
      u.name,
      u.email
    FROM family_members fm
    INNER JOIN users u ON u.id = fm.user_id
    WHERE fm.family_id = ?
    ORDER BY
      CASE fm.role
        WHEN 'owner' THEN 0
        WHEN 'editor' THEN 1
        ELSE 2
      END,
      u.name ASC
    `,
    [familyId]
  );

  return rows;
}

async function countFamilyOwners(familyId) {
  const [rows] = await db.query(
    'SELECT COUNT(*) AS total FROM family_members WHERE family_id = ? AND role = ?',
    [familyId, FAMILY_ROLES.OWNER]
  );

  return Number(rows[0] ? rows[0].total : 0);
}

async function createFamily({ userId, name }) {
  const existingFamily = await getUserFamily(userId);
  if (existingFamily) {
    throw new Error('You already belong to a family.');
  }

  const cleanName = String(name || '').trim();
  if (!cleanName) {
    throw new Error('Family name is required.');
  }

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const [result] = await connection.query(
      'INSERT INTO families (name, owner_user_id) VALUES (?, ?)',
      [cleanName, userId]
    );

    await connection.query(
      'INSERT INTO family_members (family_id, user_id, role) VALUES (?, ?, ?)',
      [result.insertId, userId, FAMILY_ROLES.OWNER]
    );

    await connection.commit();
    return result.insertId;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function updateFamilyName({ familyId, name }) {
  const cleanName = String(name || '').trim();
  if (!cleanName) {
    throw new Error('Family name is required.');
  }

  await db.query('UPDATE families SET name = ? WHERE id = ? LIMIT 1', [cleanName, familyId]);
}

async function addFamilyMember({ familyId, email, role = FAMILY_ROLES.VIEWER }) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const cleanRole = normalizeRole(role);

  if (!normalizedEmail) {
    throw new Error('Email is required.');
  }

  const [usersFound] = await db.query(
    'SELECT id, name, email FROM users WHERE LOWER(email) = ? LIMIT 1',
    [normalizedEmail]
  );

  if (usersFound.length === 0) {
    throw new Error('User with this email was not found.');
  }

  const user = usersFound[0];
  const existingFamily = await getUserFamily(user.id);

  if (existingFamily) {
    if (existingFamily.id === familyId) {
      throw new Error('This user is already a member of your family.');
    }

    throw new Error('This user already belongs to another family.');
  }

  await db.query(
    'INSERT INTO family_members (family_id, user_id, role) VALUES (?, ?, ?)',
    [familyId, user.id, cleanRole]
  );

  return user;
}

async function changeMemberRole({ familyId, targetUserId, role }) {
  const cleanRole = normalizeRole(role);
  const targetMember = await getFamilyMember(familyId, targetUserId);

  if (!targetMember) {
    throw new Error('Family member not found.');
  }

  if (targetMember.role === FAMILY_ROLES.OWNER && cleanRole !== FAMILY_ROLES.OWNER) {
    const ownersCount = await countFamilyOwners(familyId);
    if (ownersCount <= 1) {
      throw new Error('Family must have at least one owner. Add another owner before changing this role.');
    }
  }

  await db.query(
    'UPDATE family_members SET role = ? WHERE family_id = ? AND user_id = ? LIMIT 1',
    [cleanRole, familyId, targetUserId]
  );

  const members = await getFamilyMembers(familyId);
  const firstOwner = members.find((member) => member.role === FAMILY_ROLES.OWNER);
  if (firstOwner) {
    await db.query('UPDATE families SET owner_user_id = ? WHERE id = ? LIMIT 1', [firstOwner.id, familyId]);
  }
}

async function removeFamilyMember({ familyId, targetUserId }) {
  const targetMember = await getFamilyMember(familyId, targetUserId);

  if (!targetMember) {
    throw new Error('Family member not found.');
  }

  if (targetMember.role === FAMILY_ROLES.OWNER) {
    const ownersCount = await countFamilyOwners(familyId);
    if (ownersCount <= 1) {
      throw new Error('You cannot remove the last family owner.');
    }
  }

  await db.query(
    'DELETE FROM family_members WHERE family_id = ? AND user_id = ? LIMIT 1',
    [familyId, targetUserId]
  );
}

async function leaveFamily({ familyId, actorUserId }) {
  const member = await getFamilyMember(familyId, actorUserId);

  if (!member) {
    throw new Error('Family member not found.');
  }

  if (member.role === FAMILY_ROLES.OWNER) {
    const ownersCount = await countFamilyOwners(familyId);
    if (ownersCount <= 1) {
      throw new Error('You are the last owner. Transfer owner rights before leaving the family.');
    }
  }

  await db.query(
    'DELETE FROM family_members WHERE family_id = ? AND user_id = ? LIMIT 1',
    [familyId, actorUserId]
  );
}

async function deleteFamily({ familyId }) {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    await connection.query('UPDATE calendar_events SET family_id = NULL WHERE family_id = ?', [familyId]);
    await connection.query('DELETE FROM families WHERE id = ? LIMIT 1', [familyId]);

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = {
  getUserFamily,
  getFamilyById,
  getFamilyMember,
  getFamilyMembers,
  countFamilyOwners,
  createFamily,
  updateFamilyName,
  addFamilyMember,
  changeMemberRole,
  removeFamilyMember,
  leaveFamily,
  deleteFamily
};
