/**
 * Category utility helpers.
 * Contains validation, sanitization, redirect helpers,
 * flash helpers, and database query helpers for category operations.
 */

const db = require('./db');
const { CATEGORY_ICON_OPTIONS } = require('./category.constants');

const ALLOWED_CATEGORY_ICONS = new Set(CATEGORY_ICON_OPTIONS);

function sanitizeCategoryName(value = '') {
  return String(value).trim().replace(/\s+/g, ' ').slice(0, 100);
}

function sanitizeCategoryType(value = '') {
  return value === 'income' ? 'income' : 'expense';
}

function sanitizeCategoryScope(value = '', family) {
  return family ? 'family' : 'personal';
}

function getWorkspaceClause(alias = '') {
  const prefix = alias ? `${alias}.` : '';

  return {
    family: `${prefix}family_id = ?`,
    personal: `${prefix}user_id = ? AND ${prefix}family_id IS NULL`
  };
}

/**
 * Selects either the shared family workspace or the user's personal workspace.
 */
function getWorkspaceCondition(userId, familyId = null, alias = '') {
  const clauses = getWorkspaceClause(alias);

  if (familyId) {
    return {
      clause: clauses.family,
      params: [familyId]
    };
  }

  return {
    clause: clauses.personal,
    params: [userId]
  };
}

function sanitizeCategoryColor(value = '') {
  const color = String(value || '').trim();
  return /^#[0-9a-fA-F]{6}$/.test(color) ? color : '#6c757d';
}

function sanitizeCategoryIcon(value = '') {
  const icon = String(value || '').trim().toLowerCase();
  return ALLOWED_CATEGORY_ICONS.has(icon) ? icon : 'tag';
}

function sanitizeCategoryDashboardFeatured(value = '') {
  return value === '1' || value === 'on' || value === true ? 1 : 0;
}

/**
 * Preserves the active tab and search query after category form submissions.
 */
function buildCategoriesRedirect(req, fallbackTab = 'expense') {
  const params = new URLSearchParams();

  const rawTab =
    req.body.redirectTab ||
    req.query.tab ||
    fallbackTab;

  const safeTab = ['all', 'expense', 'income'].includes(rawTab) ? rawTab : 'all';
  params.set('tab', safeTab);

  const rawQuery = String(req.body.redirectQuery || req.query.q || '').trim();
  if (rawQuery) {
    params.set('q', rawQuery);
  }

  return `/categories?${params.toString()}`;
}

function setCategoryFlash(req, type, message) {
  req.session.categoryFlash = { type, message };
}

/**
 * Reads categories from the active workspace with optional name filtering.
 */
async function getUserCategories(userId, familyId = null, searchTerm = '') {
  const workspace = getWorkspaceCondition(userId, familyId);
  const params = [...workspace.params];

  let query = `
    SELECT id, user_id, family_id, name, type, color, icon, dashboard_featured
    FROM categories
    WHERE ${workspace.clause}
  `;

  const normalizedSearch = (searchTerm || '').trim();

  if (normalizedSearch) {
    query += ' AND name LIKE ?';
    params.push(`%${normalizedSearch}%`);
  }

  query += `
    ORDER BY
      CASE WHEN type = 'expense' THEN 0 ELSE 1 END,
      name ASC
  `;

  const [rows] = await db.query(query, params);
  return rows;
}

async function getCategoryByIdForUser(categoryId, userId, familyId = null) {
  const workspace = getWorkspaceCondition(userId, familyId);

  const [rows] = await db.query(
    `
    SELECT id, user_id, family_id, name, type, color, icon, dashboard_featured
    FROM categories
    WHERE id = ?
      AND ${workspace.clause}
    LIMIT 1
    `,
    [categoryId, ...workspace.params]
  );

  return rows[0] || null;
}

/**
 * Prevents duplicate category names inside the same workspace and category type.
 */
async function findDuplicateCategory({
  userId,
  familyId,
  name,
  type,
  excludeId = null
}) {
  const workspace = getWorkspaceCondition(userId, familyId);
  const params = [name, type, ...workspace.params];

  let query = `
    SELECT id
    FROM categories
    WHERE LOWER(name) = LOWER(?)
      AND type = ?
      AND ${workspace.clause}
  `;

  if (excludeId) {
    query += ' AND id <> ?';
    params.push(excludeId);
  }

  query += ' LIMIT 1';

  const [rows] = await db.query(query, params);
  return rows[0] || null;
}

module.exports = {
  sanitizeCategoryName,
  sanitizeCategoryType,
  sanitizeCategoryScope,
  getWorkspaceCondition,
  sanitizeCategoryColor,
  sanitizeCategoryIcon,
  sanitizeCategoryDashboardFeatured,
  buildCategoriesRedirect,
  setCategoryFlash,
  getUserCategories,
  getCategoryByIdForUser,
  findDuplicateCategory
};
