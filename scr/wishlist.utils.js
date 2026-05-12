const db = require('./db');
const { getWorkspaceCondition } = require('./category.utils');

const WISHLIST_STATUSES = ['planned', 'postponed', 'bought', 'cancelled'];
const WISHLIST_SORTS = ['newest', 'oldest', 'price_desc', 'price_asc'];

function sanitizeWishlistText(value, maxLength = 255) {
  const source = Array.isArray(value) ? [...value].reverse().find((entry) => String(entry || '').trim()) : value;
  return String(source || '').trim().slice(0, maxLength);
}
function normalizeWishlistFolderName(value) {
  const raw = sanitizeWishlistText(value, 100);
  if (!raw) return '';
  const parts = raw.split(',').map((part) => sanitizeWishlistText(part, 100)).filter(Boolean);
  const clean = parts.length > 1 ? parts.filter((part) => !['all', 'general'].includes(part.toLowerCase())).pop() || parts.pop() : raw;
  return ['all', 'general'].includes(String(clean || '').toLowerCase()) ? '' : clean;
}
function sanitizeWishlistAmount(value) { const amount = Number.parseFloat(value); if (Number.isNaN(amount) || amount <= 0) return null; return Math.round(amount * 100) / 100; }
function sanitizeWishlistStatus(value) { return WISHLIST_STATUSES.includes(value) ? value : 'planned'; }
function sanitizeWishlistFilterStatus(value) { return WISHLIST_STATUSES.includes(value) ? value : 'all'; }
function sanitizeWishlistSort(value) { return WISHLIST_SORTS.includes(value) ? value : 'newest'; }
function sanitizeWishlistDate(value) { const date = String(value || '').trim(); if (!date) return null; return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null; }
function sanitizeWishlistUrl(value) { const url = String(value || '').trim(); if (!url) return null; if (url.startsWith('/uploads/wishlist/')) return url.slice(0, 1000); if (url.startsWith('http://') || url.startsWith('https://')) return url.slice(0, 1000); return `https://${url}`.slice(0, 1000); }
function setWishlistFlash(req, type, message) { req.session.wishlistFlash = { type, message }; }
function buildWishlistRedirect(req, fallback = '/wishlist') { const params = new URLSearchParams(); ['status','folder','q','sort'].forEach((key)=>{ if(req.body&&req.body[key]) params.set(key, req.body[key]); if(req.query&&req.query[key]) params.set(key, req.query[key]); }); const query=params.toString(); return query ? `${fallback}?${query}` : fallback; }

function getWishlistOrderBy(sort) { switch (sort) { case 'oldest': return 'w.created_at ASC'; case 'price_desc': return 'w.amount DESC, w.created_at DESC'; case 'price_asc': return 'w.amount ASC, w.created_at DESC'; default: return 'w.created_at DESC'; } }

async function getWishlistItemsForUser({ userId, familyId, filters }) {
  const workspace = getWorkspaceCondition(userId, familyId, 'w');
  const params = [...workspace.params];
  let query = `SELECT w.* FROM wishlist_items w WHERE ${workspace.clause}`;
  if (filters.status !== 'all') { query += ' AND w.status = ?'; params.push(filters.status); }
  if (filters.folder !== 'all') { query += ' AND w.folder = ?'; params.push(filters.folder); }
  if (filters.q) { query += ' AND (w.title LIKE ? OR w.description LIKE ? OR w.folder LIKE ?)'; params.push(`%${filters.q}%`, `%${filters.q}%`, `%${filters.q}%`); }
  query += ` ORDER BY ${getWishlistOrderBy(filters.sort)}`;
  const [rows] = await db.query(query, params);
  return rows;
}

async function getWishlistItemByIdForUser(itemId, userId, familyId) {
  const workspace = getWorkspaceCondition(userId, familyId);
  const [rows] = await db.query(
    `SELECT * FROM wishlist_items WHERE id = ? AND ${workspace.clause} LIMIT 1`,
    [itemId, ...workspace.params]
  );
  return rows[0] || null;
}

async function getWishlistFoldersForUser(userId, familyId) {
  const workspace = getWorkspaceCondition(userId, familyId);
  const [itemRows] = await db.query(
    `SELECT DISTINCT folder AS name FROM wishlist_items WHERE folder IS NOT NULL AND folder != '' AND ${workspace.clause}`,
    workspace.params
  );
  let folderRows = [];
  try {
    const [rows] = await db.query(
      `SELECT DISTINCT name FROM wishlist_folders WHERE name IS NOT NULL AND name != '' AND ${workspace.clause}`,
      workspace.params
    );
    folderRows = rows;
  } catch (error) { folderRows = []; }
  const folderSet = new Set();
  [...folderRows, ...itemRows].forEach((row) => {
    const name = normalizeWishlistFolderName(row.name);
    if (name) folderSet.add(name);
  });
  return [...folderSet].sort((a, b) => a.localeCompare(b));
}

async function ensureWishlistFolder(userId, familyId, folderName) {
  const name = normalizeWishlistFolderName(folderName);
  if (!name) return;
  try { await db.query('INSERT IGNORE INTO wishlist_folders (user_id, family_id, name) VALUES (?, ?, ?)', [userId, familyId || null, name]); } catch (error) {}
}

async function renameWishlistFolder({ userId, familyId, oldName, newName }) {
  const cleanOldName = normalizeWishlistFolderName(oldName);
  const cleanNewName = normalizeWishlistFolderName(newName);
  await ensureWishlistFolder(userId, familyId, cleanNewName);
  const workspace = getWorkspaceCondition(userId, familyId);
  await db.query(
    `UPDATE wishlist_items SET folder = ? WHERE folder = ? AND ${workspace.clause}`,
    [cleanNewName, cleanOldName, ...workspace.params]
  );
  try {
    await db.query(
      `DELETE FROM wishlist_folders WHERE name = ? AND ${workspace.clause}`,
      [cleanOldName, ...workspace.params]
    );
  } catch (error) {}
}

async function deleteWishlistFolder({ userId, familyId, folderName, deleteAction }) {
  const cleanFolderName = normalizeWishlistFolderName(folderName);
  const workspace = getWorkspaceCondition(userId, familyId);
  if (deleteAction === 'delete_items') {
    await db.query(
      `DELETE FROM wishlist_items WHERE folder = ? AND ${workspace.clause}`,
      [cleanFolderName, ...workspace.params]
    );
  } else {
    await db.query(
      `UPDATE wishlist_items SET folder = ? WHERE folder = ? AND ${workspace.clause}`,
      [null, cleanFolderName, ...workspace.params]
    );
  }
  try {
    await db.query(
      `DELETE FROM wishlist_folders WHERE name = ? AND ${workspace.clause}`,
      [cleanFolderName, ...workspace.params]
    );
  } catch (error) {}
}

async function getCurrentBalanceForUser(userId, familyId) {
  const workspace = getWorkspaceCondition(userId, familyId);
  const [rows] = await db.query(
    `SELECT COALESCE(SUM(amount), 0) AS balance FROM transactions WHERE ${workspace.clause}`,
    workspace.params
  );
  return Number(rows[0].balance || 0);
}

function buildWishlistSummary(items, balance) {
  return items.reduce((acc, item) => {
    const amount = Number(item.amount || 0);
    acc.totalItems += 1;
    if (item.status === 'planned') { acc.plannedTotal += amount; acc.plannedCount += 1; }
    if (item.status === 'postponed') acc.postponedTotal += amount;
    if (item.status === 'bought') { acc.boughtTotal += amount; acc.boughtCount += 1; }
    acc.balanceAfterPlans = acc.balance - acc.plannedTotal;
    return acc;
  }, { balance, totalItems: 0, plannedTotal: 0, postponedTotal: 0, boughtTotal: 0, plannedCount: 0, boughtCount: 0, balanceAfterPlans: balance });
}

module.exports = { sanitizeWishlistText, normalizeWishlistFolderName, sanitizeWishlistAmount, sanitizeWishlistStatus, sanitizeWishlistFilterStatus, sanitizeWishlistSort, sanitizeWishlistDate, sanitizeWishlistUrl, setWishlistFlash, buildWishlistRedirect, getWishlistItemsForUser, getWishlistItemByIdForUser, getWishlistFoldersForUser, ensureWishlistFolder, renameWishlistFolder, deleteWishlistFolder, getCurrentBalanceForUser, buildWishlistSummary, WISHLIST_STATUSES };
