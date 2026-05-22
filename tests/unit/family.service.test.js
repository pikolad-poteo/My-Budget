// Unit tests for family service business logic.
// Database access is mocked to verify workspace membership, ownership transfer and personal-data migration rules safely.

// Mocks isolate the unit under test from the database, mail transport and runtime side effects.
jest.mock('../../scr/db', () => ({
  query: jest.fn(),
  getConnection: jest.fn()
}));

jest.mock('../../scr/family.activity', () => ({
  logFamilyActivity: jest.fn()
}));

const db = require('../../scr/db');
const { logFamilyActivity } = require('../../scr/family.activity');
const {
  getUserFamily,
  getFamilyById,
  getFamilyMembers,
  countFamilyOwners,
  countPersonalWorkspaceData,
  getPersonalWorkspaceActivity,
  updateFamilyName,
  updateFamilyMotto,
  updateFamilyAvatar,
  addFamilyMember,
  deletePersonalWorkspaceData
} = require('../../scr/family.service');

function createConnection() {
  return {
    query: jest.fn().mockResolvedValue([{}]),
    beginTransaction: jest.fn().mockResolvedValue(undefined),
    commit: jest.fn().mockResolvedValue(undefined),
    rollback: jest.fn().mockResolvedValue(undefined),
    release: jest.fn()
  };
}

describe('family.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('read helpers', () => {
    test('getUserFamily returns the first family membership row', async () => {
      const family = { id: 5, name: 'Budget Family', role: 'owner' };
      db.query.mockResolvedValueOnce([[family]]);

      const result = await getUserFamily(12);

      expect(result).toBe(family);
      expect(db.query.mock.calls[0][0]).toContain('FROM family_members fm');
      expect(db.query.mock.calls[0][0]).toContain('INNER JOIN families f');
      expect(db.query.mock.calls[0][1]).toEqual([12]);
    });

    test('getFamilyById returns null when the family is missing', async () => {
      db.query.mockResolvedValueOnce([[]]);

      await expect(getFamilyById(99)).resolves.toBeNull();
      expect(db.query.mock.calls[0][0]).toContain('SELECT * FROM families');
      expect(db.query.mock.calls[0][1]).toEqual([99]);
    });

    test('getFamilyMembers returns rows ordered by role and name', async () => {
      const members = [
        { id: 1, role: 'owner', name: 'Vlad' },
        { id: 2, role: 'viewer', name: 'Anna' }
      ];
      db.query.mockResolvedValueOnce([members]);

      const result = await getFamilyMembers(7);

      expect(result).toBe(members);
      expect(db.query.mock.calls[0][0]).toContain('CASE fm.role');
      expect(db.query.mock.calls[0][0]).toContain('u.name ASC');
      expect(db.query.mock.calls[0][1]).toEqual([7]);
    });

    test('countFamilyOwners returns a numeric owner count', async () => {
      db.query.mockResolvedValueOnce([[{ total: '2' }]]);

      await expect(countFamilyOwners(7)).resolves.toBe(2);
      expect(db.query.mock.calls[0][0]).toContain('COUNT(*) AS total');
      expect(db.query.mock.calls[0][1]).toEqual([7, 'owner']);
    });
  });

  describe('personal workspace helpers', () => {
    test('countPersonalWorkspaceData counts all personal data groups and totals them', async () => {
      db.query
        .mockResolvedValueOnce([[{ total: 2 }]])
        .mockResolvedValueOnce([[{ total: 3 }]])
        .mockResolvedValueOnce([[{ total: 4 }]])
        .mockResolvedValueOnce([[{ total: 5 }]])
        .mockResolvedValueOnce([[{ total: 6 }]]);

      const result = await countPersonalWorkspaceData(10);

      expect(result).toEqual({
        categories: 2,
        transactions: 3,
        'wishlist items': 4,
        'wishlist folders': 5,
        'calendar events': 6,
        total: 20
      });
      expect(db.query).toHaveBeenCalledTimes(5);
      expect(db.query.mock.calls[0][0]).toContain('FROM categories');
      expect(db.query.mock.calls[4][0]).toContain('FROM calendar_events');
      expect(db.query.mock.calls.every((call) => call[1][0] === 10)).toBe(true);
    });

    test('getPersonalWorkspaceActivity clamps the limit and uses the user id for each source', async () => {
      db.query.mockResolvedValueOnce([[{ id: 'category-1' }]]);

      const result = await getPersonalWorkspaceActivity(4, 999);

      expect(result).toEqual([{ id: 'category-1' }]);
      expect(db.query.mock.calls[0][0]).toContain('LIMIT 100');
      expect(db.query.mock.calls[0][1]).toEqual([4, 4, 4, 4, 4]);

      db.query.mockClear();
      db.query.mockResolvedValueOnce([[]]);
      await getPersonalWorkspaceActivity(4, 0);

      expect(db.query.mock.calls[0][0]).toContain('LIMIT 1');
    });

    test('deletePersonalWorkspaceData deletes personal records in a transaction', async () => {
      const connection = createConnection();
      db.getConnection.mockResolvedValueOnce(connection);

      await deletePersonalWorkspaceData(15);

      expect(connection.beginTransaction).toHaveBeenCalledTimes(1);
      expect(connection.query).toHaveBeenCalledTimes(5);
      expect(connection.query.mock.calls[0][0]).toContain('DELETE FROM calendar_events');
      expect(connection.query.mock.calls[4][0]).toContain('DELETE FROM categories');
      expect(connection.commit).toHaveBeenCalledTimes(1);
      expect(connection.rollback).not.toHaveBeenCalled();
      expect(connection.release).toHaveBeenCalledTimes(1);
    });

    test('deletePersonalWorkspaceData rolls back and releases the connection on error', async () => {
      const connection = createConnection();
      connection.query.mockRejectedValueOnce(new Error('delete failed'));
      db.getConnection.mockResolvedValueOnce(connection);

      await expect(deletePersonalWorkspaceData(15)).rejects.toThrow('delete failed');

      expect(connection.commit).not.toHaveBeenCalled();
      expect(connection.rollback).toHaveBeenCalledTimes(1);
      expect(connection.release).toHaveBeenCalledTimes(1);
    });
  });

  describe('family profile updates', () => {
    test('updateFamilyName rejects an empty family name before writing to the database', async () => {
      await expect(updateFamilyName({ familyId: 1, actorUserId: 2, name: '   ' })).rejects.toThrow('Family name is required.');

      expect(db.query).not.toHaveBeenCalled();
      expect(logFamilyActivity).not.toHaveBeenCalled();
    });

    test('updateFamilyName updates the family name and writes an activity entry', async () => {
      db.query
        .mockResolvedValueOnce([[{ id: 3, name: 'Old Name' }]])
        .mockResolvedValueOnce([{}]);

      await updateFamilyName({ familyId: 3, actorUserId: 8, name: '  New Name  ' });

      expect(db.query.mock.calls[1][0]).toContain('UPDATE families SET name = ?');
      expect(db.query.mock.calls[1][1]).toEqual(['New Name', 3]);
      expect(logFamilyActivity).toHaveBeenCalledWith(expect.objectContaining({
        familyId: 3,
        actorUserId: 8,
        action: 'family_name_updated',
        description: 'Changed family name from "Old Name" to "New Name".'
      }));
    });

    test('updateFamilyMotto trims long text and stores null for empty text', async () => {
      db.query
        .mockResolvedValueOnce([[{ id: 6, name: 'Family' }]])
        .mockResolvedValueOnce([{}]);

      const longMotto = `  ${'a'.repeat(160)}  `;
      await updateFamilyMotto({ familyId: 6, actorUserId: 9, motto: longMotto });

      expect(db.query.mock.calls[1][0]).toContain('UPDATE families SET motto = ?');
      expect(db.query.mock.calls[1][1][0]).toHaveLength(140);
      expect(logFamilyActivity).toHaveBeenCalledWith(expect.objectContaining({
        action: 'family_motto_updated',
        description: 'Updated family motto.'
      }));

      db.query.mockClear();
      logFamilyActivity.mockClear();
      db.query
        .mockResolvedValueOnce([[{ id: 6, name: 'Family' }]])
        .mockResolvedValueOnce([{}]);

      await updateFamilyMotto({ familyId: 6, actorUserId: 9, motto: '   ' });

      expect(db.query.mock.calls[1][1]).toEqual([null, 6]);
      expect(logFamilyActivity).toHaveBeenCalledWith(expect.objectContaining({
        description: 'Removed family motto.'
      }));
    });

    test('updateFamilyAvatar stores a trimmed avatar url and logs the update', async () => {
      db.query.mockResolvedValueOnce([{}]);

      await updateFamilyAvatar({ familyId: 6, actorUserId: 9, avatarUrl: '  /uploads/avatar.png  ' });

      expect(db.query.mock.calls[0][0]).toContain('UPDATE families SET avatar_url = ?');
      expect(db.query.mock.calls[0][1]).toEqual(['/uploads/avatar.png', 6]);
      expect(logFamilyActivity).toHaveBeenCalledWith(expect.objectContaining({
        familyId: 6,
        actorUserId: 9,
        action: 'family_avatar_updated',
        description: 'Updated family avatar.'
      }));
    });
  });

  describe('family member management', () => {
    test('addFamilyMember rejects a missing email before searching for users', async () => {
      await expect(addFamilyMember({ familyId: 1, actorUserId: 2, email: '   ' })).rejects.toThrow('Email is required.');

      expect(db.query).not.toHaveBeenCalled();
    });

    test('addFamilyMember rejects an email that does not belong to an existing user', async () => {
      db.query.mockResolvedValueOnce([[]]);

      await expect(addFamilyMember({ familyId: 1, actorUserId: 2, email: 'missing@example.com' })).rejects.toThrow('User with this email was not found.');

      expect(db.query.mock.calls[0][0]).toContain('FROM users');
      expect(db.query.mock.calls[0][1]).toEqual(['missing@example.com']);
    });

    test('addFamilyMember inserts a normalized role and logs the activity', async () => {
      const user = { id: 22, name: 'Anna', email: 'anna@example.com' };
      db.query
        .mockResolvedValueOnce([[user]])
        .mockResolvedValueOnce([[]])
        .mockResolvedValueOnce([{}]);

      const result = await addFamilyMember({
        familyId: 5,
        actorUserId: 1,
        email: '  ANNA@example.com  ',
        role: 'invalid-role'
      });

      expect(result).toBe(user);
      expect(db.query.mock.calls[0][1]).toEqual(['anna@example.com']);
      expect(db.query.mock.calls[2][0]).toContain('INSERT INTO family_members');
      expect(db.query.mock.calls[2][1]).toEqual([5, 22, 'viewer']);
      expect(logFamilyActivity).toHaveBeenCalledWith(expect.objectContaining({
        familyId: 5,
        actorUserId: 1,
        targetUserId: 22,
        action: 'member_added',
        description: 'Added Anna as viewer.'
      }));
    });
  });
});
