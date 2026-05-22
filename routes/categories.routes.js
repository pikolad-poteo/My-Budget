/**
 * Categories routes.
 * Handles workspace-aware category page rendering and category CRUD actions,
 * including create, update, delete, search state, and dashboard visibility flags.
 */

const express = require('express');
const router = express.Router();

const db = require('../scr/db');
const { requireAuth } = require('../scr/middleware');
const { getUserFamily } = require('../scr/family.service');
const { getCanEditBudget, requireBudgetEditor } = require('../scr/budget.permissions');
const {
  sanitizeCategoryName,
  sanitizeCategoryType,
  sanitizeCategoryScope,
  sanitizeCategoryColor,
  sanitizeCategoryIcon,
  sanitizeCategoryDashboardFeatured,
  buildCategoriesRedirect,
  setCategoryFlash,
  getUserCategories,
  getCategoryByIdForUser,
  findDuplicateCategory
} = require('../scr/category.utils');

const {
  CATEGORY_ICON_OPTIONS,
  CATEGORY_COLOR_OPTIONS
} = require('../scr/category.constants');

// Render all workspace categories and split them into income and expense groups for the UI.
router.get('/categories', requireAuth, async (req, res) => {
  try {
    const currentUserId = req.session.user.id;
    const family = await getUserFamily(currentUserId);
    const canEditBudget = getCanEditBudget(family);
    const searchTerm = (req.query.q || '').trim();
    const activeTab = ['all', 'expense', 'income'].includes(req.query.tab) ? req.query.tab : 'all';

    const categories = await getUserCategories(
      currentUserId,
      family ? family.id : null,
      ''
    );

    const normalizedCategories = categories.map((category) => ({
      ...category,
      color: sanitizeCategoryColor(category.color),
      icon: sanitizeCategoryIcon(category.icon),
      dashboard_featured: Number(category.dashboard_featured || 0) === 1
    }));

    const incomeCategories = normalizedCategories.filter(
      (category) => category.type === 'income'
    );

    const expenseCategories = normalizedCategories.filter(
      (category) => category.type === 'expense'
    );

    const flash = req.session.categoryFlash || null;
    delete req.session.categoryFlash;

    res.render('categories/index', {
      title: req.t('nav.categories'),
      activePage: 'categories',
      family,
      canEditBudget,
      categories: normalizedCategories,
      incomeCategories,
      expenseCategories,
      searchTerm,
      activeTab,
      iconOptions: CATEGORY_ICON_OPTIONS,
      colorOptions: CATEGORY_COLOR_OPTIONS,
      errorMessage: flash && flash.type === 'error' ? flash.message : '',
      successMessage: flash && flash.type === 'success' ? flash.message : ''
    });
  } catch (error) {
    console.error('Categories page error:', error.message);

    res.render('categories/index', {
      title: req.t('nav.categories'),
      activePage: 'categories',
      family: null,
      canEditBudget: true,
      categories: [],
      incomeCategories: [],
      expenseCategories: [],
      searchTerm: '',
      activeTab: 'all',
      iconOptions: CATEGORY_ICON_OPTIONS,
      colorOptions: CATEGORY_COLOR_OPTIONS,
      errorMessage: req.t('categories.messages.failedToLoadCategories'),
      successMessage: ''
    });
  }
});

// Create a category only if the name is valid and not duplicated in the same workspace/type.
router.post('/categories/create', requireAuth, requireBudgetEditor('categories'), async (req, res) => {
  try {
    const currentUserId = req.session.user.id;
    const family = await getUserFamily(currentUserId);

    const name = sanitizeCategoryName(req.body.name);
    const type = sanitizeCategoryType(req.body.type);
    const color = sanitizeCategoryColor(req.body.color);
    const icon = sanitizeCategoryIcon(req.body.icon);
    const dashboardFeatured = sanitizeCategoryDashboardFeatured(req.body.dashboardFeatured);
    const familyId = family ? family.id : null;

    const redirectUrl = buildCategoriesRedirect(req, type);

    if (!name) {
      setCategoryFlash(req, 'error', req.t('categories.messages.categoryNameRequired'));
      return res.redirect(redirectUrl);
    }

    const duplicate = await findDuplicateCategory({
      userId: currentUserId,
      familyId,
      name,
      type
    });

    if (duplicate) {
      setCategoryFlash(req, 'error', req.t('categories.messages.duplicateInWorkspace'));
      return res.redirect(redirectUrl);
    }

    await db.query(
      `
      INSERT INTO categories (user_id, family_id, name, type, color, icon, dashboard_featured)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [currentUserId, familyId, name, type, color, icon, dashboardFeatured]
    );

    setCategoryFlash(req, 'success', req.t('categories.messages.categoryCreated'));
    return res.redirect(redirectUrl);
  } catch (error) {
    console.error('Category creation error:', error.message);
    setCategoryFlash(req, 'error', req.t('categories.messages.failedToCreateCategory'));
    return res.redirect(buildCategoriesRedirect(req));
  }
});

// Update a category after ownership, workspace scope, and duplicate-name checks.
router.post('/categories/:id/update', requireAuth, requireBudgetEditor('categories'), async (req, res) => {
  const categoryId = Number(req.params.id);

  try {
    const currentUserId = req.session.user.id;
    const family = await getUserFamily(currentUserId);

    const name = sanitizeCategoryName(req.body.name);
    const type = sanitizeCategoryType(req.body.type);
    const color = sanitizeCategoryColor(req.body.color);
    const icon = sanitizeCategoryIcon(req.body.icon);
    const dashboardFeatured = sanitizeCategoryDashboardFeatured(req.body.dashboardFeatured);

    const redirectUrl = buildCategoriesRedirect(req, type);

    if (!categoryId || !name) {
      setCategoryFlash(req, 'error', req.t('categories.messages.invalidCategoryData'));
      return res.redirect(redirectUrl);
    }

    const category = await getCategoryByIdForUser(
      categoryId,
      currentUserId,
      family ? family.id : null
    );

    if (!category) {
      setCategoryFlash(req, 'error', req.t('categories.messages.categoryNotFound'));
      return res.redirect(redirectUrl);
    }

    const duplicate = await findDuplicateCategory({
      userId: currentUserId,
      familyId: category.family_id || null,
      name,
      type,
      excludeId: categoryId
    });

    if (duplicate) {
      setCategoryFlash(req, 'error', req.t('categories.messages.duplicateInScope'));
      return res.redirect(redirectUrl);
    }

    await db.query(
      `
      UPDATE categories
      SET name = ?, type = ?, color = ?, icon = ?, dashboard_featured = ?
      WHERE id = ?
      LIMIT 1
      `,
      [name, type, color, icon, dashboardFeatured, categoryId]
    );

    setCategoryFlash(req, 'success', req.t('categories.messages.categoryUpdated'));
    return res.redirect(redirectUrl);
  } catch (error) {
    console.error('Category update error:', error.message);
    setCategoryFlash(req, 'error', req.t('categories.messages.failedToUpdateCategory'));
    return res.redirect(buildCategoriesRedirect(req));
  }
});

// Delete categories through a scoped lookup so another workspace cannot be affected.
router.post('/categories/:id/delete', requireAuth, requireBudgetEditor('categories'), async (req, res) => {
  const categoryId = Number(req.params.id);

  try {
    const currentUserId = req.session.user.id;
    const family = await getUserFamily(currentUserId);

    const redirectUrl = buildCategoriesRedirect(req);

    if (!categoryId) {
      setCategoryFlash(req, 'error', req.t('categories.messages.invalidCategoryId'));
      return res.redirect(redirectUrl);
    }

    const category = await getCategoryByIdForUser(
      categoryId,
      currentUserId,
      family ? family.id : null
    );

    if (!category) {
      setCategoryFlash(req, 'error', req.t('categories.messages.categoryNotFound'));
      return res.redirect(redirectUrl);
    }

    await db.query(
      'DELETE FROM categories WHERE id = ? LIMIT 1',
      [categoryId]
    );

    setCategoryFlash(req, 'success', req.t('categories.messages.categoryDeleted'));
    return res.redirect(redirectUrl);
  } catch (error) {
    console.error('Category deletion error:', error.message);
    setCategoryFlash(req, 'error', req.t('categories.messages.failedToDeleteCategory'));
    return res.redirect(buildCategoriesRedirect(req));
  }
});

module.exports = router;