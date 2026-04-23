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
  if (value === 'family' && family) {
    return 'family';
  }

  return 'personal';
}

function sanitizeCategoryColor(value = '') {
  const color = String(value || '').trim();
  return /^#[0-9a-fA-F]{6}$/.test(color) ? color : '#6c757d';
}

function sanitizeCategoryIcon(value = '') {
  const icon = String(value || '').trim().toLowerCase();
  return ALLOWED_CATEGORY_ICONS.has(icon) ? icon : 'tag';
}

function buildCategoriesRedirect(req, fallbackTab = 'expense') {
  const params = new URLSearchParams();

  const rawTab =
    req.body.redirectTab ||
    req.query.tab ||
    fallbackTab;

  const safeTab = rawTab === 'income' ? 'income' : 'expense';
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

async function getUserCategories(userId, familyId = null, searchTerm = '') {
  const params = [userId];

  let query = `
    SELECT id, user_id, family_id, name, type, color, icon
    FROM categories
    WHERE (user_id = ?
  `;

  if (familyId) {
    query += ' OR family_id = ?';
    params.push(familyId);
  }

  query += ')';

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
  let query = `
    SELECT id, user_id, family_id, name, type, color, icon
    FROM categories
    WHERE id = ?
      AND (
        user_id = ?
  `;
  const params = [categoryId, userId];

  if (familyId) {
    query += ' OR family_id = ?';
    params.push(familyId);
  }

  query += ') LIMIT 1';

  const [rows] = await db.query(query, params);
  return rows[0] || null;
}

async function findDuplicateCategory({
  userId,
  familyId,
  name,
  type,
  excludeId = null
}) {
  const params = [name, type];
  let query = `
    SELECT id
    FROM categories
    WHERE LOWER(name) = LOWER(?)
      AND type = ?
  `;

  if (familyId) {
    query += ' AND family_id = ?';
    params.push(familyId);
  } else {
    query += ' AND user_id = ? AND family_id IS NULL';
    params.push(userId);
  }

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
  sanitizeCategoryColor,
  sanitizeCategoryIcon,
  buildCategoriesRedirect,
  setCategoryFlash,
  getUserCategories,
  getCategoryByIdForUser,
  findDuplicateCategory
};