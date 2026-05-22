// Unit tests for wishlist utility helpers.
// The suite verifies folder-aware filtering, buyer/member selection, status handling and safe redirects for wishlist routes.

// Mocks isolate the unit under test from the database, mail transport and runtime side effects.
jest.mock('../../scr/db', () => ({
  query: jest.fn()
}));

const db = require('../../scr/db');

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
  buildWishlistSummary,
  WISHLIST_STATUSES
} = require('../../scr/wishlist.utils');

describe('wishlist utility helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
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


  test('keeps wishlist detail return paths and rejects unsafe redirects', () => {
    expect(buildWishlistRedirect({
      body: { return_to: '/wishlist/25', status: 'planned' },
      query: {}
    })).toBe('/wishlist/25?status=planned');

    expect(buildWishlistRedirect({
      body: { return_to: 'https://bad.example', status: 'planned' },
      query: {}
    })).toBe('/wishlist?status=planned');

    expect(buildWishlistRedirect({
      body: { return_to: '//bad.example', status: 'planned' },
      query: {}
    })).toBe('/wishlist?status=planned');
  });

  test('loads wishlist items with workspace, filter and sorting clauses', async () => {
    const rows = [{ id: 1, title: 'Phone' }];
    db.query.mockResolvedValueOnce([rows]);

    const result = await getWishlistItemsForUser({
      userId: 4,
      familyId: 9,
      filters: {
        status: 'planned',
        folder: 'Gifts',
        q: 'phone',
        buyer: '7',
        sort: 'price_desc'
      }
    });

    expect(result).toBe(rows);
    expect(db.query.mock.calls[0][0]).toContain('w.family_id = ?');
    expect(db.query.mock.calls[0][0]).toContain('w.status = ?');
    expect(db.query.mock.calls[0][0]).toContain('w.folder = ?');
    expect(db.query.mock.calls[0][0]).toContain('w.user_id = ?');
    expect(db.query.mock.calls[0][0]).toContain('ORDER BY w.amount DESC');
    expect(db.query.mock.calls[0][1]).toEqual([9, 'planned', 'Gifts', '%phone%', '%phone%', '%phone%', 7]);
  });

  test('returns one wishlist item only from the current workspace', async () => {
    const item = { id: 3, title: 'Laptop' };
    db.query.mockResolvedValueOnce([[item]]);

    await expect(getWishlistItemByIdForUser(3, 5, null)).resolves.toBe(item);
    expect(db.query.mock.calls[0][0]).toContain('w.id = ?');
    expect(db.query.mock.calls[0][0]).toContain('w.user_id = ? AND w.family_id IS NULL');
    expect(db.query.mock.calls[0][1]).toEqual([3, 5]);

    db.query.mockResolvedValueOnce([[]]);
    await expect(getWishlistItemByIdForUser(99, 5, null)).resolves.toBeNull();
  });

  test('loads wishlist folder names from explicit folders and item folders', async () => {
    db.query
      .mockResolvedValueOnce([[{ name: 'Travel' }, { name: 'General' }]])
      .mockResolvedValueOnce([[{ name: 'Birthday' }, { name: 'Travel' }]]);

    const result = await getWishlistFoldersForUser(8, null);

    expect(result).toEqual(['Birthday', 'Travel']);
    expect(db.query).toHaveBeenCalledTimes(2);
  });

  test('builds wishlist folder cards and keeps owner information', async () => {
    db.query
      .mockResolvedValueOnce([[{
        name: 'Travel',
        user_id: 11,
        owner_name: 'Anna',
        owner_role: 'editor'
      }]])
      .mockResolvedValueOnce([[{
        name: 'Gifts',
        user_id: 10,
        owner_name: 'Vlad',
        owner_role: 'owner'
      }]]);

    const result = await getWishlistFolderCardsForUser(10, 6, 'all');

    expect(result).toEqual([
      expect.objectContaining({ name: 'Travel', user_id: 11, owner_name: 'Anna', owner_role: 'editor' }),
      expect.objectContaining({ name: 'Gifts', user_id: 10, owner_name: 'Vlad', owner_role: 'owner' })
    ]);
    expect(db.query.mock.calls[0][0]).toContain('FROM wishlist_folders wf');
    expect(db.query.mock.calls[1][0]).toContain('FROM wishlist_items w');
  });

  test('ensures, renames and deletes wishlist folders with safe workspace conditions', async () => {
    db.query.mockResolvedValue([{}]);

    await ensureWishlistFolder(5, 2, '  Travel  ');
    expect(db.query.mock.calls[0][0]).toContain('INSERT IGNORE INTO wishlist_folders');
    expect(db.query.mock.calls[0][1]).toEqual([5, 2, 'Travel']);

    db.query.mockClear();
    await renameWishlistFolder({
      userId: 5,
      familyId: 2,
      oldName: 'Old folder',
      newName: 'New folder',
      oldUserId: 5,
      newUserId: 7
    });

    expect(db.query.mock.calls[0][0]).toContain('INSERT IGNORE INTO wishlist_folders');
    expect(db.query.mock.calls[1][0]).toContain('UPDATE wishlist_items SET user_id = ?, folder = ?');
    expect(db.query.mock.calls[1][1]).toEqual([7, 'New folder', 'Old folder', 5, 2]);
    expect(db.query.mock.calls[2][0]).toContain('DELETE FROM wishlist_folders');

    db.query.mockClear();
    await deleteWishlistFolder({
      userId: 5,
      familyId: null,
      folderName: 'Old folder',
      deleteAction: 'unlink_items',
      ownerId: 5
    });

    expect(db.query.mock.calls[0][0]).toContain('UPDATE wishlist_items SET folder = ?');
    expect(db.query.mock.calls[0][1]).toEqual([null, 'Old folder', 5, 5]);
  });

  test('syncs selected wishlist folder items and leaves folder empty when no ids are selected', async () => {
    db.query.mockResolvedValue([{}]);

    await syncWishlistFolderItems({
      userId: 5,
      familyId: 2,
      targetFolder: 'Travel',
      targetOwnerId: 7,
      selectedItemIds: ['1', 'bad', '2']
    });

    expect(db.query.mock.calls[0][0]).toContain('INSERT IGNORE INTO wishlist_folders');
    expect(db.query.mock.calls[1][0]).toContain('SET w.folder = NULL');
    expect(db.query.mock.calls[2][0]).toContain('WHERE w.id IN (?, ?)');
    expect(db.query.mock.calls[2][1]).toEqual(['Travel', 1, 2, 7, 2]);

    db.query.mockClear();
    await syncWishlistFolderItems({
      userId: 5,
      familyId: 2,
      targetFolder: 'Travel',
      targetOwnerId: 7,
      selectedItemIds: []
    });

    expect(db.query).toHaveBeenCalledTimes(2);
  });

  test('loads current wishlist balance from the active workspace', async () => {
    db.query.mockResolvedValueOnce([[{ balance: '123.45' }]]);

    await expect(getCurrentBalanceForUser(5, null)).resolves.toBe(123.45);
    expect(db.query.mock.calls[0][0]).toContain('FROM transactions');
    expect(db.query.mock.calls[0][1]).toEqual([5]);
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
