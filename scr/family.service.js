const db = require('./db');
const { FAMILY_ROLES, normalizeRole } = require('./family.permissions');
const { logFamilyActivity } = require('./family.activity');

/**
 * Returns the current family workspace for a user, including membership role metadata.
 */
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
    SELECT fm.id, fm.family_id, fm.user_id, fm.role, fm.joined_at, u.name, u.email, u.avatar_url
    FROM family_members fm
    INNER JOIN users u ON u.id = fm.user_id
    WHERE fm.family_id = ? AND fm.user_id = ?
    LIMIT 1
    `,
    [familyId, userId]
  );

  return rows[0] || null;
}

/**
 * Lists family members in UI order: owners first, then editors/viewers by name.
 */
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
      u.email,
      u.avatar_url
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

/**
 * Used before role changes and removals to prevent a family from losing its last owner.
 */
async function countFamilyOwners(familyId) {
  const [rows] = await db.query(
    'SELECT COUNT(*) AS total FROM family_members WHERE family_id = ? AND role = ?',
    [familyId, FAMILY_ROLES.OWNER]
  );

  return Number(rows[0] ? rows[0].total : 0);
}


/**
 * Counts data that still belongs to the user's personal workspace before joining a family.
 */
async function countPersonalWorkspaceData(userId) {
  const tables = [
    ['categories', 'categories'],
    ['transactions', 'transactions'],
    ['wishlist_items', 'wishlist items'],
    ['wishlist_folders', 'wishlist folders'],
    ['calendar_events', 'calendar events']
  ];

  const result = {};

  for (const [table, key] of tables) {
    const [rows] = await db.query(
      `SELECT COUNT(*) AS total FROM ${table} WHERE user_id = ? AND family_id IS NULL`,
      [userId]
    );
    result[key] = Number(rows[0] ? rows[0].total : 0);
  }

  result.total = Object.values(result).reduce((sum, value) => sum + Number(value || 0), 0);
  return result;
}

/**
 * Moves existing personal budget data into a newly created family workspace.
 * The caller owns the transaction so all workspace tables are migrated atomically.
 */
async function migratePersonalWorkspaceToFamily(connection, userId, familyId) {
  await connection.query('UPDATE categories SET family_id = ? WHERE user_id = ? AND family_id IS NULL', [familyId, userId]);
  await connection.query('UPDATE transactions SET family_id = ? WHERE user_id = ? AND family_id IS NULL', [familyId, userId]);
  await connection.query('UPDATE wishlist_items SET family_id = ? WHERE user_id = ? AND family_id IS NULL', [familyId, userId]);
  await connection.query('UPDATE wishlist_folders SET family_id = ? WHERE user_id = ? AND family_id IS NULL', [familyId, userId]);
  await connection.query('UPDATE calendar_events SET family_id = ? WHERE user_id = ? AND family_id IS NULL', [familyId, userId]);
}

/**
 * Deletes personal-only data when the user chooses not to keep it before joining a family.
 */
async function deletePersonalWorkspaceData(userId) {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();
    await connection.query('DELETE FROM calendar_events WHERE user_id = ? AND family_id IS NULL', [userId]);
    await connection.query('DELETE FROM wishlist_items WHERE user_id = ? AND family_id IS NULL', [userId]);
    await connection.query('DELETE FROM wishlist_folders WHERE user_id = ? AND family_id IS NULL', [userId]);
    await connection.query('DELETE FROM transactions WHERE user_id = ? AND family_id IS NULL', [userId]);
    await connection.query('DELETE FROM categories WHERE user_id = ? AND family_id IS NULL', [userId]);
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * Builds a unified activity feed for a lone user's personal workspace.
 */
async function getPersonalWorkspaceActivity(userId, limit = 100) {
  const safeLimit = Number.isInteger(Number(limit)) ? Math.min(Math.max(Number(limit), 1), 100) : 100;

  const [rows] = await db.query(
    `
    SELECT * FROM (
      SELECT
        CONCAT('category-', c.id) AS id,
        c.id AS entity_id,
        'category' AS entity_type,
        'category_created' AS action,
        CONCAT('Created ', c.type, ' category') AS title,
        CONCAT('Category "', c.name, '" is available in your personal workspace.') AS description,
        c.created_at AS created_at
      FROM categories c
      WHERE c.user_id = ? AND c.family_id IS NULL

      UNION ALL

      SELECT
        CONCAT('transaction-', t.id) AS id,
        t.id AS entity_id,
        'transaction' AS entity_type,
        'transaction_created' AS action,
        CONCAT(UPPER(LEFT(t.type, 1)), SUBSTRING(t.type, 2), ' transaction') AS title,
        CONCAT(COALESCE(NULLIF(t.description, ''), 'Transaction'), ' · ', FORMAT(ABS(t.amount), 2), ' €') AS description,
        t.created_at AS created_at
      FROM transactions t
      WHERE t.user_id = ? AND t.family_id IS NULL

      UNION ALL

      SELECT
        CONCAT('wishlist-folder-', wf.id) AS id,
        wf.id AS entity_id,
        'wishlist folder' AS entity_type,
        'wishlist_folder_created' AS action,
        'Wishlist folder created' AS title,
        CONCAT('Folder "', wf.name, '" is available in your personal wishlist.') AS description,
        wf.created_at AS created_at
      FROM wishlist_folders wf
      WHERE wf.user_id = ? AND wf.family_id IS NULL

      UNION ALL

      SELECT
        CONCAT('wishlist-item-', wi.id) AS id,
        wi.id AS entity_id,
        'wishlist item' AS entity_type,
        'wishlist_item_created' AS action,
        'Wishlist item created' AS title,
        CONCAT(wi.title, ' · ', FORMAT(COALESCE(wi.amount, 0), 2), ' €') AS description,
        wi.created_at AS created_at
      FROM wishlist_items wi
      WHERE wi.user_id = ? AND wi.family_id IS NULL

      UNION ALL

      SELECT
        CONCAT('calendar-event-', ce.id) AS id,
        ce.id AS entity_id,
        'calendar event' AS entity_type,
        'calendar_event_created' AS action,
        'Calendar event created' AS title,
        CONCAT(ce.title, ' · ', DATE_FORMAT(ce.event_date, '%d.%m.%Y')) AS description,
        ce.created_at AS created_at
      FROM calendar_events ce
      WHERE ce.user_id = ? AND ce.family_id IS NULL
    ) personal_activity
    ORDER BY created_at DESC
    LIMIT ${safeLimit}
    `,
    [userId, userId, userId, userId, userId]
  );

  return rows;
}

/**
 * Creates a family, assigns the creator as owner, and migrates personal data into it.
 */
async function createFamily({ userId, name, avatarUrl = null }) {
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
      'INSERT INTO families (name, avatar_url, owner_user_id) VALUES (?, ?, ?)',
      [cleanName, avatarUrl, userId]
    );

    await connection.query(
      'INSERT INTO family_members (family_id, user_id, role) VALUES (?, ?, ?)',
      [result.insertId, userId, FAMILY_ROLES.OWNER]
    );

    await migratePersonalWorkspaceToFamily(connection, userId, result.insertId);

    await connection.commit();

    await logFamilyActivity({
      familyId: result.insertId,
      actorUserId: userId,
      action: 'family_created',
      entityType: 'family',
      entityId: result.insertId,
      description: `Created family workspace "${cleanName}".`
    });

    return result.insertId;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * Updates family profile fields and records the change in the activity log.
 */
async function updateFamilyName({ familyId, actorUserId, name }) {
  const cleanName = String(name || '').trim();
  if (!cleanName) {
    throw new Error('Family name is required.');
  }

  const family = await getFamilyById(familyId);
  if (!family) {
    throw new Error('Family not found.');
  }

  await db.query('UPDATE families SET name = ? WHERE id = ? LIMIT 1', [cleanName, familyId]);

  await logFamilyActivity({
    familyId,
    actorUserId,
    action: 'family_name_updated',
    entityType: 'family',
    entityId: familyId,
    description: `Changed family name from "${family.name}" to "${cleanName}".`
  });
}

async function updateFamilyMotto({ familyId, actorUserId, motto }) {
  const cleanMotto = String(motto || '').trim().slice(0, 140) || null;
  const family = await getFamilyById(familyId);

  if (!family) {
    throw new Error('Family not found.');
  }

  await db.query('UPDATE families SET motto = ? WHERE id = ? LIMIT 1', [cleanMotto, familyId]);

  await logFamilyActivity({
    familyId,
    actorUserId,
    action: 'family_motto_updated',
    entityType: 'family',
    entityId: familyId,
    description: cleanMotto ? 'Updated family motto.' : 'Removed family motto.'
  });
}

async function updateFamilyAvatar({ familyId, actorUserId, avatarUrl }) {
  const cleanAvatarUrl = avatarUrl ? String(avatarUrl).trim() : null;

  await db.query('UPDATE families SET avatar_url = ? WHERE id = ? LIMIT 1', [cleanAvatarUrl, familyId]);

  await logFamilyActivity({
    familyId,
    actorUserId,
    action: 'family_avatar_updated',
    entityType: 'family',
    entityId: familyId,
    description: cleanAvatarUrl ? 'Updated family avatar.' : 'Removed family avatar.'
  });
}

/**
 * Adds an existing application user to the family workspace with a normalized role.
 */
async function addFamilyMember({ familyId, actorUserId, email, role = FAMILY_ROLES.VIEWER }) {
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

  await logFamilyActivity({
    familyId,
    actorUserId,
    targetUserId: user.id,
    action: 'member_added',
    entityType: 'member',
    entityId: user.id,
    description: `Added ${user.name || user.email} as ${cleanRole}.`
  });

  return user;
}

/**
 * Changes a member role while preserving the invariant that every family has an owner.
 */
async function changeMemberRole({ familyId, actorUserId, targetUserId, role }) {
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

  const owners = await getFamilyMembers(familyId);
  const firstOwner = owners.find((member) => member.role === FAMILY_ROLES.OWNER);

  if (firstOwner) {
    await db.query('UPDATE families SET owner_user_id = ? WHERE id = ? LIMIT 1', [firstOwner.id, familyId]);
  }

  await logFamilyActivity({
    familyId,
    actorUserId,
    targetUserId,
    action: 'member_role_updated',
    entityType: 'member',
    entityId: targetUserId,
    description: `Changed ${targetMember.name || targetMember.email} role from ${targetMember.role} to ${cleanRole}.`
  });
}

/**
 * Removes a member from the family, except when that would remove the last owner.
 */
async function removeFamilyMember({ familyId, actorUserId, targetUserId }) {
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

  await logFamilyActivity({
    familyId,
    actorUserId,
    targetUserId,
    action: 'member_removed',
    entityType: 'member',
    entityId: targetUserId,
    description: `Removed ${targetMember.name || targetMember.email} from the family.`
  });
}

/**
 * Lets a member leave the family while keeping ownership rules valid.
 */
async function leaveFamily({ familyId, actorUserId }) {
  const member = await getFamilyMember(familyId, actorUserId);

  if (!member) {
    throw new Error('Family member not found.');
  }

  if (member.role === FAMILY_ROLES.OWNER) {
    const ownersCount = await countFamilyOwners(familyId);
    if (ownersCount <= 1) {
      throw new Error('You are the last owner. Add another owner or delete the family before leaving.');
    }
  }

  await db.query(
    'DELETE FROM family_members WHERE family_id = ? AND user_id = ? LIMIT 1',
    [familyId, actorUserId]
  );

  const owners = await getFamilyMembers(familyId);
  const firstOwner = owners.find((familyMember) => familyMember.role === FAMILY_ROLES.OWNER);
  if (firstOwner) {
    await db.query('UPDATE families SET owner_user_id = ? WHERE id = ? LIMIT 1', [firstOwner.id, familyId]);
  }

  await logFamilyActivity({
    familyId,
    actorUserId,
    targetUserId: actorUserId,
    action: 'member_left',
    entityType: 'member',
    entityId: actorUserId,
    description: `${member.name || member.email} left the family.`
  });
}

/**
 * Transfers shared family records back to one user's personal workspace when deleting a family.
 */
async function moveFamilyWorkspaceToPersonal(connection, familyId, userId) {
  await connection.query('UPDATE categories SET user_id = ?, family_id = NULL WHERE family_id = ?', [userId, familyId]);
  await connection.query('UPDATE transactions SET user_id = ?, family_id = NULL, paid_by_user_id = ? WHERE family_id = ?', [userId, userId, familyId]);
  await connection.query('UPDATE wishlist_folders SET user_id = ?, family_id = NULL WHERE family_id = ?', [userId, familyId]);
  await connection.query('UPDATE wishlist_items SET user_id = ?, family_id = NULL WHERE family_id = ?', [userId, familyId]);
  await connection.query('UPDATE calendar_events SET user_id = ?, family_id = NULL WHERE family_id = ?', [userId, familyId]);
}

/**
 * Deletes a family workspace and either removes or preserves its shared budget data.
 */
async function deleteFamily({ familyId, actorUserId, keepSharedDataAsPersonal = false }) {
  await logFamilyActivity({
    familyId,
    actorUserId,
    action: 'family_deleted',
    entityType: 'family',
    entityId: familyId,
    description: keepSharedDataAsPersonal
      ? 'Family workspace was deleted and shared budget data was moved back to the owner personal workspace.'
      : 'Family workspace was deleted.'
  });

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    if (keepSharedDataAsPersonal) {
      await moveFamilyWorkspaceToPersonal(connection, familyId, actorUserId);
    } else {
      await connection.query('DELETE FROM calendar_events WHERE family_id = ?', [familyId]);
      await connection.query('DELETE FROM wishlist_items WHERE family_id = ?', [familyId]);
      await connection.query('DELETE FROM wishlist_folders WHERE family_id = ?', [familyId]);
      await connection.query('DELETE FROM transactions WHERE family_id = ?', [familyId]);
      await connection.query('DELETE FROM categories WHERE family_id = ?', [familyId]);
    }

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
  countPersonalWorkspaceData,
  getPersonalWorkspaceActivity,
  deletePersonalWorkspaceData,
  createFamily,
  updateFamilyName,
  updateFamilyMotto,
  updateFamilyAvatar,
  addFamilyMember,
  changeMemberRole,
  removeFamilyMember,
  leaveFamily,
  deleteFamily
};
