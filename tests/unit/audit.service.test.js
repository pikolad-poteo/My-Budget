// Unit tests for global audit logging helpers.

jest.mock('../../scr/db', () => ({
  query: jest.fn()
}));

const db = require('../../scr/db');
const {
  createAuditLog,
  auditFromRequest,
  safeAuditFromRequest,
  getClientIp,
  getUserAgent
} = require('../../scr/audit.service');

describe('audit service', () => {
  beforeEach(() => {
    db.query.mockReset();
  });

  test('stores a normalized audit log entry', async () => {
    db.query.mockResolvedValueOnce([{}]);

    await createAuditLog({
      userId: 1,
      familyId: 2,
      action: 'USER_LOGIN_SUCCESS',
      entityType: 'user',
      entityId: 1,
      ipAddress: '127.0.0.1',
      userAgent: 'jest',
      details: { reason: 'authenticated' }
    });

    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO audit_logs'),
      [
        1,
        2,
        'USER_LOGIN_SUCCESS',
        'user',
        1,
        '127.0.0.1',
        'jest',
        JSON.stringify({ reason: 'authenticated' })
      ]
    );
  });

  test('requires an audit action', async () => {
    await expect(createAuditLog({ userId: 1 })).rejects.toThrow('Audit action is required');
    expect(db.query).not.toHaveBeenCalled();
  });

  test('uses request session and headers for request audit entries', async () => {
    db.query.mockResolvedValueOnce([{}]);

    const req = {
      session: { user: { id: 7 } },
      ip: '10.0.0.1',
      socket: {},
      get: jest.fn((name) => {
        if (name === 'x-forwarded-for') return '203.0.113.1, 10.0.0.1';
        if (name === 'user-agent') return 'Mozilla Test';
        return '';
      })
    };

    await auditFromRequest(req, {
      action: 'PASSWORD_CHANGED',
      entityType: 'user',
      entityId: 7
    });

    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO audit_logs'),
      expect.arrayContaining([7, null, 'PASSWORD_CHANGED', 'user', 7, '203.0.113.1', 'Mozilla Test'])
    );
  });

  test('safe audit does not throw when insert fails', async () => {
    db.query.mockRejectedValueOnce(new Error('table missing'));
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    await expect(safeAuditFromRequest({ session: {}, get: jest.fn(), socket: {} }, {
      action: 'USER_LOGIN_FAILED'
    })).resolves.toBeUndefined();

    expect(errorSpy).toHaveBeenCalledWith('Audit log error:', 'table missing');
    errorSpy.mockRestore();
  });

  test('extracts request metadata safely', () => {
    const req = {
      ip: '10.0.0.2',
      socket: {},
      get: jest.fn((name) => (name === 'user-agent' ? 'Agent' : ''))
    };

    expect(getClientIp(req)).toBe('10.0.0.2');
    expect(getUserAgent(req)).toBe('Agent');
  });
});
