/**
 * Wishlist routes.
 */
const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const router = express.Router();

const db = require('../scr/db');
const { requireAuth } = require('../scr/middleware');
const { getUserFamily } = require('../scr/family.service');
const {
  sanitizeWishlistText,
  normalizeWishlistFolderName,
  sanitizeWishlistAmount,
  sanitizeWishlistStatus,
  sanitizeWishlistFilterStatus,
  sanitizeWishlistSort,
  sanitizeWishlistDate,
  sanitizeWishlistUrl,
  setWishlistFlash,
  buildWishlistRedirect,
  getWishlistItemsForUser,
  getWishlistItemByIdForUser,
  getWishlistFoldersForUser,
  ensureWishlistFolder,
  renameWishlistFolder,
  deleteWishlistFolder,
  getCurrentBalanceForUser,
  buildWishlistSummary
} = require('../scr/wishlist.utils');

const wishlistUploadDir = path.join(__dirname, '..', 'public', 'uploads', 'wishlist');
fs.mkdirSync(wishlistUploadDir, { recursive: true });

const wishlistUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, wishlistUploadDir),
    filename: (req, file, cb) => {
      const safeExt = ['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(path.extname(file.originalname).toLowerCase())
        ? path.extname(file.originalname).toLowerCase()
        : '.jpg';
      cb(null, `${Date.now()}-${Math.random().toString(16).slice(2)}${safeExt}`);
    }
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype || !file.mimetype.startsWith('image/')) return cb(null, false);
    cb(null, true);
  }
});

function uploadWishlistImage(req, res, next) {
  wishlistUpload.single('local_image')(req, res, (error) => {
    if (error) {
      console.error('Wishlist upload error:', error.message);
      setWishlistFlash(req, 'error', 'Failed to upload image. Please use JPG, PNG, WEBP or GIF up to 5 MB.');
      return res.redirect(buildWishlistRedirect(req));
    }
    return next();
  });
}

function getWishlistImageUrl(req) {
  if (req.file && req.file.filename) return `/uploads/wishlist/${req.file.filename}`;
  return sanitizeWishlistUrl(req.body.image_url);
}

function getFolderStats(items) {
  return items.reduce((acc, item) => {
    const folderName = normalizeWishlistFolderName(item.folder);
    if (!folderName) return acc;
    if (!acc[folderName]) acc[folderName] = { count: 0, total: 0 };
    acc[folderName].count += 1;
    acc[folderName].total += Number(item.amount || 0);
    return acc;
  }, {});
}

router.get('/wishlist', requireAuth, async (req, res) => {
  try {
    const currentUserId = req.session.user.id;
    const family = await getUserFamily(currentUserId);
    const filters = {
      status: sanitizeWishlistFilterStatus(req.query.status),
      folder: (() => { const rawFolder = sanitizeWishlistText(req.query.folder || 'all', 100) || 'all'; if (rawFolder.toLowerCase() === 'all') return 'all'; return normalizeWishlistFolderName(rawFolder) || 'all'; })(),
      q: sanitizeWishlistText(req.query.q, 120),
      sort: sanitizeWishlistSort(req.query.sort)
    };
    const wishlistItems = await getWishlistItemsForUser({ userId: currentUserId, familyId: family ? family.id : null, filters });
    const summaryItems = await getWishlistItemsForUser({ userId: currentUserId, familyId: family ? family.id : null, filters: { status: 'all', folder: 'all', q: '', sort: 'newest' } });
    const folders = await getWishlistFoldersForUser(currentUserId, family ? family.id : null);
    const folderStats = getFolderStats(summaryItems);
    const balance = await getCurrentBalanceForUser(currentUserId, family ? family.id : null);
    const summary = buildWishlistSummary(summaryItems, balance);
    const flash = req.session.wishlistFlash || null;
    delete req.session.wishlistFlash;
    return res.render('wishlist/index', { title: 'Wishlist', activePage: 'wishlist', family, wishlistItems, allWishlistItems: summaryItems, folders, folderStats, filters, summary, errorMessage: flash && flash.type === 'error' ? flash.message : '', successMessage: flash && flash.type === 'success' ? flash.message : '' });
  } catch (error) {
    console.error('Wishlist page error:', error.message);
    return res.render('wishlist/index', { title: 'Wishlist', activePage: 'wishlist', family: null, wishlistItems: [], allWishlistItems: [], folders: [], folderStats: {}, filters: { status: 'all', folder: 'all', q: '', sort: 'newest' }, summary: { balance: 0, totalItems: 0, plannedTotal: 0, postponedTotal: 0, boughtTotal: 0, plannedCount: 0, boughtCount: 0, balanceAfterPlans: 0 }, errorMessage: 'Failed to load wishlist.', successMessage: '' });
  }
});

router.post('/wishlist/folders/create', requireAuth, async (req, res) => {
  try {
    const currentUserId = req.session.user.id;
    const family = await getUserFamily(currentUserId);
    const folderName = normalizeWishlistFolderName(req.body.name);
    if (!folderName || ['all', 'general'].includes(folderName.toLowerCase())) {
      setWishlistFlash(req, 'error', 'Please enter a valid folder name.');
      return res.redirect(buildWishlistRedirect(req));
    }
    await ensureWishlistFolder(currentUserId, family ? family.id : null, folderName);
    setWishlistFlash(req, 'success', 'Folder created successfully.');
    return res.redirect(`/wishlist?folder=${encodeURIComponent(folderName)}`);
  } catch (error) {
    console.error('Wishlist folder creation error:', error.message);
    setWishlistFlash(req, 'error', 'Failed to create wishlist folder.');
    return res.redirect(buildWishlistRedirect(req));
  }
});

router.post('/wishlist/folders/rename', requireAuth, async (req, res) => {
  try {
    const currentUserId = req.session.user.id;
    const family = await getUserFamily(currentUserId);
    const oldName = normalizeWishlistFolderName(req.body.old_name);
    const newName = normalizeWishlistFolderName(req.body.new_name);
    if (!oldName || !newName || ['all', 'general'].includes(oldName.toLowerCase()) || ['all', 'general'].includes(newName.toLowerCase())) {
      setWishlistFlash(req, 'error', 'Please enter a valid folder name.');
      return res.redirect(buildWishlistRedirect(req));
    }
    await renameWishlistFolder({ userId: currentUserId, familyId: family ? family.id : null, oldName, newName });
    setWishlistFlash(req, 'success', 'Folder renamed successfully.');
    return res.redirect(`/wishlist?folder=${encodeURIComponent(newName)}`);
  } catch (error) {
    console.error('Wishlist folder rename error:', error.message);
    setWishlistFlash(req, 'error', 'Failed to rename wishlist folder.');
    return res.redirect(buildWishlistRedirect(req));
  }
});

router.post('/wishlist/folders/delete', requireAuth, async (req, res) => {
  try {
    const currentUserId = req.session.user.id;
    const family = await getUserFamily(currentUserId);
    const folderName = normalizeWishlistFolderName(req.body.name);
    const deleteAction = req.body.delete_action === 'delete_items' ? 'delete_items' : 'move_to_general';
    if (!folderName || ['all', 'general'].includes(folderName.toLowerCase())) {
      setWishlistFlash(req, 'error', 'This folder cannot be deleted.');
      return res.redirect(buildWishlistRedirect(req));
    }
    await deleteWishlistFolder({ userId: currentUserId, familyId: family ? family.id : null, folderName, deleteAction });
    setWishlistFlash(req, 'success', deleteAction === 'delete_items' ? 'Folder and its items were deleted.' : 'Folder deleted and items were moved out of folders.');
    return res.redirect('/wishlist');
  } catch (error) {
    console.error('Wishlist folder delete error:', error.message);
    setWishlistFlash(req, 'error', 'Failed to delete wishlist folder.');
    return res.redirect(buildWishlistRedirect(req));
  }
});


router.post('/wishlist/folders/add-items', requireAuth, async (req, res) => {
  try {
    const currentUserId = req.session.user.id;
    const family = await getUserFamily(currentUserId);
    const targetFolder = normalizeWishlistFolderName(req.body.target_folder);
    const rawIds = Array.isArray(req.body.item_ids) ? req.body.item_ids : [req.body.item_ids];
    const itemIds = rawIds.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0);

    if (!targetFolder) {
      setWishlistFlash(req, 'error', 'Please choose a target folder.');
      return res.redirect(buildWishlistRedirect(req));
    }

    if (itemIds.length === 0) {
      setWishlistFlash(req, 'error', 'Please select at least one wishlist card.');
      return res.redirect(buildWishlistRedirect(req));
    }

    await ensureWishlistFolder(currentUserId, family ? family.id : null, targetFolder);

    const placeholders = itemIds.map(() => '?').join(', ');
    const params = [targetFolder, ...itemIds, currentUserId];
    let query = `UPDATE wishlist_items SET folder = ? WHERE id IN (${placeholders}) AND (user_id = ?`;
    if (family) {
      query += ' OR family_id = ?';
      params.push(family.id);
    }
    query += ')';
    await db.query(query, params);

    setWishlistFlash(req, 'success', 'Selected cards were added to the folder.');
    return res.redirect(`/wishlist?folder=${encodeURIComponent(targetFolder)}`);
  } catch (error) {
    console.error('Wishlist add existing items error:', error.message);
    setWishlistFlash(req, 'error', 'Failed to add selected cards to folder.');
    return res.redirect(buildWishlistRedirect(req));
  }
});

router.post('/wishlist/create', requireAuth, uploadWishlistImage, async (req, res) => {
  try {
    const currentUserId = req.session.user.id;
    const family = await getUserFamily(currentUserId);
    const redirectUrl = buildWishlistRedirect(req);
    const title = sanitizeWishlistText(req.body.title, 255);
    const amount = sanitizeWishlistAmount(req.body.amount);
    const folder = normalizeWishlistFolderName(req.body.folder);
    const status = sanitizeWishlistStatus(req.body.status);
    const description = sanitizeWishlistText(req.body.description, 1000) || null;
    const productUrl = sanitizeWishlistUrl(req.body.product_url);
    const imageUrl = getWishlistImageUrl(req);
    const desiredDate = sanitizeWishlistDate(req.body.desired_date);
    if (!title || !amount) {
      setWishlistFlash(req, 'error', 'Item name and target price are required.');
      return res.redirect(redirectUrl);
    }
    await ensureWishlistFolder(currentUserId, family ? family.id : null, folder);
    await db.query(`INSERT INTO wishlist_items (user_id, family_id, title, amount, folder, status, description, product_url, image_url, desired_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [currentUserId, family ? family.id : null, title, amount, folder, status, description, productUrl, imageUrl, desiredDate]);
    setWishlistFlash(req, 'success', 'Wishlist item created successfully.');
    return res.redirect(redirectUrl);
  } catch (error) {
    console.error('Wishlist creation error:', error.message);
    setWishlistFlash(req, 'error', 'Failed to create wishlist item.');
    return res.redirect(buildWishlistRedirect(req));
  }
});

router.post('/wishlist/:id/update', requireAuth, uploadWishlistImage, async (req, res) => {
  const itemId = Number(req.params.id);
  try {
    const currentUserId = req.session.user.id;
    const family = await getUserFamily(currentUserId);
    const redirectUrl = buildWishlistRedirect(req);
    const existingItem = await getWishlistItemByIdForUser(itemId, currentUserId, family ? family.id : null);
    if (!existingItem) {
      setWishlistFlash(req, 'error', 'Wishlist item not found.');
      return res.redirect(redirectUrl);
    }
    const title = sanitizeWishlistText(req.body.title, 255);
    const amount = sanitizeWishlistAmount(req.body.amount);
    const folder = normalizeWishlistFolderName(req.body.folder);
    const status = sanitizeWishlistStatus(req.body.status);
    const description = sanitizeWishlistText(req.body.description, 1000) || null;
    const productUrl = sanitizeWishlistUrl(req.body.product_url);
    const imageUrl = getWishlistImageUrl(req);
    const desiredDate = sanitizeWishlistDate(req.body.desired_date);
    if (!title || !amount) {
      setWishlistFlash(req, 'error', 'Invalid wishlist item data.');
      return res.redirect(redirectUrl);
    }
    await ensureWishlistFolder(currentUserId, family ? family.id : null, folder);
    await db.query(
      `UPDATE wishlist_items
       SET title = ?, amount = ?, folder = ?, status = ?, description = ?, product_url = ?, image_url = ?, desired_date = ?
       WHERE id = ? AND (user_id = ? OR family_id = ?) LIMIT 1`,
      [title, amount, folder, status, description, productUrl, imageUrl, desiredDate, itemId, currentUserId, family ? family.id : null]
    );
    setWishlistFlash(req, 'success', 'Wishlist item updated successfully.');
    return res.redirect(redirectUrl);
  } catch (error) {
    console.error('Wishlist update error:', error.message);
    setWishlistFlash(req, 'error', 'Failed to update wishlist item.');
    return res.redirect(buildWishlistRedirect(req));
  }
});

router.post('/wishlist/:id/status', requireAuth, async (req, res) => {
  const itemId = Number(req.params.id);
  try {
    const currentUserId = req.session.user.id;
    const family = await getUserFamily(currentUserId);
    const redirectUrl = buildWishlistRedirect(req);
    const status = sanitizeWishlistStatus(req.body.status);
    const existingItem = await getWishlistItemByIdForUser(itemId, currentUserId, family ? family.id : null);
    if (!existingItem) {
      setWishlistFlash(req, 'error', 'Wishlist item not found.');
      return res.redirect(redirectUrl);
    }
    await db.query('UPDATE wishlist_items SET status = ? WHERE id = ? AND (user_id = ? OR family_id = ?) LIMIT 1', [status, itemId, currentUserId, family ? family.id : null]);
    setWishlistFlash(req, 'success', 'Wishlist status updated successfully.');
    return res.redirect(redirectUrl);
  } catch (error) {
    console.error('Wishlist status update error:', error.message);
    setWishlistFlash(req, 'error', 'Failed to update wishlist status.');
    return res.redirect(buildWishlistRedirect(req));
  }
});

router.post('/wishlist/:id/delete', requireAuth, async (req, res) => {
  const itemId = Number(req.params.id);
  try {
    const currentUserId = req.session.user.id;
    const family = await getUserFamily(currentUserId);
    const redirectUrl = buildWishlistRedirect(req);
    const existingItem = await getWishlistItemByIdForUser(itemId, currentUserId, family ? family.id : null);
    if (!existingItem) {
      setWishlistFlash(req, 'error', 'Wishlist item not found.');
      return res.redirect(redirectUrl);
    }
    await db.query('DELETE FROM wishlist_items WHERE id = ? AND (user_id = ? OR family_id = ?) LIMIT 1', [itemId, currentUserId, family ? family.id : null]);
    setWishlistFlash(req, 'success', 'Wishlist item deleted successfully.');
    return res.redirect(redirectUrl);
  } catch (error) {
    console.error('Wishlist deletion error:', error.message);
    setWishlistFlash(req, 'error', 'Failed to delete wishlist item.');
    return res.redirect(buildWishlistRedirect(req));
  }
});

module.exports = router;
