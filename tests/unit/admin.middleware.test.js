// Unit tests for admin middleware access checks.

jest.mock('../../scr/db', () => ({
  query: jest.fn()
}));

const db = require('../../scr/db');
const { isGlobalAdmin, isSupportAdmin, isAdminUser, requireAdminUser } = require('../../scr/admin.middleware');

function createReq(user = { id: 1 }) {
  return {
    session: { user },
    t: (key) => key
  };
}

function createRes() {
  return {
    redirect: jest.fn(),
    render: jest.fn(),
    status: jest.fn(function status() {
      return this;
    })
  };
}

describe('admin middleware', () => {
  beforeEach(() => {
    db.query.mockReset();
  });

  test('recognizes active admin roles', () => {
    expect(isGlobalAdmin({ status: 'active', global_role: 'global_admin' })).toBe(true);
    expect(isGlobalAdmin({ status: 'blocked', global_role: 'global_admin' })).toBe(false);
    expect(isGlobalAdmin({ status: 'active', global_role: 'support_admin' })).toBe(false);

    expect(isSupportAdmin({ status: 'active', global_role: 'support_admin' })).toBe(true);
    expect(isSupportAdmin({ status: 'blocked', global_role: 'support_admin' })).toBe(false);

    expect(isAdminUser({ status: 'active', global_role: 'global_admin' })).toBe(true);
    expect(isAdminUser({ status: 'active', global_role: 'support_admin' })).toBe(true);
    expect(isAdminUser({ status: 'active', global_role: 'user' })).toBe(false);
  });

  test('redirects guests to login', async () => {
    const req = createReq(null);
    const res = createRes();
    const next = jest.fn();

    await requireAdminUser(req, res, next);

    expect(res.redirect).toHaveBeenCalledWith('/login');
    expect(next).not.toHaveBeenCalled();
    expect(db.query).not.toHaveBeenCalled();
  });

  test('allows active global admins and refreshes session role', async () => {
    db.query.mockResolvedValueOnce([[
      {
        id: 1,
        name: 'Admin',
        email: 'admin@test.local',
        avatar_url: null,
        status: 'active',
        global_role: 'global_admin'
      }
    ]]);

    const req = createReq({ id: 1, name: 'Old', email: 'old@test.local' });
    const res = createRes();
    const next = jest.fn();

    await requireAdminUser(req, res, next);

    expect(req.adminUser.global_role).toBe('global_admin');
    expect(req.session.user.global_role).toBe('global_admin');
    expect(next).toHaveBeenCalledTimes(1);
  });

  test('allows active support admins with limited admin access', async () => {
    db.query.mockResolvedValueOnce([[
      {
        id: 3,
        name: 'Support',
        email: 'support@test.local',
        avatar_url: null,
        status: 'active',
        global_role: 'support_admin'
      }
    ]]);

    const req = createReq({ id: 3 });
    const res = createRes();
    const next = jest.fn();

    await requireAdminUser(req, res, next);

    expect(req.adminUser.global_role).toBe('support_admin');
    expect(req.session.user.global_role).toBe('support_admin');
    expect(next).toHaveBeenCalledTimes(1);
  });

  test('renders forbidden for non-admin users', async () => {
    db.query.mockResolvedValueOnce([[
      {
        id: 2,
        name: 'User',
        email: 'user@test.local',
        avatar_url: null,
        status: 'active',
        global_role: 'user'
      }
    ]]);

    const req = createReq({ id: 2 });
    const res = createRes();
    const next = jest.fn();

    await requireAdminUser(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.render).toHaveBeenCalledWith('errors/403', expect.objectContaining({ activePage: '' }));
    expect(next).not.toHaveBeenCalled();
  });
});
