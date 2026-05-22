/**
 * Family routes.
 * Manages family workspace creation, profile updates, avatar handling, member roles,
 * activity history, leaving a family, and deleting a family workspace.
 */

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');

const router = express.Router();
const { requireAuth } = require('../scr/middleware');
const {
  getUserFamily,
  getFamilyMembers,
  countPersonalWorkspaceData,
  getPersonalWorkspaceActivity,
  createFamily,
  updateFamilyName,
  updateFamilyMotto,
  updateFamilyAvatar,
  addFamilyMember,
  changeMemberRole,
  removeFamilyMember,
  leaveFamily,
  deleteFamily
} = require('../scr/family.service');
const { getFamilyActivity, getMemberActivity } = require('../scr/family.activity');
const { canManageFamily, canManageMembers, canDeleteFamily, canEditBudget, FAMILY_ROLES } = require('../scr/family.permissions');

const familyUploadDir = path.join(__dirname, '..', 'public', 'uploads', 'family');
fs.mkdirSync(familyUploadDir, { recursive: true });

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 6 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype || !file.mimetype.startsWith('image/')) {
      return cb(new Error(req.t ? req.t('family.messages.onlyImageFiles') : 'Only image files are allowed.'));
    }

    return cb(null, true);
  }
});

// Store family page messages in the session for redirect-based form handling.
function setFamilyFlash(req, type, message) {
  req.session.familyFlash = { type, message };
}

function getFamilyFlash(req) {
  const flash = req.session.familyFlash || null;
  delete req.session.familyFlash;
  return flash;
}

function getAvatarUrl(filename) {
  return filename ? `/uploads/family/${filename}` : null;
}


function getFamilyMessage(req, key) {
  return req.t ? req.t(`family.messages.${key}`) : key;
}

// Map service-layer error messages to localized UI messages.
function translateFamilyError(req, error, fallbackKey) {
  const originalMessage = error && error.message ? error.message : '';
  const errorMap = {
    'Only image files are allowed.': 'onlyImageFiles',
    'You already belong to a family.': 'alreadyBelongToFamily',
    'Family name is required.': 'familyNameRequired',
    'Family not found.': 'familyNotFound',
    'Email is required.': 'emailRequired',
    'User with this email was not found.': 'userEmailNotFound',
    'This user is already a member of your family.': 'userAlreadyFamilyMember',
    'This user already belongs to another family.': 'userAlreadyInAnotherFamily',
    'Family member not found.': 'familyMemberNotFound',
    'Family must have at least one owner. Add another owner before changing this role.': 'familyMustHaveOwner',
    'You cannot remove the last family owner.': 'cannotRemoveLastOwner',
    'You are the last owner. Add another owner or delete the family before leaving.': 'lastOwnerCannotLeave'
  };

  const translatedKey = errorMap[originalMessage] || fallbackKey;
  return translatedKey ? getFamilyMessage(req, translatedKey) : originalMessage;
}

function removeLocalFamilyAvatar(avatarUrl) {
  if (!avatarUrl || !avatarUrl.startsWith('/uploads/family/')) return;

  const filePath = path.join(__dirname, '..', 'public', avatarUrl);
  if (!filePath.startsWith(familyUploadDir)) return;

  fs.promises.unlink(filePath).catch((error) => {
    if (error.code !== 'ENOENT') {
      console.error('Failed to remove old family avatar:', error.message);
    }
  });
}

// Compress uploaded family avatars before saving them into public uploads.
async function saveCompressedFamilyAvatar(file) {
  if (!file) return null;

  const filename = `family-${Date.now()}-${Math.round(Math.random() * 1e9)}.jpg`;
  const outputPath = path.join(familyUploadDir, filename);

  await sharp(file.buffer)
    .rotate()
    .resize(512, 512, {
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

// Build the family page view model for both family and personal-workspace states.
async function renderFamilyPage(req, res, overrides = {}) {
  const currentUserId = req.session.user.id;
  const family = await getUserFamily(currentUserId);
  const members = family ? await getFamilyMembers(family.id) : [];
  const activity = family ? await getFamilyActivity(family.id, 100) : [];
  const personalWorkspaceStats = family ? null : await countPersonalWorkspaceData(currentUserId);
  const personalWorkspaceActivity = family ? [] : await getPersonalWorkspaceActivity(currentUserId, 100);
  const currentRole = family ? family.role : null;
  const flash = getFamilyFlash(req);

  return res.render('family/index', {
    title: req.t ? req.t('nav.family') : 'Family',
    activePage: 'family',
    family,
    members,
    activity,
    selectedMemberActivity: [],
    selectedMember: null,
    personalWorkspaceStats,
    personalWorkspaceActivity,
    currentRole,
    roles: FAMILY_ROLES,
    permissions: {
      canManageFamily: canManageFamily(currentRole),
      canManageMembers: canManageMembers(currentRole),
      canDeleteFamily: canDeleteFamily(currentRole)
    },
    errorMessage: flash && flash.type === 'error' ? flash.message : '',
    successMessage: flash && flash.type === 'success' ? flash.message : '',
    ...overrides
  });
}

router.get('/family', requireAuth, async (req, res) => {
  try {
    return await renderFamilyPage(req, res);
  } catch (error) {
    console.error('Family page error:', error.message);

    return res.render('family/index', {
      title: req.t ? req.t('nav.family') : 'Family',
      activePage: 'family',
      family: null,
      members: [],
      activity: [],
      selectedMemberActivity: [],
      selectedMember: null,
      personalWorkspaceStats: null,
      personalWorkspaceActivity: [],
      currentRole: null,
      roles: FAMILY_ROLES,
      permissions: { canManageFamily: false, canManageMembers: false, canDeleteFamily: false },
      errorMessage: getFamilyMessage(req, 'failedToLoadFamilyData'),
      successMessage: ''
    });
  }
});

// Return member-specific activity entries for the expandable activity section.
router.get('/family/activity/:userId', requireAuth, async (req, res) => {
  try {
    const currentUserId = req.session.user.id;
    const family = await getUserFamily(currentUserId);

    if (!family) {
      setFamilyFlash(req, 'error', getFamilyMessage(req, 'createOrJoinFamilyFirst'));
      return res.redirect('/family');
    }

    const members = await getFamilyMembers(family.id);
    const selectedMember = members.find((member) => Number(member.id) === Number(req.params.userId));

    if (!selectedMember) {
      setFamilyFlash(req, 'error', getFamilyMessage(req, 'familyMemberNotFound'));
      return res.redirect('/family');
    }

    const selectedMemberActivity = await getMemberActivity(family.id, selectedMember.id, 50);

    return await renderFamilyPage(req, res, {
      selectedMember,
      selectedMemberActivity
    });
  } catch (error) {
    console.error('Family member activity error:', error.message);
    setFamilyFlash(req, 'error', getFamilyMessage(req, 'failedToLoadMemberActivity'));
    return res.redirect('/family');
  }
});

// Create a new family workspace and optionally move personal data into it.
router.post('/family/create', requireAuth, async (req, res) => {
  try {
    const currentUserId = req.session.user.id;

    await createFamily({
      userId: currentUserId,
      name: req.body.familyName
    });

    setFamilyFlash(req, 'success', getFamilyMessage(req, 'familyCreated'));
    return res.redirect('/family');
  } catch (error) {
    console.error('Family creation error:', error.message);
    setFamilyFlash(req, 'error', translateFamilyError(req, error, 'failedToCreateFamily'));
    return res.redirect('/family');
  }
});

// Owner-only family name update.
router.post('/family/update', requireAuth, async (req, res) => {
  try {
    const currentUserId = req.session.user.id;
    const family = await getUserFamily(currentUserId);

    if (!family || !canManageFamily(family.role)) {
      setFamilyFlash(req, 'error', getFamilyMessage(req, 'onlyOwnersUpdateFamily'));
      return res.redirect('/family');
    }

    await updateFamilyName({
      familyId: family.id,
      actorUserId: currentUserId,
      name: req.body.familyName
    });

    setFamilyFlash(req, 'success', getFamilyMessage(req, 'familyNameUpdated'));
    return res.redirect('/family');
  } catch (error) {
    console.error('Family update error:', error.message);
    setFamilyFlash(req, 'error', translateFamilyError(req, error, 'failedToUpdateFamily'));
    return res.redirect('/family');
  }
});


// Owner/editor family motto update used by the family overview card.
router.post('/family/motto', requireAuth, async (req, res) => {
  try {
    const currentUserId = req.session.user.id;
    const family = await getUserFamily(currentUserId);

    if (!family || !canManageFamily(family.role)) {
      setFamilyFlash(req, 'error', getFamilyMessage(req, 'onlyOwnersUpdateFamily'));
      return res.redirect('/family');
    }

    await updateFamilyMotto({
      familyId: family.id,
      actorUserId: currentUserId,
      motto: req.body.motto
    });

    setFamilyFlash(req, 'success', getFamilyMessage(req, 'familyMottoUpdated'));
    return res.redirect('/family');
  } catch (error) {
    console.error('Family motto update error:', error.message);
    setFamilyFlash(req, 'error', translateFamilyError(req, error, 'failedToUpdateFamilyMotto'));
    return res.redirect('/family');
  }
});

// Owner/editor avatar replacement for the shared family profile.
router.post('/family/avatar', requireAuth, upload.single('avatar'), async (req, res) => {
  try {
    const currentUserId = req.session.user.id;
    const family = await getUserFamily(currentUserId);

    if (!family || !canEditBudget(family.role)) {
      setFamilyFlash(req, 'error', getFamilyMessage(req, 'onlyOwnersEditorsUpdateAvatar'));
      return res.redirect('/family');
    }

    if (!req.file) {
      setFamilyFlash(req, 'error', getFamilyMessage(req, 'chooseImageFirst'));
      return res.redirect('/family');
    }

    const filename = await saveCompressedFamilyAvatar(req.file);
    const avatarUrl = getAvatarUrl(filename);

    await updateFamilyAvatar({ familyId: family.id, actorUserId: currentUserId, avatarUrl });
    removeLocalFamilyAvatar(family.avatar_url);

    setFamilyFlash(req, 'success', getFamilyMessage(req, 'familyAvatarUpdated'));
    return res.redirect('/family');
  } catch (error) {
    console.error('Family avatar update error:', error.message);
    setFamilyFlash(req, 'error', translateFamilyError(req, error, 'failedToUpdateFamilyAvatar'));
    return res.redirect('/family');
  }
});

router.post('/family/avatar/delete', requireAuth, async (req, res) => {
  try {
    const currentUserId = req.session.user.id;
    const family = await getUserFamily(currentUserId);

    if (!family || !canEditBudget(family.role)) {
      setFamilyFlash(req, 'error', getFamilyMessage(req, 'onlyOwnersEditorsDeleteAvatar'));
      return res.redirect('/family');
    }

    await updateFamilyAvatar({ familyId: family.id, actorUserId: currentUserId, avatarUrl: null });
    removeLocalFamilyAvatar(family.avatar_url);

    setFamilyFlash(req, 'success', getFamilyMessage(req, 'familyAvatarDeleted'));
    return res.redirect('/family');
  } catch (error) {
    console.error('Family avatar delete error:', error.message);
    setFamilyFlash(req, 'error', translateFamilyError(req, error, 'failedToDeleteFamilyAvatar'));
    return res.redirect('/family');
  }
});

// Add an existing registered user to the current family workspace.
router.post('/family/members/add', requireAuth, async (req, res) => {
  try {
    const currentUserId = req.session.user.id;
    const family = await getUserFamily(currentUserId);

    if (!family || !canManageMembers(family.role)) {
      setFamilyFlash(req, 'error', getFamilyMessage(req, 'onlyOwnersAddMembers'));
      return res.redirect('/family');
    }

    await addFamilyMember({
      familyId: family.id,
      actorUserId: currentUserId,
      email: req.body.email,
      role: req.body.role || FAMILY_ROLES.VIEWER
    });

    setFamilyFlash(req, 'success', getFamilyMessage(req, 'familyMemberAdded'));
    return res.redirect('/family');
  } catch (error) {
    console.error('Add family member error:', error.message);
    setFamilyFlash(req, 'error', translateFamilyError(req, error, 'failedToAddMember'));
    return res.redirect('/family');
  }
});

// Change member roles while preserving the rule that every family needs an owner.
router.post('/family/members/:userId/role', requireAuth, async (req, res) => {
  try {
    const currentUserId = req.session.user.id;
    const family = await getUserFamily(currentUserId);

    if (!family || !canManageMembers(family.role)) {
      setFamilyFlash(req, 'error', getFamilyMessage(req, 'onlyOwnersChangeRoles'));
      return res.redirect('/family');
    }

    await changeMemberRole({
      familyId: family.id,
      actorUserId: currentUserId,
      targetUserId: Number(req.params.userId),
      role: req.body.role
    });

    setFamilyFlash(req, 'success', getFamilyMessage(req, 'memberRoleUpdated'));
    return res.redirect('/family');
  } catch (error) {
    console.error('Change family member role error:', error.message);
    setFamilyFlash(req, 'error', translateFamilyError(req, error, 'failedToUpdateMemberRole'));
    return res.redirect('/family');
  }
});

// Remove a family member after service-level owner and membership validation.
router.post('/family/members/:userId/remove', requireAuth, async (req, res) => {
  try {
    const currentUserId = req.session.user.id;
    const family = await getUserFamily(currentUserId);
    const targetUserId = Number(req.params.userId);

    if (!family || !canManageMembers(family.role)) {
      setFamilyFlash(req, 'error', getFamilyMessage(req, 'onlyOwnersRemoveMembers'));
      return res.redirect('/family');
    }

    if (targetUserId === currentUserId) {
      setFamilyFlash(req, 'error', getFamilyMessage(req, 'useLeaveFamilyToRemoveYourself'));
      return res.redirect('/family');
    }

    await removeFamilyMember({ familyId: family.id, actorUserId: currentUserId, targetUserId });

    setFamilyFlash(req, 'success', getFamilyMessage(req, 'familyMemberRemoved'));
    return res.redirect('/family');
  } catch (error) {
    console.error('Remove family member error:', error.message);
    setFamilyFlash(req, 'error', translateFamilyError(req, error, 'failedToRemoveMember'));
    return res.redirect('/family');
  }
});

// Let the current user leave the family unless they are the last owner.
router.post('/family/leave', requireAuth, async (req, res) => {
  try {
    const currentUserId = req.session.user.id;
    const family = await getUserFamily(currentUserId);

    if (!family) {
      setFamilyFlash(req, 'error', getFamilyMessage(req, 'notFamilyMember'));
      return res.redirect('/family');
    }

    await leaveFamily({ familyId: family.id, actorUserId: currentUserId });

    setFamilyFlash(req, 'success', getFamilyMessage(req, 'leftFamily'));
    return res.redirect('/family');
  } catch (error) {
    console.error('Leave family error:', error.message);
    setFamilyFlash(req, 'error', translateFamilyError(req, error, 'failedToLeaveFamily'));
    return res.redirect('/family');
  }
});

// Delete the family workspace or move its data back to the owner's personal workspace.
router.post('/family/delete', requireAuth, async (req, res) => {
  try {
    const currentUserId = req.session.user.id;
    const family = await getUserFamily(currentUserId);
    const confirmation = String(req.body.confirmation || '').trim();

    if (!family || !canDeleteFamily(family.role)) {
      setFamilyFlash(req, 'error', getFamilyMessage(req, 'onlyOwnersDeleteFamily'));
      return res.redirect('/family');
    }

    if (confirmation !== 'Delete') {
      setFamilyFlash(req, 'error', getFamilyMessage(req, 'typeDeleteToConfirmFamilyDeletion'));
      return res.redirect('/family');
    }

    const keepSharedDataAsPersonal = req.body.keepSharedDataAsPersonal === 'on';

    await deleteFamily({
      familyId: family.id,
      actorUserId: currentUserId,
      keepSharedDataAsPersonal
    });

    setFamilyFlash(
      req,
      'success',
      keepSharedDataAsPersonal
        ? getFamilyMessage(req, 'familyDeletedDataMoved')
        : getFamilyMessage(req, 'familyDeletedWithData')
    );
    return res.redirect('/family');
  } catch (error) {
    console.error('Delete family error:', error.message);
    setFamilyFlash(req, 'error', translateFamilyError(req, error, 'failedToDeleteFamily'));
    return res.redirect('/family');
  }
});

module.exports = router;
