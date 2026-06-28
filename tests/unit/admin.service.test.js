// Unit tests for admin service normalization and database calls.

jest.mock('../../scr/db', () => ({
  query: jest.fn()
}));

const db = require('../../scr/db');
const {
  normalizeUserStatus,
  normalizeGlobalRole,
  getUsers,
  updateUserStatus,
  updateUserGlobalRole
} = require('../../scr/admin.service');

describe('admin service', () => {
  beforeEach(() => {
    db.query.mockReset();
  });

  test('normalizes user status and global role values', () => {
    expect(normalizeUserStatus('active')).toBe('active');
    expect(normalizeUserStatus('unexpected')).toBe('all');
    expect(normalizeGlobalRole('global_admin')).toBe('global_admin');
    expect(normalizeGlobalRole('owner')).toBe('all');
  });

  test('loads users with sanitized filters', async () => {
    db.query
      .mockResolvedValueOnce([[{ id: 1, email: 'admin@test.local' }]])
      .mockResolvedValueOnce([[{ total: 1 }]]);

    const result = await getUsers({ search: 'admin', status: 'active', role: 'global_admin' });

    expect(db.query).toHaveBeenCalledTimes(2);
    expect(db.query.mock.calls[0][0]).toContain('WHERE');
    expect(db.query.mock.calls[0][1]).toEqual(expect.arrayContaining(['%admin%', '%admin%', 'active', 'global_admin']));
    expect(result.users).toHaveLength(1);
    expect(result.total).toBe(1);
  });

  test('updates user status and role', async () => {
    db.query
      .mockResolvedValueOnce([{ affectedRows: 1 }])
      .mockResolvedValueOnce([{ affectedRows: 1 }]);

    await expect(updateUserStatus(2, 'blocked')).resolves.toBe(true);
    await expect(updateUserGlobalRole(2, 'support_admin')).resolves.toBe(true);

    expect(db.query).toHaveBeenNthCalledWith(1, expect.stringContaining('UPDATE users SET status'), ['blocked', 2]);
    expect(db.query).toHaveBeenNthCalledWith(2, expect.stringContaining('UPDATE users SET global_role'), ['support_admin', 2]);
  });
});
