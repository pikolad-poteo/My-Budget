// Unit tests for shared rate limiter helpers used by authentication routes.

const { rateLimitHandler, shouldSkipRateLimit } = require('../../scr/rateLimiters');

describe('rate limiter helpers', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalDisabled = process.env.RATE_LIMIT_DISABLED;

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    process.env.RATE_LIMIT_DISABLED = originalDisabled;
  });

  test('skips rate limiting during test runs', () => {
    process.env.NODE_ENV = 'test';
    process.env.RATE_LIMIT_DISABLED = 'false';

    expect(shouldSkipRateLimit()).toBe(true);
  });

  test('supports explicit rate limit disable flag', () => {
    process.env.NODE_ENV = 'development';
    process.env.RATE_LIMIT_DISABLED = 'true';

    expect(shouldSkipRateLimit()).toBe(true);
  });

  test('keeps rate limiting enabled by default outside tests', () => {
    process.env.NODE_ENV = 'development';
    process.env.RATE_LIMIT_DISABLED = 'false';

    expect(shouldSkipRateLimit()).toBe(false);
  });

  test('renders the localized login page error instead of sending plain text', () => {
    const req = {
      path: '/login',
      body: { email: 'demo@test.local' },
      t: jest.fn((key) => {
        const messages = {
          'auth.messages.tooManyAttempts': 'Too many attempts.',
          'auth.loginTitle': 'Login'
        };
        return messages[key] || key;
      })
    };
    const res = {
      status: jest.fn(function status() {
        return this;
      }),
      render: jest.fn()
    };

    rateLimitHandler(req, res);

    expect(req.t).toHaveBeenCalledWith('auth.messages.tooManyAttempts');
    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.render).toHaveBeenCalledWith('login', expect.objectContaining({
      title: 'Login',
      activePage: 'login',
      errorMessage: 'Too many attempts.',
      successMessage: '',
      email: 'demo@test.local'
    }));
  });
});
