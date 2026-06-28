/**
 * Global admin routes.
 * Provides technical overview, user status controls, family statistics and audit logs.
 */

const express = require('express');

const router = express.Router();
const { GLOBAL_ROLES, isGlobalAdmin, isSupportAdmin, requireAdminUser } = require('../scr/admin.middleware');
const {
  USER_STATUS_VALUES,
  GLOBAL_ROLE_VALUES,
  normalizeGlobalRole,
  getAdminDashboardStats,
  getLatestAuditLogs,
  getUsers,
  getUserDetails,
  getUserById,
  updateUserStatus,
  updateUserGlobalRole,
  getAuditLogs,
  getFamiliesOverview
} = require('../scr/admin.service');
const { safeAuditFromRequest } = require('../scr/audit.service');

function getAdminFlash(req) {
  const flash = req.session.adminFlash || null;
  delete req.session.adminFlash;
  return flash;
}

function setAdminFlash(req, type, message) {
  req.session.adminFlash = { type, message };
}

function canManageUserStatus(adminUser, targetUser) {
  if (!adminUser || !targetUser || adminUser.id === targetUser.id) {
    return false;
  }

  if (isGlobalAdmin(adminUser)) {
    return targetUser.global_role !== GLOBAL_ROLES.GLOBAL_ADMIN;
  }

  if (isSupportAdmin(adminUser)) {
    return targetUser.global_role === GLOBAL_ROLES.USER;
  }

  return false;
}

function canManageUserRole(adminUser, targetUser) {
  if (!adminUser || !targetUser || adminUser.id === targetUser.id) {
    return false;
  }

  if (!isGlobalAdmin(adminUser)) {
    return false;
  }

  return targetUser.global_role !== GLOBAL_ROLES.GLOBAL_ADMIN;
}

function getEditableRoleValues(adminUser, targetUser) {
  if (!canManageUserRole(adminUser, targetUser)) {
    return [];
  }

  // The project supports only one global administrator. Other admins can be support admins only.
  return [GLOBAL_ROLES.USER, GLOBAL_ROLES.SUPPORT_ADMIN];
}

function getBaseViewData(req, overrides = {}) {
  const flash = getAdminFlash(req);

  return {
    title: req.t('admin.title'),
    activePage: 'admin',
    adminUser: req.adminUser,
    isGlobalAdminUser: isGlobalAdmin(req.adminUser),
    isSupportAdminUser: isSupportAdmin(req.adminUser),
    statusValues: USER_STATUS_VALUES,
    roleValues: GLOBAL_ROLE_VALUES,
    canManageUserStatus: (targetUser) => canManageUserStatus(req.adminUser, targetUser),
    canManageUserRole: (targetUser) => canManageUserRole(req.adminUser, targetUser),
    getEditableRoleValues: (targetUser) => getEditableRoleValues(req.adminUser, targetUser),
    errorMessage: flash && flash.type === 'error' ? flash.message : '',
    successMessage: flash && flash.type === 'success' ? flash.message : '',
    ...overrides
  };
}

function parseUserId(req) {
  const userId = Number.parseInt(req.params.id, 10);
  return Number.isFinite(userId) && userId > 0 ? userId : 0;
}

// Scope admin access checks only to /admin routes. Non-admin pages must continue to reach pages.routes.js.
router.use('/admin', requireAdminUser);

router.get('/admin', async (req, res, next) => {
  try {
    const [stats, latestAuditLogs] = await Promise.all([
      getAdminDashboardStats(),
      getLatestAuditLogs(8)
    ]);

    return res.render('admin/index', getBaseViewData(req, {
      title: req.t('admin.dashboardTitle'),
      stats,
      latestAuditLogs
    }));
  } catch (error) {
    return next(error);
  }
});

router.get('/admin/users', async (req, res, next) => {
  try {
    const usersResult = await getUsers({
      search: req.query.q,
      status: req.query.status,
      role: req.query.role
    });

    return res.render('admin/users', getBaseViewData(req, {
      title: req.t('admin.usersTitle'),
      ...usersResult
    }));
  } catch (error) {
    return next(error);
  }
});

router.get('/admin/users/:id', async (req, res, next) => {
  try {
    const userId = parseUserId(req);
    const details = userId ? await getUserDetails(userId) : null;

    if (!details) {
      setAdminFlash(req, 'error', req.t('admin.messages.userNotFound'));
      return res.redirect('/admin/users');
    }

    return res.render('admin/user-detail', getBaseViewData(req, {
      title: `${details.user.name} | ${req.t('admin.usersTitle')}`,
      details
    }));
  } catch (error) {
    return next(error);
  }
});

router.post('/admin/users/:id/block', async (req, res, next) => {
  const userId = parseUserId(req);

  try {
    if (!userId) {
      setAdminFlash(req, 'error', req.t('admin.messages.userNotFound'));
      return res.redirect('/admin/users');
    }

    const targetUser = await getUserById(userId);

    if (!targetUser) {
      setAdminFlash(req, 'error', req.t('admin.messages.userNotFound'));
      return res.redirect('/admin/users');
    }

    if (!canManageUserStatus(req.adminUser, targetUser)) {
      setAdminFlash(req, 'error', req.t('admin.messages.cannotManageAdminUser'));
      return res.redirect(req.get('referer') || '/admin/users');
    }

    const updated = await updateUserStatus(userId, 'blocked');

    if (!updated) {
      setAdminFlash(req, 'error', req.t('admin.messages.userNotFound'));
      return res.redirect('/admin/users');
    }

    await safeAuditFromRequest(req, {
      action: 'ADMIN_BLOCKED_USER',
      entityType: 'user',
      entityId: userId,
      details: { targetUserId: userId, targetRole: targetUser.global_role }
    });

    setAdminFlash(req, 'success', req.t('admin.messages.userBlocked'));
    return res.redirect(req.get('referer') || '/admin/users');
  } catch (error) {
    return next(error);
  }
});

router.post('/admin/users/:id/unblock', async (req, res, next) => {
  const userId = parseUserId(req);

  try {
    if (!userId) {
      setAdminFlash(req, 'error', req.t('admin.messages.userNotFound'));
      return res.redirect('/admin/users');
    }

    const targetUser = await getUserById(userId);

    if (!targetUser) {
      setAdminFlash(req, 'error', req.t('admin.messages.userNotFound'));
      return res.redirect('/admin/users');
    }

    if (!canManageUserStatus(req.adminUser, targetUser)) {
      setAdminFlash(req, 'error', req.t('admin.messages.cannotManageAdminUser'));
      return res.redirect(req.get('referer') || '/admin/users');
    }

    const updated = await updateUserStatus(userId, 'active');

    if (!updated) {
      setAdminFlash(req, 'error', req.t('admin.messages.userNotFound'));
      return res.redirect('/admin/users');
    }

    await safeAuditFromRequest(req, {
      action: 'ADMIN_UNBLOCKED_USER',
      entityType: 'user',
      entityId: userId,
      details: { targetUserId: userId, targetRole: targetUser.global_role }
    });

    setAdminFlash(req, 'success', req.t('admin.messages.userUnblocked'));
    return res.redirect(req.get('referer') || '/admin/users');
  } catch (error) {
    return next(error);
  }
});

router.post('/admin/users/:id/role', async (req, res, next) => {
  const userId = parseUserId(req);
  const globalRole = normalizeGlobalRole(req.body.global_role, GLOBAL_ROLES.USER);

  try {
    if (!userId) {
      setAdminFlash(req, 'error', req.t('admin.messages.userNotFound'));
      return res.redirect('/admin/users');
    }

    const targetUser = await getUserById(userId);

    if (!targetUser) {
      setAdminFlash(req, 'error', req.t('admin.messages.userNotFound'));
      return res.redirect('/admin/users');
    }

    if (!canManageUserRole(req.adminUser, targetUser)) {
      setAdminFlash(req, 'error', req.t('admin.messages.cannotChangeAdminRole'));
      return res.redirect(req.get('referer') || '/admin/users');
    }

    if (globalRole === GLOBAL_ROLES.GLOBAL_ADMIN) {
      setAdminFlash(req, 'error', req.t('admin.messages.onlyOneGlobalAdmin'));
      return res.redirect(req.get('referer') || '/admin/users');
    }

    const updated = await updateUserGlobalRole(userId, globalRole);

    if (!updated) {
      setAdminFlash(req, 'error', req.t('admin.messages.userNotFound'));
      return res.redirect('/admin/users');
    }

    await safeAuditFromRequest(req, {
      action: 'ADMIN_CHANGED_ROLE',
      entityType: 'user',
      entityId: userId,
      details: { targetUserId: userId, oldRole: targetUser.global_role, newRole: globalRole }
    });

    setAdminFlash(req, 'success', req.t('admin.messages.roleUpdated'));
    return res.redirect(req.get('referer') || '/admin/users');
  } catch (error) {
    return next(error);
  }
});

router.get('/admin/families', async (req, res, next) => {
  try {
    const families = await getFamiliesOverview();

    return res.render('admin/families', getBaseViewData(req, {
      title: req.t('admin.familiesTitle'),
      families
    }));
  } catch (error) {
    return next(error);
  }
});

router.get('/admin/audit', async (req, res, next) => {
  try {
    const auditResult = await getAuditLogs({
      action: req.query.action,
      entityType: req.query.entityType,
      ip: req.query.ip,
      userId: req.query.userId,
      familyId: req.query.familyId,
      dateFrom: req.query.dateFrom,
      dateTo: req.query.dateTo
    });

    return res.render('admin/audit', getBaseViewData(req, {
      title: req.t('admin.auditTitle'),
      ...auditResult
    }));
  } catch (error) {
    return next(error);
  }
});

router.get('/admin/system', async (req, res) => {
  const systemInfo = {
    nodeEnv: process.env.NODE_ENV || 'development',
    nodeVersion: process.version,
    appVersion: require('../package.json').version,
    csrfDisabled: process.env.CSRF_DISABLED === 'true'
  };

  return res.render('admin/system', getBaseViewData(req, {
    title: req.t('admin.systemTitle'),
    systemInfo
  }));
});

module.exports = router;
