// Unit tests for transaction utility helpers.
// These tests cover filter normalization, sorting options, workspace SQL conditions and redirect preservation for transactions.

const {
  sanitizeTransactionType,
  sanitizeTransactionDescription,
  sanitizeTransactionAmount,
  sanitizeTransactionDate,
  sanitizeTransactionMemberId,
  sanitizeTransactionCategoryId,
  sanitizeTransactionFilterType,
  sanitizeTransactionView,
  sanitizeTransactionSortDir,
  buildTransactionsRedirect,
  setTransactionFlash,
  getDefaultTransactionDates
} = require('../../scr/transaction.utils');

describe('transaction utility helpers', () => {
  test('sanitizes transaction type using category type rules', () => {
    expect(sanitizeTransactionType('income')).toBe('income');
    expect(sanitizeTransactionType('expense')).toBe('expense');
    expect(sanitizeTransactionType('transfer')).toBe('expense');
  });

  test('sanitizes transaction descriptions', () => {
    const result = sanitizeTransactionDescription(`  Salary    payment ${'x'.repeat(300)}  `);

    expect(result).toMatch(/^Salary payment/);
    expect(result).toHaveLength(255);
    expect(result).not.toContain('  ');
  });

  test('sanitizes positive transaction amounts and rejects invalid values', () => {
    expect(sanitizeTransactionAmount('12,345')).toBe(12.35);
    expect(sanitizeTransactionAmount('100')).toBe(100);
    expect(sanitizeTransactionAmount('0')).toBeNull();
    expect(sanitizeTransactionAmount('-5')).toBeNull();
    expect(sanitizeTransactionAmount('abc')).toBeNull();
  });

  test('accepts only simple yyyy-mm-dd transaction dates', () => {
    expect(sanitizeTransactionDate('2026-05-20')).toBe('2026-05-20');
    expect(sanitizeTransactionDate('bad-date')).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  test('sanitizes member and category ids', () => {
    expect(sanitizeTransactionMemberId('5')).toBe(5);
    expect(sanitizeTransactionMemberId('0')).toBeNull();
    expect(sanitizeTransactionMemberId('abc')).toBeNull();

    expect(sanitizeTransactionCategoryId('9')).toBe(9);
    expect(sanitizeTransactionCategoryId('-1')).toBeNull();
  });

  test('sanitizes filter, view and direction values', () => {
    expect(sanitizeTransactionFilterType('income')).toBe('income');
    expect(sanitizeTransactionFilterType('expense')).toBe('expense');
    expect(sanitizeTransactionFilterType('other')).toBe('all');

    expect(sanitizeTransactionView('expenses')).toBe('expenses');
    expect(sanitizeTransactionView('income')).toBe('income');
    expect(sanitizeTransactionView('unknown')).toBe('date');

    expect(sanitizeTransactionSortDir('asc')).toBe('asc');
    expect(sanitizeTransactionSortDir('desc')).toBe('desc');
    expect(sanitizeTransactionSortDir('bad')).toBe('desc');
  });

  test('builds transactions redirect from preserved filters', () => {
    const req = {
      body: {
        redirectFrom: '2026-05-01',
        redirectTo: '2026-05-20',
        redirectCategory: '2',
        redirectType: 'expense',
        redirectMember: 'all',
        redirectView: 'date',
        redirectDir: 'desc',
        redirectShowAll: '1'
      },
      query: {}
    };

    expect(buildTransactionsRedirect(req)).toBe('/transactions?from=2026-05-01&to=2026-05-20&category=2&type=expense&member=all&view=date&dir=desc&showAll=1');
    expect(buildTransactionsRedirect({ body: {}, query: {} })).toBe('/transactions?category=all&type=all&member=all&view=date&dir=desc');
  });

  test('stores transaction flash messages in session', () => {
    const req = { session: {} };

    setTransactionFlash(req, 'danger', 'Failed');

    expect(req.session.transactionFlash).toEqual({ type: 'danger', message: 'Failed' });
  });

  test('returns default transaction date range in yyyy-mm-dd format', () => {
    const dates = getDefaultTransactionDates();

    expect(dates.from).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(dates.to).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(new Date(dates.from).getTime()).toBeLessThanOrEqual(new Date(dates.to).getTime());
  });
});
