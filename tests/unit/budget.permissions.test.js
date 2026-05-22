// Unit tests for budget editing permissions.
// The suite verifies that personal users, family owners and editors can modify budget data, while viewers are blocked safely.

// Mocks isolate the unit under test from the database, mail transport and runtime side effects.
jest.mock('../../scr/family.service', () => ({
  getUserFamily: jest.fn()
}));

const { getUserFamily } = require('../../scr/family.service');
const {
  VIEWER_BLOCK_MESSAGE,
  getCanEditBudget,
  requireBudgetEditor
} = require('../../scr/budget.permissions');

function createReq({ userId = 1, referrer } = {}) {
  return {
    session: {
      user: userId ? { id: userId } : null
    },
    get: jest.fn((header) => {
      if (header === 'Referrer' || header === 'Referer') return referrer;
      return undefined;
    })
  };
}

function createRes() {
  return {
    locals: {},
    redirect: jest.fn()
  };
}

describe('budget.permissions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getCanEditBudget', () => {
    test('allows editing when the user is not in a family', () => {
      expect(getCanEditBudget(null)).toBe(true);
    });

    test('allows owners and editors to edit budget data', () => {
      expect(getCanEditBudget({ role: 'owner' })).toBe(true);
      expect(getCanEditBudget({ role: 'editor' })).toBe(true);
    });

    test('blocks viewers from editing budget data', () => {
      expect(getCanEditBudget({ role: 'viewer' })).toBe(false);
    });
  });

  describe('requireBudgetEditor', () => {
    test('redirects anonymous users to login', async () => {
      const req = createReq({ userId: null });
      const res = createRes();
      const next = jest.fn();

      await requireBudgetEditor('transactions')(req, res, next);

      expect(res.redirect).toHaveBeenCalledWith('/login');
      expect(next).not.toHaveBeenCalled();
      expect(getUserFamily).not.toHaveBeenCalled();
    });

    test('allows users without a family to continue', async () => {
      getUserFamily.mockResolvedValueOnce(null);
      const req = createReq({ userId: 3 });
      const res = createRes();
      const next = jest.fn();

      await requireBudgetEditor('categories')(req, res, next);

      expect(getUserFamily).toHaveBeenCalledWith(3);
      expect(res.locals.family).toBeNull();
      expect(res.locals.canEditBudget).toBe(true);
      expect(next).toHaveBeenCalledTimes(1);
    });

    test('allows family editors to continue', async () => {
      const family = { id: 2, role: 'editor' };
      getUserFamily.mockResolvedValueOnce(family);
      const req = createReq({ userId: 4 });
      const res = createRes();
      const next = jest.fn();

      await requireBudgetEditor('wishlist')(req, res, next);

      expect(req.userFamily).toBe(family);
      expect(res.locals.family).toBe(family);
      expect(res.locals.canEditBudget).toBe(true);
      expect(next).toHaveBeenCalledTimes(1);
    });

    test('blocks family viewers and redirects back to the referrer path', async () => {
      getUserFamily.mockResolvedValueOnce({ id: 2, role: 'viewer' });
      const req = createReq({
        userId: 5,
        referrer: 'http://localhost:3000/transactions?type=income'
      });
      const res = createRes();
      const next = jest.fn();

      await requireBudgetEditor('transactions')(req, res, next);

      expect(req.session.transactionFlash).toEqual({
        type: 'error',
        message: VIEWER_BLOCK_MESSAGE
      });
      expect(res.redirect).toHaveBeenCalledWith('/transactions?type=income');
      expect(next).not.toHaveBeenCalled();
    });

    test('uses the page fallback redirect when permission check fails', async () => {
      getUserFamily.mockRejectedValueOnce(new Error('Database unavailable'));
      const req = createReq({ userId: 5 });
      const res = createRes();
      const next = jest.fn();
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      await requireBudgetEditor('calendar')(req, res, next);

      expect(req.session.calendarFlash).toEqual({
        type: 'error',
        message: 'Failed to check your family permissions.'
      });
      expect(res.redirect).toHaveBeenCalledWith('/calendar');
      expect(next).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });
});
