// Unit tests for family role permissions.
// These tests define the expected capabilities of owner, editor and viewer roles across family-management actions.

const {
  FAMILY_ROLES,
  normalizeRole,
  isOwner,
  isEditor,
  isViewer,
  canManageFamily,
  canManageMembers,
  canDeleteFamily,
  canEditBudget,
  canViewBudget,
  getRoleLabel
} = require('../../scr/family.permissions');

describe('family.permissions helpers', () => {
  test('normalizes unknown or missing roles to viewer', () => {
    expect(normalizeRole('unknown')).toBe(FAMILY_ROLES.VIEWER);
    expect(normalizeRole()).toBe(FAMILY_ROLES.VIEWER);
  });

  test('detects each supported family role', () => {
    expect(isOwner(FAMILY_ROLES.OWNER)).toBe(true);
    expect(isEditor(FAMILY_ROLES.EDITOR)).toBe(true);
    expect(isViewer(FAMILY_ROLES.VIEWER)).toBe(true);
  });

  test('allows only owners to manage family-level settings and members', () => {
    expect(canManageFamily(FAMILY_ROLES.OWNER)).toBe(true);
    expect(canManageMembers(FAMILY_ROLES.OWNER)).toBe(true);
    expect(canDeleteFamily(FAMILY_ROLES.OWNER)).toBe(true);

    expect(canManageFamily(FAMILY_ROLES.EDITOR)).toBe(false);
    expect(canManageMembers(FAMILY_ROLES.EDITOR)).toBe(false);
    expect(canDeleteFamily(FAMILY_ROLES.EDITOR)).toBe(false);

    expect(canManageFamily(FAMILY_ROLES.VIEWER)).toBe(false);
    expect(canManageMembers(FAMILY_ROLES.VIEWER)).toBe(false);
    expect(canDeleteFamily(FAMILY_ROLES.VIEWER)).toBe(false);
  });

  test('allows owners and editors to edit budget data', () => {
    expect(canEditBudget(FAMILY_ROLES.OWNER)).toBe(true);
    expect(canEditBudget(FAMILY_ROLES.EDITOR)).toBe(true);
    expect(canEditBudget(FAMILY_ROLES.VIEWER)).toBe(false);
  });

  test('allows all normalized family roles to view budget data', () => {
    expect(canViewBudget(FAMILY_ROLES.OWNER)).toBe(true);
    expect(canViewBudget(FAMILY_ROLES.EDITOR)).toBe(true);
    expect(canViewBudget(FAMILY_ROLES.VIEWER)).toBe(true);
    expect(canViewBudget('invalid')).toBe(true);
  });

  test('returns readable role labels', () => {
    expect(getRoleLabel(FAMILY_ROLES.OWNER)).toBe('Owner');
    expect(getRoleLabel(FAMILY_ROLES.EDITOR)).toBe('Editor');
    expect(getRoleLabel(FAMILY_ROLES.VIEWER)).toBe('Viewer');
    expect(getRoleLabel('invalid')).toBe('Viewer');
  });
});
