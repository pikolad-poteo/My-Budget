// Unit tests for Express authentication middleware.
// These checks confirm that protected routes require a session user and anonymous users are redirected to login.

const { attachUser, requireAuth } = require('../../scr/middleware');

function createReq(user) {
  return {
    session: {
      user
    }
  };
}

function createRes() {
  return {
    locals: {},
    redirect: jest.fn()
  };
}

describe('middleware', () => {
  describe('attachUser', () => {
    test('copies the session user to res.locals.currentUser', () => {
      const user = { id: 1, name: 'Student' };
      const req = createReq(user);
      const res = createRes();
      const next = jest.fn();

      attachUser(req, res, next);

      expect(res.locals.currentUser).toBe(user);
      expect(next).toHaveBeenCalledTimes(1);
    });

    test('sets currentUser to null when session user is missing', () => {
      const req = createReq(null);
      const res = createRes();
      const next = jest.fn();

      attachUser(req, res, next);

      expect(res.locals.currentUser).toBeNull();
      expect(next).toHaveBeenCalledTimes(1);
    });
  });

  describe('requireAuth', () => {
    test('redirects guests to login', () => {
      const req = createReq(null);
      const res = createRes();
      const next = jest.fn();

      requireAuth(req, res, next);

      expect(res.redirect).toHaveBeenCalledWith('/login');
      expect(next).not.toHaveBeenCalled();
    });

    test('allows authenticated users to continue', () => {
      const req = createReq({ id: 2 });
      const res = createRes();
      const next = jest.fn();

      requireAuth(req, res, next);

      expect(res.redirect).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalledTimes(1);
    });
  });
});
