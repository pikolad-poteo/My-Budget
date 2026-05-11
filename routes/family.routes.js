const express = require('express');
const router = express.Router();

const { requireAuth } = require('../scr/middleware');
const {
  getUserFamily,
  getFamilyMembers,
  createFamily,
  updateFamilyName,
  addFamilyMember,
  changeMemberRole,
  removeFamilyMember,
  leaveFamily,
  deleteFamily
} = require('../scr/family.service');
const { canManageFamily, canManageMembers, canDeleteFamily, FAMILY_ROLES } = require('../scr/family.permissions');

function setFamilyFlash(req, type, message) {
  req.session.familyFlash = { type, message };
}

function getFamilyFlash(req) {
  const flash = req.session.familyFlash || null;
  delete req.session.familyFlash;
  return flash;
}

async function renderFamilyPage(req, res) {
  const currentUserId = req.session.user.id;
  const family = await getUserFamily(currentUserId);
  const members = family ? await getFamilyMembers(family.id) : [];
  const currentRole = family ? family.role : null;
  const flash = getFamilyFlash(req);

  return res.render('family/index', {
    title: 'Family',
    activePage: 'family',
    family,
    members,
    currentRole,
    roles: FAMILY_ROLES,
    permissions: {
      canManageFamily: canManageFamily(currentRole),
      canManageMembers: canManageMembers(currentRole),
      canDeleteFamily: canDeleteFamily(currentRole)
    },
    errorMessage: flash && flash.type === 'error' ? flash.message : '',
    successMessage: flash && flash.type === 'success' ? flash.message : ''
  });
}

router.get('/family', requireAuth, async (req, res) => {
  try {
    return await renderFamilyPage(req, res);
  } catch (error) {
    console.error('Family page error:', error.message);

    return res.render('family/index', {
      title: 'Family',
      activePage: 'family',
      family: null,
      members: [],
      currentRole: null,
      roles: FAMILY_ROLES,
      permissions: { canManageFamily: false, canManageMembers: false, canDeleteFamily: false },
      errorMessage: 'Failed to load family data.',
      successMessage: ''
    });
  }
});

router.post('/family/create', requireAuth, async (req, res) => {
  try {
    await createFamily({ userId: req.session.user.id, name: req.body.familyName });
    setFamilyFlash(req, 'success', 'Family workspace was created.');
    return res.redirect('/family');
  } catch (error) {
    console.error('Family creation error:', error.message);
    setFamilyFlash(req, 'error', error.message || 'Failed to create family.');
    return res.redirect('/family');
  }
});

router.post('/family/update', requireAuth, async (req, res) => {
  try {
    const currentUserId = req.session.user.id;
    const family = await getUserFamily(currentUserId);

    if (!family || !canManageFamily(family.role)) {
      setFamilyFlash(req, 'error', 'Only family owners can update family settings.');
      return res.redirect('/family');
    }

    await updateFamilyName({ familyId: family.id, name: req.body.familyName });
    setFamilyFlash(req, 'success', 'Family name was updated.');
    return res.redirect('/family');
  } catch (error) {
    console.error('Family update error:', error.message);
    setFamilyFlash(req, 'error', error.message || 'Failed to update family.');
    return res.redirect('/family');
  }
});

router.post('/family/members/add', requireAuth, async (req, res) => {
  try {
    const currentUserId = req.session.user.id;
    const family = await getUserFamily(currentUserId);

    if (!family || !canManageMembers(family.role)) {
      setFamilyFlash(req, 'error', 'Only family owners can add members.');
      return res.redirect('/family');
    }

    await addFamilyMember({
      familyId: family.id,
      email: req.body.email,
      role: req.body.role || FAMILY_ROLES.VIEWER
    });

    setFamilyFlash(req, 'success', 'Family member was added.');
    return res.redirect('/family');
  } catch (error) {
    console.error('Add family member error:', error.message);
    setFamilyFlash(req, 'error', error.message || 'Failed to add member.');
    return res.redirect('/family');
  }
});

router.post('/family/members/:userId/role', requireAuth, async (req, res) => {
  try {
    const currentUserId = req.session.user.id;
    const family = await getUserFamily(currentUserId);

    if (!family || !canManageMembers(family.role)) {
      setFamilyFlash(req, 'error', 'Only family owners can change roles.');
      return res.redirect('/family');
    }

    await changeMemberRole({
      familyId: family.id,
      targetUserId: Number(req.params.userId),
      role: req.body.role
    });

    setFamilyFlash(req, 'success', 'Member role was updated.');
    return res.redirect('/family');
  } catch (error) {
    console.error('Change family member role error:', error.message);
    setFamilyFlash(req, 'error', error.message || 'Failed to update member role.');
    return res.redirect('/family');
  }
});

router.post('/family/members/:userId/remove', requireAuth, async (req, res) => {
  try {
    const currentUserId = req.session.user.id;
    const family = await getUserFamily(currentUserId);
    const targetUserId = Number(req.params.userId);

    if (!family || !canManageMembers(family.role)) {
      setFamilyFlash(req, 'error', 'Only family owners can remove members.');
      return res.redirect('/family');
    }

    if (targetUserId === currentUserId) {
      setFamilyFlash(req, 'error', 'Use the Leave family action to remove yourself.');
      return res.redirect('/family');
    }

    await removeFamilyMember({ familyId: family.id, targetUserId });
    setFamilyFlash(req, 'success', 'Family member was removed.');
    return res.redirect('/family');
  } catch (error) {
    console.error('Remove family member error:', error.message);
    setFamilyFlash(req, 'error', error.message || 'Failed to remove member.');
    return res.redirect('/family');
  }
});

router.post('/family/leave', requireAuth, async (req, res) => {
  try {
    const currentUserId = req.session.user.id;
    const family = await getUserFamily(currentUserId);

    if (!family) {
      setFamilyFlash(req, 'error', 'You are not a member of any family.');
      return res.redirect('/family');
    }

    await leaveFamily({ familyId: family.id, actorUserId: currentUserId });
    setFamilyFlash(req, 'success', 'You left the family.');
    return res.redirect('/family');
  } catch (error) {
    console.error('Leave family error:', error.message);
    setFamilyFlash(req, 'error', error.message || 'Failed to leave family.');
    return res.redirect('/family');
  }
});

router.post('/family/delete', requireAuth, async (req, res) => {
  try {
    const currentUserId = req.session.user.id;
    const family = await getUserFamily(currentUserId);
    const confirmation = String(req.body.confirmation || '').trim();

    if (!family || !canDeleteFamily(family.role)) {
      setFamilyFlash(req, 'error', 'Only family owners can delete the family.');
      return res.redirect('/family');
    }

    if (confirmation !== 'Delete') {
      setFamilyFlash(req, 'error', 'Type Delete to confirm family deletion.');
      return res.redirect('/family');
    }

    await deleteFamily({ familyId: family.id });
    setFamilyFlash(req, 'success', 'Family workspace was deleted. Shared data was detached from the deleted family.');
    return res.redirect('/family');
  } catch (error) {
    console.error('Delete family error:', error.message);
    setFamilyFlash(req, 'error', error.message || 'Failed to delete family.');
    return res.redirect('/family');
  }
});

module.exports = router;
