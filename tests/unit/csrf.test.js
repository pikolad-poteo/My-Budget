const {
  shouldSkipCsrf,
  getRequestToken,
  areTokensEqual,
  attachCsrfToken,
  validateCsrfToken
} = require('../../scr/csrf');

describe('csrf middleware', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalCsrfDisabled = process.env.CSRF_DISABLED;

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    process.env.CSRF_DISABLED = originalCsrfDisabled;
  });

  test('skips csrf validation in test environment', () => {
    process.env.NODE_ENV = 'test';
    process.env.CSRF_DISABLED = 'false';

    expect(shouldSkipCsrf()).toBe(true);
  });

  test('can be disabled explicitly for local debugging', () => {
    process.env.NODE_ENV = 'development';
    process.env.CSRF_DISABLED = 'true';

    expect(shouldSkipCsrf()).toBe(true);
  });

  test('reads token from body, query or headers', () => {
    expect(getRequestToken({ body: { _csrf: 'body-token' }, query: {}, get: jest.fn() })).toBe('body-token');
    expect(getRequestToken({ body: {}, query: { _csrf: 'query-token' }, get: jest.fn() })).toBe('query-token');
    expect(getRequestToken({ body: {}, query: {}, get: (name) => (name === 'x-csrf-token' ? 'header-token' : '') })).toBe('header-token');
  });

  test('compares matching tokens safely', () => {
    expect(areTokensEqual('abc123', 'abc123')).toBe(true);
    expect(areTokensEqual('abc123', 'wrong')).toBe(false);
    expect(areTokensEqual('', 'abc123')).toBe(false);
  });

  test('attachCsrfToken creates a session token for views', () => {
    process.env.NODE_ENV = 'development';
    process.env.CSRF_DISABLED = 'false';

    const req = { session: {} };
    const res = { locals: {} };
    const next = jest.fn();

    attachCsrfToken(req, res, next);

    expect(req.session.csrfToken).toBeTruthy();
    expect(res.locals.csrfToken).toBe(req.session.csrfToken);
    expect(next).toHaveBeenCalledTimes(1);
  });

  test('validateCsrfToken rejects unsafe requests with a missing token', () => {
    process.env.NODE_ENV = 'development';
    process.env.CSRF_DISABLED = 'false';

    const req = {
      method: 'POST',
      session: { csrfToken: 'valid-token' },
      body: {},
      query: {},
      get: jest.fn(),
      t: (key) => key
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      render: jest.fn()
    };
    const next = jest.fn();

    validateCsrfToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.render).toHaveBeenCalledWith('errors/403', expect.objectContaining({
      message: 'errors.csrf.description'
    }));
    expect(next).not.toHaveBeenCalled();
  });

  test('validateCsrfToken allows unsafe requests with a valid token', () => {
    process.env.NODE_ENV = 'development';
    process.env.CSRF_DISABLED = 'false';

    const req = {
      method: 'POST',
      session: { csrfToken: 'valid-token' },
      body: { _csrf: 'valid-token' },
      query: {},
      get: jest.fn()
    };
    const res = { status: jest.fn(), render: jest.fn() };
    const next = jest.fn();

    validateCsrfToken(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });
});
