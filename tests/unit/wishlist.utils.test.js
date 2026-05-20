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
  buildWishlistSummary,
  WISHLIST_STATUSES
} = require('../../scr/wishlist.utils');

describe('wishlist utility helpers', () => {
  test('sanitizes wishlist text and prefers the latest non-empty array value', () => {
    expect(sanitizeWishlistText('  New phone  ', 20)).toBe('New phone');
    expect(sanitizeWishlistText(['', 'Old title', '  New title  '], 20)).toBe('New title');
    expect(sanitizeWishlistText('x'.repeat(300), 100)).toHaveLength(100);
  });

  test('normalizes folder names and removes reserved folder labels', () => {
    expect(normalizeWishlistFolderName('  Birthday gifts  ')).toBe('Birthday gifts');
    expect(normalizeWishlistFolderName('General')).toBe('');
    expect(normalizeWishlistFolderName('All')).toBe('');
    expect(normalizeWishlistFolderName('General, Travel')).toBe('Travel');
  });

  test('sanitizes wishlist amounts', () => {
    expect(sanitizeWishlistAmount('19.999')).toBe(20);
    expect(sanitizeWishlistAmount('45.555')).toBe(45.56);
    expect(sanitizeWishlistAmount('0')).toBeNull();
    expect(sanitizeWishlistAmount('-3')).toBeNull();
    expect(sanitizeWishlistAmount('abc')).toBeNull();
  });

  test('sanitizes statuses, filter statuses and sort values', () => {
    expect(WISHLIST_STATUSES).toEqual(['planned', 'postponed', 'bought', 'cancelled']);

    expect(sanitizeWishlistStatus('bought')).toBe('bought');
    expect(sanitizeWishlistStatus('unknown')).toBe('planned');

    expect(sanitizeWishlistFilterStatus('cancelled')).toBe('cancelled');
    expect(sanitizeWishlistFilterStatus('unknown')).toBe('all');

    expect(sanitizeWishlistSort('price_desc')).toBe('price_desc');
    expect(sanitizeWishlistSort('unknown')).toBe('newest');
  });

  test('sanitizes optional dates and urls', () => {
    expect(sanitizeWishlistDate('2026-05-20')).toBe('2026-05-20');
    expect(sanitizeWishlistDate('')).toBeNull();
    expect(sanitizeWishlistDate('20.05.2026')).toBeNull();

    expect(sanitizeWishlistUrl('/uploads/wishlist/item.png')).toBe('/uploads/wishlist/item.png');
    expect(sanitizeWishlistUrl('https://example.com/item')).toBe('https://example.com/item');
    expect(sanitizeWishlistUrl('example.com/item')).toBe('https://example.com/item');
    expect(sanitizeWishlistUrl('')).toBeNull();
  });

  test('builds wishlist redirect from body and query filters', () => {
    const req = {
      body: { status: 'planned', folder: 'Gifts', q: 'phone' },
      query: { sort: 'price_desc', buyer: '3' }
    };

    expect(buildWishlistRedirect(req)).toBe('/wishlist?status=planned&folder=Gifts&q=phone&sort=price_desc&buyer=3');
    expect(buildWishlistRedirect({ body: {}, query: {} }, '/wishlist/folders')).toBe('/wishlist/folders');
  });

  test('stores wishlist flash messages in session', () => {
    const req = { session: {} };

    setWishlistFlash(req, 'success', 'Saved');

    expect(req.session.wishlistFlash).toEqual({ type: 'success', message: 'Saved' });
  });

  test('builds wishlist summary totals', () => {
    const summary = buildWishlistSummary([
      { amount: 100, status: 'planned' },
      { amount: '50.50', status: 'planned' },
      { amount: 20, status: 'postponed' },
      { amount: 30, status: 'bought' },
      { amount: 10, status: 'cancelled' }
    ], 500);

    expect(summary).toEqual({
      balance: 500,
      totalItems: 5,
      plannedTotal: 150.5,
      postponedTotal: 20,
      boughtTotal: 30,
      plannedCount: 2,
      boughtCount: 1,
      balanceAfterPlans: 349.5
    });
  });
});
