// Unit tests for family activity logging.
// The suite verifies readable audit entries for membership, role and profile changes inside the shared family workspace.

// Mocks isolate the unit under test from the database, mail transport and runtime side effects.
jest.mock('../../scr/db', () => ({
  query: jest.fn()
}));

const db = require('../../scr/db');
const {
  logFamilyActivity,
  getFamilyActivity,
  getMemberActivity
} = require('../../scr/family.activity');

describe('family.activity', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('logFamilyActivity', () => {
    test('does not write a log when required values are missing', async () => {
      await logFamilyActivity({ familyId: null, actorUserId: 1, action: 'created' });
      await logFamilyActivity({ familyId: 1, actorUserId: null, action: 'created' });
      await logFamilyActivity({ familyId: 1, actorUserId: 1, action: '' });

      expect(db.query).not.toHaveBeenCalled();
    });

    test('writes a family activity log with default values', async () => {
      db.query.mockResolvedValueOnce([{}]);

      await logFamilyActivity({
        familyId: 7,
        actorUserId: 3,
        action: 'family_created'
      });

      expect(db.query).toHaveBeenCalledTimes(1);
      expect(db.query.mock.calls[0][0]).toContain('INSERT INTO family_activity_logs');
      expect(db.query.mock.calls[0][1]).toEqual([
        7,
        3,
        null,
        'family_created',
        'family',
        null,
        ''
      ]);
    });

    test('writes a family activity log with optional values', async () => {
      db.query.mockResolvedValueOnce([{}]);

      await logFamilyActivity({
        familyId: 4,
        actorUserId: 9,
        targetUserId: 11,
        action: 'member_removed',
        entityType: 'member',
        entityId: 11,
        description: 'Removed a viewer from the family'
      });

      expect(db.query.mock.calls[0][1]).toEqual([
        4,
        9,
        11,
        'member_removed',
        'member',
        11,
        'Removed a viewer from the family'
      ]);
    });
  });

  describe('getFamilyActivity', () => {
    test('returns activity rows for the selected family', async () => {
      const rows = [{ id: 1, action: 'family_created' }];
      db.query.mockResolvedValueOnce([rows]);

      const result = await getFamilyActivity(5, 10);

      expect(result).toBe(rows);
      expect(db.query.mock.calls[0][0]).toContain('WHERE fal.family_id = ?');
      expect(db.query.mock.calls[0][0]).toContain('LIMIT 10');
      expect(db.query.mock.calls[0][1]).toEqual([5]);
    });

    test('clamps family activity limit to a safe range', async () => {
      db.query.mockResolvedValueOnce([[]]);
      await getFamilyActivity(5, 999);

      expect(db.query.mock.calls[0][0]).toContain('LIMIT 100');

      db.query.mockClear();
      db.query.mockResolvedValueOnce([[]]);
      await getFamilyActivity(5, -10);

      expect(db.query.mock.calls[0][0]).toContain('LIMIT 1');
    });
  });

  describe('getMemberActivity', () => {
    test('returns rows for a selected family member', async () => {
      const rows = [{ id: 2, actor_user_id: 8 }];
      db.query.mockResolvedValueOnce([rows]);

      const result = await getMemberActivity(6, 8, 12);

      expect(result).toBe(rows);
      expect(db.query.mock.calls[0][0]).toContain('AND fal.actor_user_id = ?');
      expect(db.query.mock.calls[0][0]).toContain('LIMIT 12');
      expect(db.query.mock.calls[0][1]).toEqual([6, 8]);
    });

    test('uses the default member activity limit when the limit is not numeric', async () => {
      db.query.mockResolvedValueOnce([[]]);

      await getMemberActivity(6, 8, 'invalid');

      expect(db.query.mock.calls[0][0]).toContain('LIMIT 50');
    });
  });
});
