/**
 * Admin middleware.
 * Checks the current session against the database so blocked or demoted users
 * cannot keep admin access through an old session snapshot.
 */

const db = require('./db');
const { renderForbidden } = require('./middleware');
const { USER_STATUSES } = require('./auth.validation');

const GLOBAL_ROLES = Object.freeze({
  USER: 'user',
  SUPPORT_ADMIN: 'support_admin',
  GLOBAL_ADMIN: 'global_admin'
});

const ADMIN_ROLES = Object.freeze([
  GLOBAL_ROLES.GLOBAL_ADMIN,
  GLOBAL_ROLES.SUPPORT_ADMIN
]);

function isGlobalAdmin(user = {}) {
  return user.status === USER_STATUSES.ACTIVE && user.global_role === GLOBAL_ROLES.GLOBAL_ADMIN;
}

function isSupportAdmin(user = {}) {
  return user.status === USER_STATUSES.ACTIVE && user.global_role === GLOBAL_ROLES.SUPPORT_ADMIN;
}

function isAdminUser(user = {}) {
  return user.status === USER_STATUSES.ACTIVE && ADMIN_ROLES.includes(user.global_role);
}

async function loadAdminUser(userId) {
  const [rows] = await db.query(
    `
    SELECT id, name, email, avatar_url, status, global_role
    FROM users
    WHERE id = ?
    LIMIT 1
    `,
    [userId]
  );

  return rows[0] || null;
}

async function requireAdminUser(req, res, next) {
  if (!req.session.user) {
    return res.redirect('/login');
  }

  try {
    const adminUser = await loadAdminUser(req.session.user.id);

    if (!adminUser || !isAdminUser(adminUser)) {
      return renderForbidden(
        req,
        res,
        req.t ? req.t('admin.messages.accessDenied') : 'Only administrators can open this page.'
      );
    }

    req.adminUser = adminUser;
    req.session.user = {
      ...req.session.user,
      name: adminUser.name,
      email: adminUser.email,
      avatar_url: adminUser.avatar_url || null,
      global_role: adminUser.global_role
    };

    return next();
  } catch (error) {
    return next(error);
  }
}

async function requireGlobalAdmin(req, res, next) {
  if (!req.session.user) {
    return res.redirect('/login');
  }

  try {
    const adminUser = await loadAdminUser(req.session.user.id);

    if (!adminUser || !isGlobalAdmin(adminUser)) {
      return renderForbidden(
        req,
        res,
        req.t ? req.t('admin.messages.globalAdminOnly') : 'Only the global administrator can perform this action.'
      );
    }

    req.adminUser = adminUser;
    req.session.user = {
      ...req.session.user,
      name: adminUser.name,
      email: adminUser.email,
      avatar_url: adminUser.avatar_url || null,
      global_role: adminUser.global_role
    };

    return next();
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  GLOBAL_ROLES,
  ADMIN_ROLES,
  isGlobalAdmin,
  isSupportAdmin,
  isAdminUser,
  requireAdminUser,
  requireGlobalAdmin,
  loadAdminUser
};
