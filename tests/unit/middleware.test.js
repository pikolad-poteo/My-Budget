// Unit tests for Express authentication middleware.
// These checks confirm that protected routes require a session user and anonymous users are redirected to login.

const { attachUser, requireAuth, renderForbidden } = require('../../scr/middleware');

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
    redirect: jest.fn(),
    render: jest.fn(),
    status: jest.fn(function status() {
      return this;
    })
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

  describe('renderForbidden', () => {
    test('renders the shared 403 page with an optional message', () => {
      const req = createReq({ id: 3 });
      const res = createRes();

      renderForbidden(req, res, 'Only admins can open this page.');

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.render).toHaveBeenCalledWith('errors/403', {
        title: 'Access denied',
        activePage: '',
        message: 'Only admins can open this page.'
      });
    });
  });
});
