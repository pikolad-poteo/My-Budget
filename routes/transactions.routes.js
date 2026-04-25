const express = require('express');
const router = express.Router();

const db = require('../scr/db');
const { requireAuth } = require('../scr/middleware');
const { getUserFamily } = require('../scr/family.service');
const {
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
} = require('../scr/transaction.utils');

router.get('/transactions', requireAuth, async (req, res) => {
  try {
    const currentUserId = req.session.user.id;
    const family = await getUserFamily(currentUserId);
    const defaultDates = getDefaultTransactionDates();

    const requestedView = sanitizeTransactionView(req.query.view);
    const requestedDir = sanitizeTransactionSortDir(req.query.dir);
    const requestedType = sanitizeTransactionFilterType(req.query.type);

    let resolvedType = requestedType;
    if (requestedView === 'expenses') {
      resolvedType = 'expense';
    }
    if (requestedView === 'income') {
      resolvedType = 'income';
    }

    const filters = {
      from: sanitizeTransactionDate(req.query.from || defaultDates.from),
      to: sanitizeTransactionDate(req.query.to || defaultDates.to),
      category: String(req.query.category || 'all').trim(),
      type: resolvedType,
      scope: sanitizeTransactionFilterScope(req.query.scope),
      member: String(req.query.member || 'all').trim(),
      view: requestedView,
      dir: requestedDir
    };

    const categories = await getAvailableTransactionCategories(currentUserId, family ? family.id : null);
    const members = await getAvailableTransactionMembers(currentUserId, family);

    const availableCategoryIds = new Set(categories.map((category) => String(category.id)));
    const availableMemberIds = new Set(members.map((member) => String(member.id)));

    const normalizedFilters = {
      ...filters,
      category: availableCategoryIds.has(filters.category) ? filters.category : 'all',
      member: availableMemberIds.has(filters.member) ? filters.member : 'all'
    };

    const transactions = await getTransactionsForUser({
      userId: currentUserId,
      familyId: family ? family.id : null,
      filters: {
        from: normalizedFilters.from,
        to: normalizedFilters.to,
        categoryId: normalizedFilters.category !== 'all' ? Number(normalizedFilters.category) : null,
        type: normalizedFilters.type,
        scope: normalizedFilters.scope,
        memberId: normalizedFilters.member !== 'all' ? Number(normalizedFilters.member) : null,
        view: normalizedFilters.view,
        dir: normalizedFilters.dir
      }
    });

    const flash = req.session.transactionFlash || null;
    delete req.session.transactionFlash;

    const summary = transactions.reduce(
      (acc, transaction) => {
        const amount = Number(transaction.amount || 0);
        acc.total += 1;

        if (transaction.type === 'income') {
          acc.income += amount;
          acc.incomeCount += 1;
        } else {
          acc.expense += amount;
          acc.expenseCount += 1;
        }

        return acc;
      },
      {
        total: 0,
        income: 0,
        expense: 0,
        incomeCount: 0,
        expenseCount: 0
      }
    );

    const hasAdvancedFilters =
      normalizedFilters.category !== 'all' ||
      normalizedFilters.scope !== 'all' ||
      normalizedFilters.member !== 'all' ||
      (normalizedFilters.view === 'date' && normalizedFilters.type !== 'all');

    return res.render('transactions/index', {
      title: 'Transactions',
      activePage: 'transactions',
      family,
      categories,
      members,
      transactions,
      filters: {
        ...normalizedFilters,
        hasAdvancedFilters
      },
      summary,
      errorMessage: flash && flash.type === 'error' ? flash.message : '',
      successMessage: flash && flash.type === 'success' ? flash.message : ''
    });
  } catch (error) {
    console.error('Transactions page error:', error.message);

    return res.render('transactions/index', {
      title: 'Transactions',
      activePage: 'transactions',
      family: null,
      categories: [],
      members: [],
      transactions: [],
      filters: {
        ...getDefaultTransactionDates(),
        category: 'all',
        type: 'all',
        scope: 'all',
        member: 'all',
        view: 'date',
        dir: 'desc',
        hasAdvancedFilters: false
      },
      summary: {
        total: 0,
        income: 0,
        expense: 0,
        incomeCount: 0,
        expenseCount: 0
      },
      errorMessage: 'Failed to load transactions.',
      successMessage: ''
    });
  }
});

router.post('/transactions/create', requireAuth, async (req, res) => {
  try {
    const currentUserId = req.session.user.id;
    const family = await getUserFamily(currentUserId);
    const redirectUrl = buildTransactionsRedirect(req);

    const categoryId = sanitizeTransactionCategoryId(req.body.category_id);
    const paidByUserId = sanitizeTransactionMemberId(req.body.paid_by_user_id) || currentUserId;
    const amount = sanitizeTransactionAmount(req.body.amount);
    const type = sanitizeTransactionType(req.body.type);
    const description = sanitizeTransactionDescription(req.body.description);
    const transactionDate = sanitizeTransactionDate(req.body.transaction_date);

    if (!categoryId || !amount) {
      setTransactionFlash(req, 'error', 'Amount and category are required.');
      return res.redirect(redirectUrl);
    }

    const categoryRows = await getAvailableTransactionCategories(currentUserId, family ? family.id : null);
    const category = categoryRows.find((item) => item.id === categoryId);

    if (!category) {
      setTransactionFlash(req, 'error', 'Selected category is not available.');
      return res.redirect(redirectUrl);
    }

    const members = await getAvailableTransactionMembers(currentUserId, family);
    const memberExists = members.some((member) => member.id === paidByUserId);

    if (!memberExists) {
      setTransactionFlash(req, 'error', 'Selected payer is not available.');
      return res.redirect(redirectUrl);
    }

    const signedAmount = type === 'income' ? amount : -amount;
    const familyId = category.family_id ? category.family_id : null;

    await db.query(
      `
      INSERT INTO transactions (
        user_id,
        family_id,
        category_id,
        type,
        amount,
        description,
        transaction_date,
        paid_by_user_id
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        currentUserId,
        familyId,
        categoryId,
        type,
        signedAmount,
        description || null,
        transactionDate,
        paidByUserId
      ]
    );

    setTransactionFlash(req, 'success', 'Transaction created successfully.');
    return res.redirect(redirectUrl);
  } catch (error) {
    console.error('Transaction creation error:', error.message);
    setTransactionFlash(req, 'error', 'Failed to create transaction.');
    return res.redirect(buildTransactionsRedirect(req));
  }
});

router.post('/transactions/:id/update', requireAuth, async (req, res) => {
  const transactionId = Number(req.params.id);

  try {
    const currentUserId = req.session.user.id;
    const family = await getUserFamily(currentUserId);
    const redirectUrl = buildTransactionsRedirect(req);

    const categoryId = sanitizeTransactionCategoryId(req.body.category_id);
    const paidByUserId = sanitizeTransactionMemberId(req.body.paid_by_user_id) || currentUserId;
    const amount = sanitizeTransactionAmount(req.body.amount);
    const type = sanitizeTransactionType(req.body.type);
    const description = sanitizeTransactionDescription(req.body.description);
    const transactionDate = sanitizeTransactionDate(req.body.transaction_date);

    if (!transactionId || !categoryId || !amount) {
      setTransactionFlash(req, 'error', 'Invalid transaction data.');
      return res.redirect(redirectUrl);
    }

    const existingTransaction = await getTransactionByIdForUser(
      transactionId,
      currentUserId,
      family ? family.id : null
    );

    if (!existingTransaction) {
      setTransactionFlash(req, 'error', 'Transaction not found.');
      return res.redirect(redirectUrl);
    }

    const categoryRows = await getAvailableTransactionCategories(currentUserId, family ? family.id : null);
    const category = categoryRows.find((item) => item.id === categoryId);

    if (!category) {
      setTransactionFlash(req, 'error', 'Selected category is not available.');
      return res.redirect(redirectUrl);
    }

    const members = await getAvailableTransactionMembers(currentUserId, family);
    const memberExists = members.some((member) => member.id === paidByUserId);

    if (!memberExists) {
      setTransactionFlash(req, 'error', 'Selected payer is not available.');
      return res.redirect(redirectUrl);
    }

    const signedAmount = type === 'income' ? amount : -amount;
    const familyId = category.family_id ? category.family_id : null;

    await db.query(
      `
      UPDATE transactions
      SET category_id = ?, type = ?, amount = ?, description = ?, transaction_date = ?, paid_by_user_id = ?, family_id = ?
      WHERE id = ?
      LIMIT 1
      `,
      [
        categoryId,
        type,
        signedAmount,
        description || null,
        transactionDate,
        paidByUserId,
        familyId,
        transactionId
      ]
    );

    setTransactionFlash(req, 'success', 'Transaction updated successfully.');
    return res.redirect(redirectUrl);
  } catch (error) {
    console.error('Transaction update error:', error.message);
    setTransactionFlash(req, 'error', 'Failed to update transaction.');
    return res.redirect(buildTransactionsRedirect(req));
  }
});

router.post('/transactions/:id/delete', requireAuth, async (req, res) => {
  const transactionId = Number(req.params.id);

  try {
    const currentUserId = req.session.user.id;
    const family = await getUserFamily(currentUserId);
    const redirectUrl = buildTransactionsRedirect(req);

    if (!transactionId) {
      setTransactionFlash(req, 'error', 'Invalid transaction id.');
      return res.redirect(redirectUrl);
    }

    const existingTransaction = await getTransactionByIdForUser(
      transactionId,
      currentUserId,
      family ? family.id : null
    );

    if (!existingTransaction) {
      setTransactionFlash(req, 'error', 'Transaction not found.');
      return res.redirect(redirectUrl);
    }

    await db.query('DELETE FROM transactions WHERE id = ? LIMIT 1', [transactionId]);

    setTransactionFlash(req, 'success', 'Transaction deleted successfully.');
    return res.redirect(redirectUrl);
  } catch (error) {
    console.error('Transaction deletion error:', error.message);
    setTransactionFlash(req, 'error', 'Failed to delete transaction.');
    return res.redirect(buildTransactionsRedirect(req));
  }
});

module.exports = router;