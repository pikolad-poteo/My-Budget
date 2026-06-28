/**
 * Account routes.
 * Handles authenticated user profile settings, avatar management, email changes,
 * password updates, and account deletion from the account settings page.
 */

const express = require('express');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');

const router = express.Router();
const db = require('../scr/db');
const { requireAuth } = require('../scr/middleware');
const { normalizeEmail, isValidEmail, validatePassword } = require('../scr/auth.validation');
const { sendEmailChangeVerificationEmail } = require('../scr/mail.service');
const { createPendingEmailChange, cancelPendingEmailChange } = require('../scr/pendingEmail.service');
const { safeAuditFromRequest } = require('../scr/audit.service');

const accountUploadDir = path.join(__dirname, '..', 'public', 'uploads', 'users');
fs.mkdirSync(accountUploadDir, { recursive: true });

const ALLOWED_AVATAR_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png'
]);
const ALLOWED_AVATAR_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png']);
const MAX_AVATAR_SIZE = 15 * 1024 * 1024;

// Keep avatar uploads in memory so Sharp can validate and compress them before saving.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_AVATAR_SIZE },
  fileFilter: (req, file, cb) => {
    const mimetype = String(file.mimetype || '').toLowerCase();
    const extension = path.extname(file.originalname || '').toLowerCase();

    if (!ALLOWED_AVATAR_MIME_TYPES.has(mimetype) && !ALLOWED_AVATAR_EXTENSIONS.has(extension)) {
      return cb(new Error(req.t('account.messages.uploadJpgPngOnly')));
    }

    return cb(null, true);
  }
});

// Store short-lived account messages in the session to survive redirects.
function setAccountFlash(req, type, message) {
  req.session.accountFlash = { type, message };
}

function getAccountFlash(req) {
  const flash = req.session.accountFlash || null;
  delete req.session.accountFlash;
  return flash;
}

// Load only account fields that are needed by the settings page and session refresh.
async function getCurrentUser(userId) {
  const [rows] = await db.query(
    'SELECT id, name, email, pending_email, avatar_url, email_verified_at, created_at FROM users WHERE id = ? LIMIT 1',
    [userId]
  );

  return rows[0] || null;
}

// Resolve the user's current family role for display in account management.
async function getAccountFamilyRole(userId) {
  const [rows] = await db.query(
    `
    SELECT fm.role, f.name AS family_name, f.avatar_url AS family_avatar_url
    FROM family_members fm
    INNER JOIN families f ON f.id = fm.family_id
    WHERE fm.user_id = ?
    LIMIT 1
    `,
    [userId]
  );

  return rows[0] || null;
}

// Convert Multer upload errors into user-facing account flash messages.
function runAccountAvatarUpload(req, res, next) {
  upload.single('avatar')(req, res, (error) => {
    if (!error) {
      return next();
    }

    let message = req.t('account.messages.failedToUploadAvatar');

    if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
      message = req.t('account.messages.avatarTooLarge');
    } else if (error.message) {
      message = error.message;
    }

    setAccountFlash(req, 'error', message);
    return res.redirect('/account');
  });
}

function getAvatarUrl(filename) {
  return filename ? `/uploads/users/${filename}` : null;
}

function removeLocalUserAvatar(avatarUrl) {
  if (!avatarUrl || !avatarUrl.startsWith('/uploads/users/')) return;

  const filePath = path.join(__dirname, '..', 'public', avatarUrl);
  if (!filePath.startsWith(accountUploadDir)) return;

  fs.promises.unlink(filePath).catch((error) => {
    if (error.code !== 'ENOENT') {
      console.error('Failed to remove old user avatar:', error.message);
    }
  });
}

// Normalize uploaded avatars to a bounded JPEG file to keep storage predictable.
async function saveCompressedUserAvatar(file) {
  if (!file) return null;

  const filename = `user-${Date.now()}-${Math.round(Math.random() * 1e9)}.jpg`;
  const outputPath = path.join(accountUploadDir, filename);

  await sharp(file.buffer)
    .rotate()
    .resize(256, 256, {
      fit: 'cover',
      position: 'center'
    })
    .jpeg({
      quality: 86,
      mozjpeg: true
    })
    .toFile(outputPath);

  return filename;
}

// Keep the session user snapshot aligned with profile changes shown in the header.
function syncSessionUser(req, user) {
  req.session.user = {
    id: user.id,
    name: user.name,
    email: user.email,
    avatar_url: user.avatar_url || null,
    global_role: req.session.user?.global_role || user.global_role || 'user'
  };
}

// Build the full account settings view model in one place for GET and validation errors.
async function renderAccountPage(req, res, overrides = {}) {
  const accountUser = await getCurrentUser(req.session.user.id);

  if (!accountUser) {
    req.session.destroy(() => res.redirect('/login'));
    return null;
  }

  syncSessionUser(req, accountUser);

  const accountFamilyRole = await getAccountFamilyRole(accountUser.id);
  const flash = getAccountFlash(req);

  return res.render('account/index', {
    title: req.t('account.pageTitle'),
    activePage: 'account',
    accountUser,
    accountFamilyRole,
    errorMessage: flash && flash.type === 'error' ? flash.message : '',
    successMessage: flash && flash.type === 'success' ? flash.message : '',
    ...overrides
  });
}

router.get('/account', requireAuth, async (req, res) => {
  try {
    return await renderAccountPage(req, res);
  } catch (error) {
    console.error('Account page error:', error.message);
    return res.status(500).render('account/index', {
      title: req.t('account.pageTitle'),
      activePage: 'account',
      accountUser: req.session.user,
      errorMessage: req.t('account.messages.failedToLoadAccount'),
      successMessage: '',
      accountFamilyRole: null
    });
  }
});

// Update profile data and start a verified pending-email flow when the email changes.
router.post('/account/profile', requireAuth, async (req, res) => {
  const name = String(req.body.name || '').trim();
  const email = normalizeEmail(req.body.email);

  try {
    if (!name || !email) {
      setAccountFlash(req, 'error', req.t('account.messages.nameEmailRequired'));
      return res.redirect('/account');
    }

    if (!isValidEmail(email)) {
      setAccountFlash(req, 'error', req.t('account.messages.invalidEmail'));
      return res.redirect('/account');
    }

    const accountUser = await getCurrentUser(req.session.user.id);
    const isEmailChanged = accountUser.email !== email;

    const [existingUsers] = await db.query(
      `
      SELECT id
      FROM users
      WHERE (email = ? OR pending_email = ?)
        AND id <> ?
      LIMIT 1
      `,
      [email, email, req.session.user.id]
    );

    if (existingUsers.length > 0) {
      setAccountFlash(req, 'error', req.t('account.messages.emailAlreadyUsed'));
      return res.redirect('/account');
    }

    if (!isEmailChanged) {
      await db.query(
        'UPDATE users SET name = ? WHERE id = ? LIMIT 1',
        [name, req.session.user.id]
      );

      const updatedUser = await getCurrentUser(req.session.user.id);
      syncSessionUser(req, updatedUser);

      await safeAuditFromRequest(req, {
        action: 'ACCOUNT_PROFILE_UPDATED',
        entityType: 'user',
        entityId: req.session.user.id,
        details: { changedEmail: false }
      });

      setAccountFlash(req, 'success', req.t('account.messages.accountUpdated'));
      return res.redirect('/account');
    }

    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      await connection.query(
        'UPDATE users SET name = ? WHERE id = ? LIMIT 1',
        [name, req.session.user.id]
      );

      const token = await createPendingEmailChange(connection, req.session.user.id, email);
      await sendEmailChangeVerificationEmail(email, token);
      await safeAuditFromRequest(req, {
        action: 'EMAIL_CHANGE_REQUESTED',
        entityType: 'user',
        entityId: req.session.user.id,
        details: { pendingEmail: email }
      }, connection);
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    const updatedUser = await getCurrentUser(req.session.user.id);
    syncSessionUser(req, updatedUser);

    setAccountFlash(req, 'success', req.t('account.messages.emailChangeRequested'));
    return res.redirect('/account');
  } catch (error) {
    console.error('Account profile update error:', error.message);
    setAccountFlash(req, 'error', error.message.includes('Email sending is not configured')
      ? req.t('account.messages.emailNotConfiguredNotChanged')
      : req.t('account.messages.failedToUpdateAccount'));
    return res.redirect('/account');
  }
});


router.post('/account/email-change/cancel', requireAuth, async (req, res) => {
  try {
    await cancelPendingEmailChange(req.session.user.id);
    await safeAuditFromRequest(req, {
      action: 'EMAIL_CHANGE_CANCELLED',
      entityType: 'user',
      entityId: req.session.user.id
    });
    setAccountFlash(req, 'success', req.t('account.messages.pendingEmailCancelled'));
    return res.redirect('/account');
  } catch (error) {
    console.error('Pending email cancel error:', error.message);
    setAccountFlash(req, 'error', req.t('account.messages.failedToCancelPendingEmail'));
    return res.redirect('/account');
  }
});

// Replace the current avatar with a newly compressed local upload.
router.post('/account/avatar', requireAuth, runAccountAvatarUpload, async (req, res) => {
  try {
    if (!req.file) {
      setAccountFlash(req, 'error', req.t('account.messages.chooseImageFirst'));
      return res.redirect('/account');
    }

    const accountUser = await getCurrentUser(req.session.user.id);
    const filename = await saveCompressedUserAvatar(req.file);
    const avatarUrl = getAvatarUrl(filename);

    await db.query('UPDATE users SET avatar_url = ? WHERE id = ? LIMIT 1', [avatarUrl, req.session.user.id]);
    await safeAuditFromRequest(req, {
      action: 'ACCOUNT_AVATAR_UPDATED',
      entityType: 'user',
      entityId: req.session.user.id
    });
    removeLocalUserAvatar(accountUser.avatar_url);

    const updatedUser = await getCurrentUser(req.session.user.id);
    syncSessionUser(req, updatedUser);

    setAccountFlash(req, 'success', req.t('account.messages.avatarUpdated'));
    return res.redirect('/account');
  } catch (error) {
    console.error('Account avatar update error:', error.message);
    setAccountFlash(req, 'error', req.t('account.messages.failedToProcessAvatar'));
    return res.redirect('/account');
  }
});

router.post('/account/avatar/delete', requireAuth, async (req, res) => {
  try {
    const accountUser = await getCurrentUser(req.session.user.id);

    await db.query('UPDATE users SET avatar_url = NULL WHERE id = ? LIMIT 1', [req.session.user.id]);
    await safeAuditFromRequest(req, {
      action: 'ACCOUNT_AVATAR_DELETED',
      entityType: 'user',
      entityId: req.session.user.id
    });
    removeLocalUserAvatar(accountUser.avatar_url);

    const updatedUser = await getCurrentUser(req.session.user.id);
    syncSessionUser(req, updatedUser);

    setAccountFlash(req, 'success', req.t('account.messages.avatarDeleted'));
    return res.redirect('/account');
  } catch (error) {
    console.error('Account avatar delete error:', error.message);
    setAccountFlash(req, 'error', req.t('account.messages.failedToDeleteAvatar'));
    return res.redirect('/account');
  }
});

// Change password only after validating the current password and new password policy.
router.post('/account/password', requireAuth, async (req, res) => {
  try {
    const currentPassword = String(req.body.currentPassword || '');
    const newPassword = String(req.body.newPassword || '');
    const confirmPassword = String(req.body.confirmPassword || '');

    if (!currentPassword || !newPassword || !confirmPassword) {
      setAccountFlash(req, 'error', req.t('account.messages.fillPasswordFields'));
      return res.redirect('/account');
    }

    const passwordValidation = validatePassword(newPassword, req.t);
    if (!passwordValidation.isValid) {
      setAccountFlash(req, 'error', passwordValidation.message);
      return res.redirect('/account');
    }

    if (newPassword !== confirmPassword) {
      setAccountFlash(req, 'error', req.t('account.messages.newPasswordsDoNotMatch'));
      return res.redirect('/account');
    }

    const [rows] = await db.query(
      'SELECT password_hash FROM users WHERE id = ? LIMIT 1',
      [req.session.user.id]
    );

    if (rows.length === 0) {
      req.session.destroy(() => res.redirect('/login'));
      return null;
    }

    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, rows[0].password_hash);
    if (!isCurrentPasswordValid) {
      setAccountFlash(req, 'error', req.t('account.messages.currentPasswordIncorrect'));
      return res.redirect('/account');
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await db.query('UPDATE users SET password_hash = ? WHERE id = ? LIMIT 1', [passwordHash, req.session.user.id]);
    await safeAuditFromRequest(req, {
      action: 'PASSWORD_CHANGED',
      entityType: 'user',
      entityId: req.session.user.id
    });

    setAccountFlash(req, 'success', req.t('account.messages.passwordChanged'));
    return res.redirect('/account');
  } catch (error) {
    console.error('Account password update error:', error.message);
    setAccountFlash(req, 'error', req.t('account.messages.failedToChangePassword'));
    return res.redirect('/account');
  }
});

router.get('/account/delete', requireAuth, (req, res) => {
  return res.redirect('/account');
});

// Delete the authenticated user's account after password confirmation.
router.post('/account/delete', requireAuth, async (req, res) => {
  try {
    const confirmation = String(req.body.confirmation || '').trim();

    if (confirmation !== 'DELETE') {
      setAccountFlash(req, 'error', req.t('account.messages.typeDeleteToConfirm'));
      return res.redirect('/account');
    }

    const accountUser = await getCurrentUser(req.session.user.id);
    await safeAuditFromRequest(req, {
      action: 'ACCOUNT_DELETED',
      entityType: 'user',
      entityId: req.session.user.id
    });
    await db.query('DELETE FROM users WHERE id = ? LIMIT 1', [req.session.user.id]);
    removeLocalUserAvatar(accountUser.avatar_url);

    req.session.destroy(() => res.redirect('/register'));
    return null;
  } catch (error) {
    console.error('Account deletion error:', error.message);
    setAccountFlash(req, 'error', req.t('account.messages.failedToDeleteAccount'));
    return res.redirect('/account');
  }
});

module.exports = router;
