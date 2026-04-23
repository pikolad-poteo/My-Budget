/**
 * Categories routes.
 * Handles category page rendering and category CRUD actions,
 * including create, update, delete, search, and tab state persistence.
 */

const express = require('express');
const router = express.Router();

const db = require('../scr/db');
const { requireAuth } = require('../scr/middleware');
const { getUserFamily } = require('../scr/family.service');
const {
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
} = require('../scr/category.utils');

const {
  CATEGORY_ICON_OPTIONS,
  CATEGORY_COLOR_OPTIONS
} = require('../scr/category.constants');

router.get('/categories', requireAuth, async (req, res) => {
  try {
    const currentUserId = req.session.user.id;
    const family = await getUserFamily(currentUserId);
    const searchTerm = (req.query.q || '').trim();
    const activeTab = req.query.tab === 'income' ? 'income' : 'expense';

    const categories = await getUserCategories(
      currentUserId,
      family ? family.id : null,
      searchTerm
    );

    const normalizedCategories = categories.map((category) => ({
      ...category,
      color: sanitizeCategoryColor(category.color),
      icon: sanitizeCategoryIcon(category.icon)
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
      title: 'Categories',
      activePage: 'categories',
      family,
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
      title: 'Categories',
      activePage: 'categories',
      family: null,
      categories: [],
      incomeCategories: [],
      expenseCategories: [],
      searchTerm: '',
      activeTab: 'expense',
      iconOptions: CATEGORY_ICON_OPTIONS,
      colorOptions: CATEGORY_COLOR_OPTIONS,
      errorMessage: 'Failed to load categories.',
      successMessage: ''
    });
  }
});

router.post('/categories/create', requireAuth, async (req, res) => {
  try {
    const currentUserId = req.session.user.id;
    const family = await getUserFamily(currentUserId);

    const name = sanitizeCategoryName(req.body.name);
    const type = sanitizeCategoryType(req.body.type);
    const color = sanitizeCategoryColor(req.body.color);
    const icon = sanitizeCategoryIcon(req.body.icon);
    const scope = sanitizeCategoryScope(req.body.scope, family);

    const redirectUrl = buildCategoriesRedirect(req, type);

    if (!name) {
      setCategoryFlash(req, 'error', 'Category name is required.');
      return res.redirect(redirectUrl);
    }

    let familyId = null;
    if (scope === 'family' && family) {
      familyId = family.id;
    }

    const duplicate = await findDuplicateCategory({
      userId: currentUserId,
      familyId,
      name,
      type
    });

    if (duplicate) {
      setCategoryFlash(req, 'error', 'A category with this name already exists in the selected scope.');
      return res.redirect(redirectUrl);
    }

    await db.query(
      `
      INSERT INTO categories (user_id, family_id, name, type, color, icon)
      VALUES (?, ?, ?, ?, ?, ?)
      `,
      [currentUserId, familyId, name, type, color, icon]
    );

    setCategoryFlash(req, 'success', 'Category created successfully.');
    return res.redirect(redirectUrl);
  } catch (error) {
    console.error('Category creation error:', error.message);
    setCategoryFlash(req, 'error', 'Failed to create category.');
    return res.redirect(buildCategoriesRedirect(req));
  }
});

router.post('/categories/:id/update', requireAuth, async (req, res) => {
  const categoryId = Number(req.params.id);

  try {
    const currentUserId = req.session.user.id;
    const family = await getUserFamily(currentUserId);

    const name = sanitizeCategoryName(req.body.name);
    const type = sanitizeCategoryType(req.body.type);
    const color = sanitizeCategoryColor(req.body.color);
    const icon = sanitizeCategoryIcon(req.body.icon);

    const redirectUrl = buildCategoriesRedirect(req, type);

    if (!categoryId || !name) {
      setCategoryFlash(req, 'error', 'Invalid category data.');
      return res.redirect(redirectUrl);
    }

    const category = await getCategoryByIdForUser(
      categoryId,
      currentUserId,
      family ? family.id : null
    );

    if (!category) {
      setCategoryFlash(req, 'error', 'Category not found.');
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
      setCategoryFlash(req, 'error', 'A category with this name already exists in this scope.');
      return res.redirect(redirectUrl);
    }

    await db.query(
      `
      UPDATE categories
      SET name = ?, type = ?, color = ?, icon = ?
      WHERE id = ?
      LIMIT 1
      `,
      [name, type, color, icon, categoryId]
    );

    setCategoryFlash(req, 'success', 'Category updated successfully.');
    return res.redirect(redirectUrl);
  } catch (error) {
    console.error('Category update error:', error.message);
    setCategoryFlash(req, 'error', 'Failed to update category.');
    return res.redirect(buildCategoriesRedirect(req));
  }
});

router.post('/categories/:id/delete', requireAuth, async (req, res) => {
  const categoryId = Number(req.params.id);

  try {
    const currentUserId = req.session.user.id;
    const family = await getUserFamily(currentUserId);

    const redirectUrl = buildCategoriesRedirect(req);

    if (!categoryId) {
      setCategoryFlash(req, 'error', 'Invalid category id.');
      return res.redirect(redirectUrl);
    }

    const category = await getCategoryByIdForUser(
      categoryId,
      currentUserId,
      family ? family.id : null
    );

    if (!category) {
      setCategoryFlash(req, 'error', 'Category not found.');
      return res.redirect(redirectUrl);
    }

    await db.query(
      'DELETE FROM categories WHERE id = ? LIMIT 1',
      [categoryId]
    );

    setCategoryFlash(req, 'success', 'Category deleted successfully.');
    return res.redirect(redirectUrl);
  } catch (error) {
    console.error('Category deletion error:', error.message);
    setCategoryFlash(req, 'error', 'Failed to delete category.');
    return res.redirect(buildCategoriesRedirect(req));
  }
});

module.exports = router;