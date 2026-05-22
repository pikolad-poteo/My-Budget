const { getUserFamily } = require('./family.service');
const { canEditBudget: roleCanEditBudget } = require('./family.permissions');

/**
 * Maps protected budget pages to their page-specific flash message keys.
 */
const FLASH_KEYS = {
  transactions: 'transactionFlash',
  categories: 'categoryFlash',
  wishlist: 'wishlistFlash',
  calendar: 'calendarFlash'
};

const DEFAULT_REDIRECTS = {
  transactions: '/transactions',
  categories: '/categories',
  wishlist: '/wishlist',
  calendar: '/calendar'
};

const VIEWER_BLOCK_MESSAGE = 'Your family role is Viewer. You can view shared budget data, but you cannot create, edit, or delete records.';

/**
 * A user outside a family owns a personal workspace and can edit it by default.
 */
function getCanEditBudget(family) {
  if (!family) return true;
  return roleCanEditBudget(family.role);
}

function setPageFlash(req, page, type, message) {
  const key = FLASH_KEYS[page];
  if (key) req.session[key] = { type, message };
}

/**
 * Builds a same-page fallback redirect without trusting arbitrary user-provided URLs.
 */
function getSafeRedirect(req, page) {
  const fallback = DEFAULT_REDIRECTS[page] || '/';
  const referrer = req.get('Referrer') || req.get('Referer');
  if (!referrer) return fallback;

  try {
    const url = new URL(referrer);
    return `${url.pathname}${url.search}` || fallback;
  } catch (error) {
    return fallback;
  }
}

/**
 * Express middleware that blocks Viewer users from mutating shared budget data.
 * Owners and Editors can continue to the protected route handler.
 */
function requireBudgetEditor(page) {
  return async function requireBudgetEditorMiddleware(req, res, next) {
    try {
      const currentUserId = req.session.user && req.session.user.id;
      if (!currentUserId) return res.redirect('/login');

      const family = await getUserFamily(currentUserId);
      req.userFamily = family;
      res.locals.family = family;
      res.locals.canEditBudget = getCanEditBudget(family);

      if (!getCanEditBudget(family)) {
        setPageFlash(req, page, 'error', VIEWER_BLOCK_MESSAGE);
        return res.redirect(getSafeRedirect(req, page));
      }

      return next();
    } catch (error) {
      console.error('Budget permission check error:', error.message);
      setPageFlash(req, page, 'error', 'Failed to check your family permissions.');
      return res.redirect(DEFAULT_REDIRECTS[page] || '/');
    }
  };
}

module.exports = {
  VIEWER_BLOCK_MESSAGE,
  getCanEditBudget,
  requireBudgetEditor
};
