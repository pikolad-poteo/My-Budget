const db = require('./db');
const { getUserCategories, sanitizeCategoryType } = require('./category.utils');

function sanitizeTransactionType(value = '') {
  return sanitizeCategoryType(value);
}

function sanitizeTransactionDescription(value = '') {
  return String(value || '').trim().replace(/\s+/g, ' ').slice(0, 255);
}

function sanitizeTransactionAmount(value = '') {
  const normalized = String(value || '').replace(',', '.').trim();
  const amount = Number(normalized);

  if (!Number.isFinite(amount) || amount <= 0) {
    return null;
  }

  return Number(amount.toFixed(2));
}

function sanitizeTransactionDate(value = '') {
  const raw = String(value || '').trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : new Date().toISOString().slice(0, 10);
}

function sanitizeTransactionMemberId(value = '') {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function sanitizeTransactionCategoryId(value = '') {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function sanitizeTransactionFilterType(value = '') {
  if (value === 'income' || value === 'expense') {
    return value;
  }

  return 'all';
}

function sanitizeTransactionFilterScope(value = '') {
  return value === 'family' ? 'family' : value === 'personal' ? 'personal' : 'all';
}

function sanitizeTransactionView(value = '') {
  if (value === 'expenses') return 'expenses';
  if (value === 'income') return 'income';
  return 'date';
}

function sanitizeTransactionSortDir(value = '') {
  return value === 'asc' ? 'asc' : 'desc';
}

function buildTransactionsRedirect(req) {
  const params = new URLSearchParams();

  const fields = [
    ['from', req.body.redirectFrom || req.query.from || ''],
    ['to', req.body.redirectTo || req.query.to || ''],
    ['category', req.body.redirectCategory || req.query.category || 'all'],
    ['type', req.body.redirectType || req.query.type || 'all'],
    ['scope', req.body.redirectScope || req.query.scope || 'all'],
    ['member', req.body.redirectMember || req.query.member || 'all'],
    ['view', req.body.redirectView || req.query.view || 'date'],
    ['dir', req.body.redirectDir || req.query.dir || 'desc']
  ];

  for (const [key, rawValue] of fields) {
    const value = String(rawValue || '').trim();

    if (value) {
      params.set(key, value);
    }
  }

  const queryString = params.toString();
  return queryString ? `/transactions?${queryString}` : '/transactions';
}

function setTransactionFlash(req, type, message) {
  req.session.transactionFlash = { type, message };
}

function getDefaultTransactionDates() {
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  return {
    from: firstDay.toISOString().slice(0, 10),
    to: lastDay.toISOString().slice(0, 10)
  };
}

async function getAvailableTransactionCategories(userId, familyId = null) {
  const categories = await getUserCategories(userId, familyId, '');

  return categories.map((category) => ({
    ...category,
    scope: category.family_id ? 'family' : 'personal'
  }));
}

async function getAvailableTransactionMembers(userId, family = null) {
  if (!family) {
    const [rows] = await db.query(
      `
      SELECT id, name, email
      FROM users
      WHERE id = ?
      LIMIT 1
      `,
      [userId]
    );

    return rows;
  }

  const [rows] = await db.query(
    `
    SELECT u.id, u.name, u.email, fm.role
    FROM family_members fm
    INNER JOIN users u ON u.id = fm.user_id
    WHERE fm.family_id = ?
    ORDER BY CASE WHEN fm.role = 'owner' THEN 0 ELSE 1 END, u.name ASC
    `,
    [family.id]
  );

  return rows;
}

async function getTransactionByIdForUser(transactionId, userId, familyId = null) {
  let query = `
    SELECT
      t.id,
      t.user_id,
      t.family_id,
      t.category_id,
      t.type,
      t.amount,
      t.description,
      DATE_FORMAT(t.transaction_date, '%Y-%m-%d') AS transaction_date,
      t.paid_by_user_id
    FROM transactions t
    WHERE t.id = ?
      AND (
        t.user_id = ?
  `;

  const params = [transactionId, userId];

  if (familyId) {
    query += ' OR t.family_id = ?';
    params.push(familyId);
  }

  query += ') LIMIT 1';

  const [rows] = await db.query(query, params);
  return rows[0] || null;
}

async function getTransactionsForUser({
  userId,
  familyId = null,
  filters
}) {
  const params = [userId];

  let query = `
    SELECT
      t.id,
      t.user_id,
      t.family_id,
      t.category_id,
      t.type,
      t.amount,
      t.description,
      DATE_FORMAT(t.transaction_date, '%Y-%m-%d') AS transaction_date,
      t.paid_by_user_id,
      c.name AS category_name,
      c.color AS category_color,
      c.icon AS category_icon,
      c.family_id AS category_family_id,
      u.name AS paid_by_name
    FROM transactions t
    INNER JOIN categories c ON c.id = t.category_id
    LEFT JOIN users u ON u.id = t.paid_by_user_id
    WHERE (
      t.user_id = ?
  `;

  if (familyId) {
    query += ' OR t.family_id = ?';
    params.push(familyId);
  }

  query += ')';

  if (filters.from) {
    query += ' AND t.transaction_date >= ?';
    params.push(filters.from);
  }

  if (filters.to) {
    query += ' AND t.transaction_date <= ?';
    params.push(filters.to);
  }

  if (filters.categoryId) {
    query += ' AND t.category_id = ?';
    params.push(filters.categoryId);
  }

  if (filters.type !== 'all') {
    query += ' AND t.type = ?';
    params.push(filters.type);
  }

  if (filters.scope === 'family') {
    query += ' AND t.family_id IS NOT NULL';
  } else if (filters.scope === 'personal') {
    query += ' AND t.family_id IS NULL';
  }

  if (filters.memberId) {
    query += ' AND t.paid_by_user_id = ?';
    params.push(filters.memberId);
  }

  const sortDir = filters.dir === 'asc' ? 'ASC' : 'DESC';

  if (filters.view === 'expenses' || filters.view === 'income') {
    query += ` ORDER BY ABS(t.amount) ${sortDir}, t.transaction_date DESC, t.id DESC`;
  } else {
    query += ` ORDER BY t.transaction_date ${sortDir}, t.id ${sortDir}`;
  }

  const [rows] = await db.query(query, params);
  return rows;
}

module.exports = {
  sanitizeTransactionType,
  sanitizeTransactionDescription,
  sanitizeTransactionAmount,
  sanitizeTransactionDate,
  sanitizeTransactionMemberId,
  sanitizeTransactionCategoryId,
  sanitizeTransactionFilterType,
  sanitizeTransactionFilterScope,
  sanitizeTransactionView,
  sanitizeTransactionSortDir,
  buildTransactionsRedirect,
  setTransactionFlash,
  getDefaultTransactionDates,
  getAvailableTransactionCategories,
  getAvailableTransactionMembers,
  getTransactionByIdForUser,
  getTransactionsForUser
};