/**
 * Central role definitions for the shared family workspace.
 * The rest of the application should use these values instead of hard-coded role strings.
 */
const FAMILY_ROLES = {
  OWNER: 'owner',
  EDITOR: 'editor',
  VIEWER: 'viewer'
};

const FAMILY_ROLE_LABELS = {
  owner: 'Owner',
  editor: 'Editor',
  viewer: 'Viewer'
};

/**
 * Converts unknown or missing role values to the safest read-only role.
 */
function normalizeRole(role) {
  return Object.values(FAMILY_ROLES).includes(role) ? role : FAMILY_ROLES.VIEWER;
}

function isOwner(role) {
  return normalizeRole(role) === FAMILY_ROLES.OWNER;
}

function isEditor(role) {
  return normalizeRole(role) === FAMILY_ROLES.EDITOR;
}

function isViewer(role) {
  return normalizeRole(role) === FAMILY_ROLES.VIEWER;
}

/**
 * Permission helpers keep route and service code readable and consistent.
 */
function canManageFamily(role) {
  return isOwner(role);
}

function canManageMembers(role) {
  return isOwner(role);
}

function canDeleteFamily(role) {
  return isOwner(role);
}

function canEditBudget(role) {
  return isOwner(role) || isEditor(role);
}

function canViewBudget(role) {
  return isOwner(role) || isEditor(role) || isViewer(role);
}

function getRoleLabel(role) {
  return FAMILY_ROLE_LABELS[normalizeRole(role)];
}

module.exports = {
  FAMILY_ROLES,
  FAMILY_ROLE_LABELS,
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
};
