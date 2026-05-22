/**
 * Wishlist routes.
 * Handles planned purchases, folders, member filters, status changes, image uploads,
 * and workspace-aware wishlist CRUD actions.
 */
const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const router = express.Router();

const db = require('../scr/db');
const { requireAuth } = require('../scr/middleware');
const { getUserFamily, getFamilyMembers } = require('../scr/family.service');
const { getCanEditBudget, requireBudgetEditor } = require('../scr/budget.permissions');
const { getWorkspaceCondition } = require('../scr/category.utils');
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
  getWishlistFolderCardsForUser,
  ensureWishlistFolder,
  renameWishlistFolder,
  deleteWishlistFolder,
  syncWishlistFolderItems,
  getCurrentBalanceForUser,
  buildWishlistSummary
} = require('../scr/wishlist.utils');

const wishlistUploadDir = path.join(__dirname, '..', 'public', 'uploads', 'wishlist');
fs.mkdirSync(wishlistUploadDir, { recursive: true });

// Store wishlist images on disk because item cards reference the generated public URL.
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

// Convert upload failures into wishlist flash messages without breaking form redirects.
function uploadWishlistImage(req, res, next) {
  wishlistUpload.single('local_image')(req, res, (error) => {
    if (error) {
      console.error('Wishlist upload error:', error.message);
      setWishlistFlash(req, 'error', req.t('wishlist.messages.uploadFailed'));
      return res.redirect(buildWishlistRedirect(req));
    }
    return next();
  });
}

function isLocalWishlistImage(imageUrl) {
  return typeof imageUrl === 'string' && imageUrl.startsWith('/uploads/wishlist/');
}

function getExternalWishlistImageUrl(value) {
  const rawUrl = sanitizeWishlistText(value, 1000);
  if (!rawUrl || rawUrl.startsWith('/uploads/wishlist/')) return null;
  return sanitizeWishlistUrl(rawUrl);
}

function getUploadedWishlistImageUrl(req) {
  if (req.file && req.file.filename) return `/uploads/wishlist/${req.file.filename}`;
  return null;
}

function deleteWishlistLocalImage(imageUrl) {
  if (!isLocalWishlistImage(imageUrl)) return;

  const relativePath = imageUrl.replace(/^\/uploads\/wishlist\//, '');
  if (!relativePath || relativePath.includes('..') || relativePath.includes('/') || relativePath.includes('\\')) return;

  fs.unlink(path.join(wishlistUploadDir, relativePath), (error) => {
    if (error && error.code !== 'ENOENT') {
      console.error('Wishlist local image delete error:', error.message);
    }
  });
}

// Prefer a local upload over an external image URL when creating a wishlist item.
function resolveCreatedWishlistImageUrl(req) {
  const externalImageUrl = getExternalWishlistImageUrl(req.body.image_url);
  const uploadedImageUrl = getUploadedWishlistImageUrl(req);

  if (externalImageUrl) {
    deleteWishlistLocalImage(uploadedImageUrl);
    return externalImageUrl;
  }

  return uploadedImageUrl;
}

// Preserve the previous image unless the edit form provides a replacement.
function resolveUpdatedWishlistImageUrl(req, existingImageUrl) {
  const externalImageUrl = getExternalWishlistImageUrl(req.body.image_url);
  const uploadedImageUrl = getUploadedWishlistImageUrl(req);
  const shouldResetLocalImage = req.body.reset_local_image === '1';
  const existingIsLocal = isLocalWishlistImage(existingImageUrl);

  if (externalImageUrl) {
    deleteWishlistLocalImage(uploadedImageUrl);
    if (existingIsLocal) deleteWishlistLocalImage(existingImageUrl);
    return externalImageUrl;
  }

  if (uploadedImageUrl) {
    if (existingIsLocal && existingImageUrl !== uploadedImageUrl) deleteWishlistLocalImage(existingImageUrl);
    return uploadedImageUrl;
  }

  if (shouldResetLocalImage) {
    if (existingIsLocal) deleteWishlistLocalImage(existingImageUrl);
    return null;
  }

  return existingIsLocal ? existingImageUrl : null;
}

// Family wishlists can be filtered by member; lone users receive a single fallback member.
async function getWishlistMembers(currentUser, familyId, fallbackName = 'Me') {
  if (!familyId) {
    return [{ id: currentUser.id, name: currentUser.name || fallbackName }];
  }

  const members = await getFamilyMembers(familyId);
  return members.length ? members : [{ id: currentUser.id, name: currentUser.name || fallbackName }];
}

function getWishlistBuyerFilterId(value, members) {
  const raw = sanitizeWishlistText(value, 50);
  if (!raw || raw === 'all') return 'all';

  const memberId = Number(raw);
  return members.some((member) => Number(member.id) === memberId) ? memberId : 'all';
}

// Calculate folder totals from already loaded item data to avoid extra SQL per card.
function getFolderStats(items) {
  return items.reduce((acc, item) => {
    const folderName = normalizeWishlistFolderName(item.folder);
    const ownerId = Number(item.user_id || 0);
    if (!folderName || !ownerId) return acc;

    const key = `${ownerId}::${folderName.toLowerCase()}`;
    if (!acc[key]) acc[key] = { count: 0, total: 0 };
    acc[key].count += 1;
    acc[key].total += Number(item.amount || 0);
    return acc;
  }, {});
}

// Render wishlist folders, filtered items, summary metrics, and member-aware folder cards.
router.get('/wishlist', requireAuth, async (req, res) => {
  try {
    const currentUserId = req.session.user.id;
    const family = await getUserFamily(currentUserId);
    const familyMembers = await getWishlistMembers(req.session.user, family ? family.id : null, req.t('wishlist.me'));
    const sortValue = sanitizeWishlistText(req.query.sort, 50);
    const canEditBudget = getCanEditBudget(family);
    const filters = {
      status: sanitizeWishlistFilterStatus(req.query.status),
      folder: (() => { const rawFolder = sanitizeWishlistText(req.query.folder || 'all', 100) || 'all'; if (rawFolder.toLowerCase() === 'all') return 'all'; return normalizeWishlistFolderName(rawFolder) || 'all'; })(),
      q: sanitizeWishlistText(req.query.q, 120),
      sort: sanitizeWishlistSort(sortValue),
      buyer: getWishlistBuyerFilterId(req.query.buyer, familyMembers)
    };
    const wishlistItems = await getWishlistItemsForUser({ userId: currentUserId, familyId: family ? family.id : null, filters });
    const summaryItems = await getWishlistItemsForUser({ userId: currentUserId, familyId: family ? family.id : null, filters: { status: 'all', folder: 'all', q: '', sort: 'newest', buyer: 'all' } });
    const folders = await getWishlistFoldersForUser(currentUserId, family ? family.id : null);
    const folderCards = await getWishlistFolderCardsForUser(currentUserId, family ? family.id : null, filters.buyer);
    const folderStats = getFolderStats(summaryItems);
    const balance = await getCurrentBalanceForUser(currentUserId, family ? family.id : null);
    const summary = buildWishlistSummary(summaryItems, balance);
    const flash = req.session.wishlistFlash || null;
    delete req.session.wishlistFlash;
    return res.render('wishlist/index', { title: req.t('wishlist.pageTitle'), activePage: 'wishlist', family, familyMembers, currentUser: req.session.user, canEditBudget, wishlistItems, allWishlistItems: summaryItems, folders, folderCards, folderStats, filters, summary, errorMessage: flash && flash.type === 'error' ? flash.message : '', successMessage: flash && flash.type === 'success' ? flash.message : '' });
  } catch (error) {
    console.error('Wishlist page error:', error.message);
    return res.render('wishlist/index', { title: req.t('wishlist.pageTitle'), activePage: 'wishlist', family: null, familyMembers: [], currentUser: req.session.user, canEditBudget: true, wishlistItems: [], allWishlistItems: [], folders: [], folderCards: [], folderStats: {}, filters: { status: 'all', folder: 'all', q: '', sort: 'newest', buyer: 'all' }, summary: { balance: 0, totalItems: 0, plannedTotal: 0, postponedTotal: 0, boughtTotal: 0, plannedCount: 0, boughtCount: 0, balanceAfterPlans: 0 }, errorMessage: req.t('wishlist.messages.failedToLoadWishlist'), successMessage: '' });
  }
});


// Render item details only after checking the item belongs to the current workspace.
router.get('/wishlist/:id', requireAuth, async (req, res) => {
  const itemId = Number(req.params.id);

  try {
    const currentUserId = req.session.user.id;
    const family = await getUserFamily(currentUserId);
    const item = await getWishlistItemByIdForUser(itemId, currentUserId, family ? family.id : null);

    if (!item) {
      setWishlistFlash(req, 'error', req.t('wishlist.messages.itemNotFound'));
      return res.redirect('/wishlist');
    }

    const folders = await getWishlistFoldersForUser(currentUserId, family ? family.id : null);
    const familyMembers = await getWishlistMembers(req.session.user, family ? family.id : null, req.t('wishlist.me'));
    const canEditBudget = getCanEditBudget(family);
    const flash = req.session.wishlistFlash || null;
    delete req.session.wishlistFlash;

    return res.render('wishlist/detail', {
      title: item.title,
      activePage: 'wishlist',
      family,
      item,
      folders,
      familyMembers,
      canEditBudget,
      errorMessage: flash && flash.type === 'error' ? flash.message : '',
      successMessage: flash && flash.type === 'success' ? flash.message : ''
    });
  } catch (error) {
    console.error('Wishlist detail page error:', error.message);
    setWishlistFlash(req, 'error', req.t('wishlist.messages.failedToLoadItem'));
    return res.redirect('/wishlist');
  }
});

// Create a member-owned folder in the current workspace.
router.post('/wishlist/folders/create', requireAuth, requireBudgetEditor('wishlist'), async (req, res) => {
  try {
    const currentUserId = req.session.user.id;
    const family = await getUserFamily(currentUserId);
    const familyMembers = await getWishlistMembers(req.session.user, family ? family.id : null, req.t('wishlist.me'));
    const availableMemberIds = new Set(familyMembers.map((member) => String(member.id)));
    const selectedUserId = availableMemberIds.has(String(req.body.user_id)) ? Number(req.body.user_id) : currentUserId;
    const folderName = normalizeWishlistFolderName(req.body.name);
    if (!folderName || ['all', 'general'].includes(folderName.toLowerCase())) {
      setWishlistFlash(req, 'error', req.t('wishlist.messages.validFolderNameRequired'));
      return res.redirect(buildWishlistRedirect(req));
    }
    await ensureWishlistFolder(selectedUserId, family ? family.id : null, folderName);
    setWishlistFlash(req, 'success', req.t('wishlist.messages.folderCreated'));
    return res.redirect(`/wishlist?folder=${encodeURIComponent(folderName)}&buyer=${encodeURIComponent(selectedUserId)}`);
  } catch (error) {
    console.error('Wishlist folder creation error:', error.message);
    setWishlistFlash(req, 'error', req.t('wishlist.messages.failedToCreateFolder'));
    return res.redirect(buildWishlistRedirect(req));
  }
});

// Rename or reassign a folder while preserving its workspace scope.
router.post('/wishlist/folders/rename', requireAuth, requireBudgetEditor('wishlist'), async (req, res) => {
  try {
    const currentUserId = req.session.user.id;
    const family = await getUserFamily(currentUserId);
    const familyMembers = await getWishlistMembers(req.session.user, family ? family.id : null, req.t('wishlist.me'));
    const availableMemberIds = new Set(familyMembers.map((member) => String(member.id)));
    const oldName = normalizeWishlistFolderName(req.body.old_name);
    const newName = normalizeWishlistFolderName(req.body.new_name);
    const oldUserId = availableMemberIds.has(String(req.body.old_user_id)) ? Number(req.body.old_user_id) : currentUserId;
    const newUserId = availableMemberIds.has(String(req.body.user_id)) ? Number(req.body.user_id) : oldUserId;
    if (!oldName || !newName || ['all', 'general'].includes(oldName.toLowerCase()) || ['all', 'general'].includes(newName.toLowerCase())) {
      setWishlistFlash(req, 'error', req.t('wishlist.messages.validFolderNameRequired'));
      return res.redirect(buildWishlistRedirect(req));
    }
    await renameWishlistFolder({ userId: currentUserId, familyId: family ? family.id : null, oldName, newName, oldUserId, newUserId });
    setWishlistFlash(req, 'success', req.t('wishlist.messages.folderUpdated'));
    return res.redirect(`/wishlist?folder=${encodeURIComponent(newName)}&buyer=${encodeURIComponent(newUserId)}`);
  } catch (error) {
    console.error('Wishlist folder rename error:', error.message);
    setWishlistFlash(req, 'error', req.t('wishlist.messages.failedToRenameFolder'));
    return res.redirect(buildWishlistRedirect(req));
  }
});

router.post('/wishlist/folders/delete', requireAuth, requireBudgetEditor('wishlist'), async (req, res) => {
  try {
    const currentUserId = req.session.user.id;
    const family = await getUserFamily(currentUserId);
    const familyMembers = await getWishlistMembers(req.session.user, family ? family.id : null, req.t('wishlist.me'));
    const availableMemberIds = new Set(familyMembers.map((member) => String(member.id)));
    const folderName = normalizeWishlistFolderName(req.body.name);
    const ownerId = availableMemberIds.has(String(req.body.owner_id)) ? Number(req.body.owner_id) : currentUserId;
    const deleteAction = req.body.delete_action === 'delete_items' ? 'delete_items' : 'move_to_general';
    if (!folderName || ['all', 'general'].includes(folderName.toLowerCase())) {
      setWishlistFlash(req, 'error', req.t('wishlist.messages.folderCannotBeDeleted'));
      return res.redirect(buildWishlistRedirect(req));
    }
    await deleteWishlistFolder({ userId: currentUserId, familyId: family ? family.id : null, folderName, deleteAction, ownerId });
    setWishlistFlash(req, 'success', deleteAction === 'delete_items' ? 'Folder and its items were deleted.' : 'Folder deleted and items were moved out of folders.');
    return res.redirect('/wishlist');
  } catch (error) {
    console.error('Wishlist folder delete error:', error.message);
    setWishlistFlash(req, 'error', req.t('wishlist.messages.failedToDeleteFolder'));
    return res.redirect(buildWishlistRedirect(req));
  }
});


// Replace folder membership with the submitted selected item list.
router.post('/wishlist/folders/add-items', requireAuth, requireBudgetEditor('wishlist'), async (req, res) => {
  try {
    const currentUserId = req.session.user.id;
    const family = await getUserFamily(currentUserId);
    const familyMembers = await getWishlistMembers(req.session.user, family ? family.id : null, req.t('wishlist.me'));
    const availableMemberIds = new Set(familyMembers.map((member) => String(member.id)));
    const targetFolder = normalizeWishlistFolderName(req.body.target_folder);
    const targetOwnerId = availableMemberIds.has(String(req.body.target_owner_id)) ? Number(req.body.target_owner_id) : currentUserId;
    const rawIds = Array.isArray(req.body.item_ids) ? req.body.item_ids : (req.body.item_ids ? [req.body.item_ids] : []);
    const itemIds = rawIds.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0);

    if (!targetFolder) {
      setWishlistFlash(req, 'error', req.t('wishlist.messages.chooseTargetFolder'));
      return res.redirect(buildWishlistRedirect(req));
    }

    await syncWishlistFolderItems({
      userId: currentUserId,
      familyId: family ? family.id : null,
      targetFolder,
      targetOwnerId,
      selectedItemIds: itemIds
    });

    setWishlistFlash(req, 'success', req.t('wishlist.messages.folderItemsUpdated'));
    return res.redirect(`/wishlist?folder=${encodeURIComponent(targetFolder)}&buyer=${encodeURIComponent(targetOwnerId)}`);
  } catch (error) {
    console.error('Wishlist folder items sync error:', error.message);
    setWishlistFlash(req, 'error', req.t('wishlist.messages.failedToUpdateFolderItems'));
    return res.redirect(buildWishlistRedirect(req));
  }
});

// Create a wishlist item with sanitized amount, date, status, buyer, and image data.
router.post('/wishlist/create', requireAuth, requireBudgetEditor('wishlist'), uploadWishlistImage, async (req, res) => {
  try {
    const currentUserId = req.session.user.id;
    const family = await getUserFamily(currentUserId);
    const familyMembers = await getWishlistMembers(req.session.user, family ? family.id : null, req.t('wishlist.me'));
    const availableMemberIds = new Set(familyMembers.map((member) => String(member.id)));
    const selectedUserId = availableMemberIds.has(String(req.body.user_id)) ? Number(req.body.user_id) : currentUserId;
    const redirectUrl = buildWishlistRedirect(req);
    const title = sanitizeWishlistText(req.body.title, 255);
    const amount = sanitizeWishlistAmount(req.body.amount);
    const folder = normalizeWishlistFolderName(req.body.folder);
    const status = sanitizeWishlistStatus(req.body.status);
    const description = sanitizeWishlistText(req.body.description, 1000) || null;
    const productUrl = sanitizeWishlistUrl(req.body.product_url);
    const imageUrl = resolveCreatedWishlistImageUrl(req);
    const desiredDate = sanitizeWishlistDate(req.body.desired_date);
    if (!title || !amount) {
      setWishlistFlash(req, 'error', req.t('wishlist.messages.itemNameAndPriceRequired'));
      return res.redirect(redirectUrl);
    }
    await ensureWishlistFolder(selectedUserId, family ? family.id : null, folder);
    await db.query(`INSERT INTO wishlist_items (user_id, family_id, title, amount, folder, status, description, product_url, image_url, desired_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [selectedUserId, family ? family.id : null, title, amount, folder, status, description, productUrl, imageUrl, desiredDate]);
    setWishlistFlash(req, 'success', req.t('wishlist.messages.itemCreated'));
    return res.redirect(redirectUrl);
  } catch (error) {
    console.error('Wishlist creation error:', error.message);
    setWishlistFlash(req, 'error', req.t('wishlist.messages.failedToCreateItem'));
    return res.redirect(buildWishlistRedirect(req));
  }
});

// Update a wishlist item and clean up replaced local images when needed.
router.post('/wishlist/:id/update', requireAuth, requireBudgetEditor('wishlist'), uploadWishlistImage, async (req, res) => {
  const itemId = Number(req.params.id);
  try {
    const currentUserId = req.session.user.id;
    const family = await getUserFamily(currentUserId);
    const familyMembers = await getWishlistMembers(req.session.user, family ? family.id : null, req.t('wishlist.me'));
    const availableMemberIds = new Set(familyMembers.map((member) => String(member.id)));
    const selectedUserId = availableMemberIds.has(String(req.body.user_id)) ? Number(req.body.user_id) : currentUserId;
    const redirectUrl = buildWishlistRedirect(req);
    const existingItem = await getWishlistItemByIdForUser(itemId, currentUserId, family ? family.id : null);
    if (!existingItem) {
      setWishlistFlash(req, 'error', req.t('wishlist.messages.itemNotFound'));
      return res.redirect(redirectUrl);
    }
    const title = sanitizeWishlistText(req.body.title, 255);
    const amount = sanitizeWishlistAmount(req.body.amount);
    const folder = normalizeWishlistFolderName(req.body.folder);
    const status = sanitizeWishlistStatus(req.body.status);
    const description = sanitizeWishlistText(req.body.description, 1000) || null;
    const productUrl = sanitizeWishlistUrl(req.body.product_url);
    const imageUrl = resolveUpdatedWishlistImageUrl(req, existingItem.image_url);
    const desiredDate = sanitizeWishlistDate(req.body.desired_date);
    if (!title || !amount) {
      setWishlistFlash(req, 'error', req.t('wishlist.messages.invalidItemData'));
      return res.redirect(redirectUrl);
    }
    await ensureWishlistFolder(selectedUserId, family ? family.id : null, folder);
    const workspace = getWorkspaceCondition(currentUserId, family ? family.id : null);
    await db.query(
      `UPDATE wishlist_items
       SET user_id = ?, title = ?, amount = ?, folder = ?, status = ?, description = ?, product_url = ?, image_url = ?, desired_date = ?
       WHERE id = ? AND ${workspace.clause} LIMIT 1`,
      [selectedUserId, title, amount, folder, status, description, productUrl, imageUrl, desiredDate, itemId, ...workspace.params]
    );
    setWishlistFlash(req, 'success', req.t('wishlist.messages.itemUpdated'));
    return res.redirect(redirectUrl);
  } catch (error) {
    console.error('Wishlist update error:', error.message);
    setWishlistFlash(req, 'error', req.t('wishlist.messages.failedToUpdateItem'));
    return res.redirect(buildWishlistRedirect(req));
  }
});

// Update only item status for quick state changes from the card UI.
router.post('/wishlist/:id/status', requireAuth, requireBudgetEditor('wishlist'), async (req, res) => {
  const itemId = Number(req.params.id);
  try {
    const currentUserId = req.session.user.id;
    const family = await getUserFamily(currentUserId);
    const redirectUrl = buildWishlistRedirect(req);
    const status = sanitizeWishlistStatus(req.body.status);
    const existingItem = await getWishlistItemByIdForUser(itemId, currentUserId, family ? family.id : null);
    if (!existingItem) {
      setWishlistFlash(req, 'error', req.t('wishlist.messages.itemNotFound'));
      return res.redirect(redirectUrl);
    }
    const workspace = getWorkspaceCondition(currentUserId, family ? family.id : null);
    await db.query(
      `UPDATE wishlist_items SET status = ? WHERE id = ? AND ${workspace.clause} LIMIT 1`,
      [status, itemId, ...workspace.params]
    );
    setWishlistFlash(req, 'success', req.t('wishlist.messages.statusUpdated'));
    return res.redirect(redirectUrl);
  } catch (error) {
    console.error('Wishlist status update error:', error.message);
    setWishlistFlash(req, 'error', req.t('wishlist.messages.failedToUpdateStatus'));
    return res.redirect(buildWishlistRedirect(req));
  }
});

// Delete the item and remove its local image file when it was uploaded by the app.
router.post('/wishlist/:id/delete', requireAuth, requireBudgetEditor('wishlist'), async (req, res) => {
  const itemId = Number(req.params.id);
  try {
    const currentUserId = req.session.user.id;
    const family = await getUserFamily(currentUserId);
    const redirectUrl = buildWishlistRedirect(req);
    const existingItem = await getWishlistItemByIdForUser(itemId, currentUserId, family ? family.id : null);
    if (!existingItem) {
      setWishlistFlash(req, 'error', req.t('wishlist.messages.itemNotFound'));
      return res.redirect(redirectUrl);
    }
    const workspace = getWorkspaceCondition(currentUserId, family ? family.id : null);
    await db.query(
      `DELETE FROM wishlist_items WHERE id = ? AND ${workspace.clause} LIMIT 1`,
      [itemId, ...workspace.params]
    );
    setWishlistFlash(req, 'success', req.t('wishlist.messages.itemDeleted'));
    return res.redirect(redirectUrl);
  } catch (error) {
    console.error('Wishlist deletion error:', error.message);
    setWishlistFlash(req, 'error', req.t('wishlist.messages.failedToDeleteItem'));
    return res.redirect(buildWishlistRedirect(req));
  }
});

module.exports = router;
