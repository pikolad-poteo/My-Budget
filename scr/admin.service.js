/**
 * Data helpers for the global admin panel.
 * The admin panel intentionally exposes mostly technical statistics and user
 * status controls, not detailed private finance records.
 */

const db = require('./db');
const { USER_STATUSES } = require('./auth.validation');
const { GLOBAL_ROLES } = require('./admin.middleware');

const USER_STATUS_VALUES = Object.values(USER_STATUSES);
const GLOBAL_ROLE_VALUES = Object.values(GLOBAL_ROLES);
const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;

function toPositiveInt(value, fallback = 1) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function normalizeLimit(value, fallback = DEFAULT_PAGE_SIZE) {
  const parsed = toPositiveInt(value, fallback);
  return Math.min(MAX_PAGE_SIZE, parsed);
}

function normalizeOffset(value) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function normalizeUserStatus(status, fallback = 'all') {
  return USER_STATUS_VALUES.includes(status) ? status : fallback;
}

function normalizeGlobalRole(role, fallback = 'all') {
  return GLOBAL_ROLE_VALUES.includes(role) ? role : fallback;
}

function normalizeSearch(search) {
  return String(search || '').trim().slice(0, 150);
}

function normalizeDate(value) {
  const text = String(value || '').trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : '';
}

async function getScalar(sql, params = []) {
  const [rows] = await db.query(sql, params);
  const firstRow = rows[0] || {};
  const firstKey = Object.keys(firstRow)[0];
  return Number(firstRow[firstKey] || 0);
}

async function getAdminDashboardStats() {
  const [statsRows] = await db.query(
    `
    SELECT
      (SELECT COUNT(*) FROM users) AS total_users,
      (SELECT COUNT(*) FROM users WHERE status = 'active') AS active_users,
      (SELECT COUNT(*) FROM users WHERE status = 'blocked') AS blocked_users,
      (SELECT COUNT(*) FROM users WHERE status = 'deleted') AS deleted_users,
      (SELECT COUNT(*) FROM users WHERE global_role = 'global_admin') AS global_admins,
      (SELECT COUNT(*) FROM families) AS total_families,
      (SELECT COUNT(*) FROM transactions) AS total_transactions,
      (SELECT COUNT(*) FROM wishlist_items) AS total_wishlist_items,
      (SELECT COUNT(*) FROM calendar_events) AS total_calendar_events,
      (SELECT COUNT(*) FROM users WHERE created_at >= DATE_FORMAT(CURDATE(), '%Y-%m-01')) AS new_users_this_month,
      (SELECT COUNT(*) FROM audit_logs WHERE action = 'USER_LOGIN_FAILED' AND created_at >= DATE_FORMAT(CURDATE(), '%Y-%m-01')) AS failed_logins_this_month
    `
  );

  return statsRows[0] || {};
}

async function getLatestAuditLogs(limit = 10) {
  const safeLimit = normalizeLimit(limit, 10);

  const [rows] = await db.query(
    `
    SELECT
      al.id,
      al.user_id,
      al.family_id,
      al.action,
      al.entity_type,
      al.entity_id,
      al.ip_address,
      al.user_agent,
      al.details,
      al.created_at,
      u.name AS user_name,
      u.email AS user_email,
      f.name AS family_name
    FROM audit_logs al
    LEFT JOIN users u ON u.id = al.user_id
    LEFT JOIN families f ON f.id = al.family_id
    ORDER BY al.created_at DESC, al.id DESC
    LIMIT ?
    `,
    [safeLimit]
  );

  return rows;
}

function buildUserFilters(filters = {}) {
  const search = normalizeSearch(filters.search);
  const status = normalizeUserStatus(filters.status);
  const role = normalizeGlobalRole(filters.role);
  const where = [];
  const params = [];

  if (search) {
    where.push('(u.name LIKE ? OR u.email LIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }

  if (status !== 'all') {
    where.push('u.status = ?');
    params.push(status);
  }

  if (role !== 'all') {
    where.push('u.global_role = ?');
    params.push(role);
  }

  return {
    search,
    status,
    role,
    whereClause: where.length ? `WHERE ${where.join(' AND ')}` : '',
    params
  };
}

async function getUsers(filters = {}) {
  const built = buildUserFilters(filters);
  const limit = normalizeLimit(filters.limit);
  const offset = normalizeOffset(filters.offset);

  const [rows] = await db.query(
    `
    SELECT
      u.id,
      u.name,
      u.email,
      u.status,
      u.global_role,
      u.email_verified_at,
      u.last_login_at,
      u.last_login_ip,
      u.created_at,
      COUNT(DISTINCT fm.family_id) AS families_count
    FROM users u
    LEFT JOIN family_members fm ON fm.user_id = u.id
    ${built.whereClause}
    GROUP BY u.id
    ORDER BY u.created_at DESC, u.id DESC
    LIMIT ? OFFSET ?
    `,
    [...built.params, limit, offset]
  );

  const total = await getScalar(
    `SELECT COUNT(*) AS total FROM users u ${built.whereClause}`,
    built.params
  );

  return {
    users: rows,
    total,
    filters: {
      search: built.search,
      status: built.status,
      role: built.role,
      limit,
      offset
    }
  };
}

async function getUserById(userId) {
  const [rows] = await db.query(
    `
    SELECT
      id,
      name,
      email,
      pending_email,
      avatar_url,
      email_verified_at,
      status,
      global_role,
      last_login_at,
      last_login_ip,
      created_at
    FROM users
    WHERE id = ?
    LIMIT 1
    `,
    [userId]
  );

  return rows[0] || null;
}

async function getUserFamilyMemberships(userId) {
  const [rows] = await db.query(
    `
    SELECT
      f.id,
      f.name,
      fm.role,
      fm.joined_at,
      f.owner_user_id
    FROM family_members fm
    INNER JOIN families f ON f.id = fm.family_id
    WHERE fm.user_id = ?
    ORDER BY fm.joined_at DESC
    `,
    [userId]
  );

  return rows;
}

async function getAuditLogsForUser(userId, limit = 20) {
  const safeLimit = normalizeLimit(limit, 20);

  const [rows] = await db.query(
    `
    SELECT id, action, entity_type, entity_id, ip_address, details, created_at
    FROM audit_logs
    WHERE user_id = ?
    ORDER BY created_at DESC, id DESC
    LIMIT ?
    `,
    [userId, safeLimit]
  );

  return rows;
}

async function getUserDetails(userId) {
  const user = await getUserById(userId);

  if (!user) {
    return null;
  }

  const [memberships, recentAuditLogs] = await Promise.all([
    getUserFamilyMemberships(userId),
    getAuditLogsForUser(userId)
  ]);

  return {
    user,
    memberships,
    recentAuditLogs
  };
}

async function updateUserStatus(userId, status) {
  const normalizedStatus = normalizeUserStatus(status, 'active');
  const [result] = await db.query(
    'UPDATE users SET status = ? WHERE id = ? LIMIT 1',
    [normalizedStatus, userId]
  );

  return result.affectedRows > 0;
}

async function updateUserGlobalRole(userId, globalRole) {
  const normalizedRole = normalizeGlobalRole(globalRole, GLOBAL_ROLES.USER);
  const [result] = await db.query(
    'UPDATE users SET global_role = ? WHERE id = ? LIMIT 1',
    [normalizedRole, userId]
  );

  return result.affectedRows > 0;
}

function buildAuditFilters(filters = {}) {
  const action = String(filters.action || '').trim().slice(0, 100);
  const entityType = String(filters.entityType || '').trim().slice(0, 100);
  const ip = String(filters.ip || '').trim().slice(0, 45);
  const userId = filters.userId ? toPositiveInt(filters.userId, 0) : 0;
  const familyId = filters.familyId ? toPositiveInt(filters.familyId, 0) : 0;
  const dateFrom = normalizeDate(filters.dateFrom);
  const dateTo = normalizeDate(filters.dateTo);
  const where = [];
  const params = [];

  if (action) {
    where.push('al.action = ?');
    params.push(action);
  }

  if (entityType) {
    where.push('al.entity_type = ?');
    params.push(entityType);
  }

  if (ip) {
    where.push('al.ip_address LIKE ?');
    params.push(`%${ip}%`);
  }

  if (userId) {
    where.push('al.user_id = ?');
    params.push(userId);
  }

  if (familyId) {
    where.push('al.family_id = ?');
    params.push(familyId);
  }

  if (dateFrom) {
    where.push('DATE(al.created_at) >= ?');
    params.push(dateFrom);
  }

  if (dateTo) {
    where.push('DATE(al.created_at) <= ?');
    params.push(dateTo);
  }

  return {
    action,
    entityType,
    ip,
    userId: userId || '',
    familyId: familyId || '',
    dateFrom,
    dateTo,
    whereClause: where.length ? `WHERE ${where.join(' AND ')}` : '',
    params
  };
}

async function getAuditLogs(filters = {}) {
  const built = buildAuditFilters(filters);
  const limit = normalizeLimit(filters.limit, 100);
  const offset = normalizeOffset(filters.offset);

  const [rows] = await db.query(
    `
    SELECT
      al.id,
      al.user_id,
      al.family_id,
      al.action,
      al.entity_type,
      al.entity_id,
      al.ip_address,
      al.user_agent,
      al.details,
      al.created_at,
      u.name AS user_name,
      u.email AS user_email,
      f.name AS family_name
    FROM audit_logs al
    LEFT JOIN users u ON u.id = al.user_id
    LEFT JOIN families f ON f.id = al.family_id
    ${built.whereClause}
    ORDER BY al.created_at DESC, al.id DESC
    LIMIT ? OFFSET ?
    `,
    [...built.params, limit, offset]
  );

  const total = await getScalar(
    `SELECT COUNT(*) AS total FROM audit_logs al ${built.whereClause}`,
    built.params
  );

  return {
    logs: rows,
    total,
    filters: {
      action: built.action,
      entityType: built.entityType,
      ip: built.ip,
      userId: built.userId,
      familyId: built.familyId,
      dateFrom: built.dateFrom,
      dateTo: built.dateTo,
      limit,
      offset
    }
  };
}

async function getFamiliesOverview() {
  const [rows] = await db.query(
    `
    SELECT
      f.id,
      f.name,
      f.created_at,
      owner.name AS owner_name,
      owner.email AS owner_email,
      COUNT(DISTINCT fm.user_id) AS members_count,
      COUNT(DISTINCT t.id) AS transactions_count,
      COUNT(DISTINCT wi.id) AS wishlist_items_count,
      COUNT(DISTINCT ce.id) AS calendar_events_count
    FROM families f
    LEFT JOIN users owner ON owner.id = f.owner_user_id
    LEFT JOIN family_members fm ON fm.family_id = f.id
    LEFT JOIN transactions t ON t.family_id = f.id
    LEFT JOIN wishlist_items wi ON wi.family_id = f.id
    LEFT JOIN calendar_events ce ON ce.family_id = f.id
    GROUP BY f.id
    ORDER BY f.created_at DESC, f.id DESC
    LIMIT 100
    `
  );

  return rows;
}

module.exports = {
  USER_STATUS_VALUES,
  GLOBAL_ROLE_VALUES,
  normalizeUserStatus,
  normalizeGlobalRole,
  getAdminDashboardStats,
  getLatestAuditLogs,
  getUsers,
  getUserById,
  getUserDetails,
  updateUserStatus,
  updateUserGlobalRole,
  getAuditLogs,
  getFamiliesOverview
};
