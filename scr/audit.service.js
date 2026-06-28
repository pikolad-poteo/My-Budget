/**
 * Global audit logging service.
 * Stores security and administration events in audit_logs without exposing
 * sensitive values such as passwords, tokens or session secrets.
 */

const db = require('./db');

function getClientIp(req) {
  const forwardedFor = req.get && req.get('x-forwarded-for');
  const ip =
    (forwardedFor ? forwardedFor.split(',')[0].trim() : '') ||
    req.ip ||
    req.socket?.remoteAddress ||
    '';

  return ip ? String(ip).slice(0, 45) : null;
}

function getUserAgent(req) {
  const userAgent = req.get ? req.get('user-agent') : '';
  return userAgent ? String(userAgent).slice(0, 1000) : null;
}

function normalizeDetails(details) {
  if (!details || typeof details !== 'object') {
    return null;
  }

  return JSON.stringify(details);
}

async function createAuditLog(entry, queryRunner = db) {
  const {
    userId = null,
    familyId = null,
    action,
    entityType = null,
    entityId = null,
    ipAddress = null,
    userAgent = null,
    details = null
  } = entry;

  if (!action) {
    throw new Error('Audit action is required');
  }

  await queryRunner.query(
    `
    INSERT INTO audit_logs
      (user_id, family_id, action, entity_type, entity_id, ip_address, user_agent, details)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      userId,
      familyId,
      action,
      entityType,
      entityId,
      ipAddress,
      userAgent,
      normalizeDetails(details)
    ]
  );
}

async function auditFromRequest(req, entry, queryRunner = db) {
  const sessionUserId = req.session?.user?.id || null;

  return createAuditLog(
    {
      userId: entry.userId ?? sessionUserId,
      familyId: entry.familyId ?? null,
      action: entry.action,
      entityType: entry.entityType ?? null,
      entityId: entry.entityId ?? null,
      ipAddress: entry.ipAddress ?? getClientIp(req),
      userAgent: entry.userAgent ?? getUserAgent(req),
      details: entry.details ?? null
    },
    queryRunner
  );
}

async function safeAuditFromRequest(req, entry, queryRunner = db) {
  try {
    await auditFromRequest(req, entry, queryRunner);
  } catch (error) {
    console.error('Audit log error:', error.message);
  }
}

module.exports = {
  createAuditLog,
  auditFromRequest,
  safeAuditFromRequest,
  getClientIp,
  getUserAgent
};
