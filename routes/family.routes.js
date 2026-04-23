const express = require('express');
const router = express.Router();

const db = require('../scr/db');
const { requireAuth } = require('../scr/middleware');
const { getUserFamily, getFamilyMembers } = require('../scr/family.service');

router.get('/family', requireAuth, async (req, res) => {
  try {
    const currentUserId = req.session.user.id;
    const family = await getUserFamily(currentUserId);

    let members = [];

    if (family) {
      members = await getFamilyMembers(family.id);
    }

    res.render('family/index', {
      title: 'Family',
      activePage: 'family',
      family,
      members,
      errorMessage: '',
      successMessage: ''
    });
  } catch (error) {
    console.error('Family page error:', error.message);

    res.render('family/index', {
      title: 'Family',
      activePage: 'family',
      family: null,
      members: [],
      errorMessage: 'Failed to load family data.',
      successMessage: ''
    });
  }
});

router.post('/family/create', requireAuth, async (req, res) => {
  const { familyName } = req.body;

  if (!familyName || !familyName.trim()) {
    return res.redirect('/family');
  }

  try {
    const currentUserId = req.session.user.id;
    const existingFamily = await getUserFamily(currentUserId);

    if (existingFamily) {
      return res.redirect('/family');
    }

    const [result] = await db.query(
      'INSERT INTO families (name, owner_user_id) VALUES (?, ?)',
      [familyName.trim(), currentUserId]
    );

    await db.query(
      'INSERT INTO family_members (family_id, user_id, role) VALUES (?, ?, ?)',
      [result.insertId, currentUserId, 'owner']
    );

    return res.redirect('/family');
  } catch (error) {
    console.error('Family creation error:', error.message);
    return res.redirect('/family');
  }
});

router.post('/family/add-member', requireAuth, async (req, res) => {
  const { email } = req.body;

  if (!email || !email.trim()) {
    return res.redirect('/family');
  }

  try {
    const currentUserId = req.session.user.id;
    const family = await getUserFamily(currentUserId);

    if (!family) {
      return res.redirect('/family');
    }

    if (family.owner_user_id !== currentUserId) {
      return res.redirect('/family');
    }

    const normalizedEmail = email.trim().toLowerCase();

    const [usersFound] = await db.query(
      'SELECT id FROM users WHERE email = ? LIMIT 1',
      [normalizedEmail]
    );

    if (usersFound.length === 0) {
      return res.redirect('/family');
    }

    const memberUserId = usersFound[0].id;

    const [existingMember] = await db.query(
      'SELECT id FROM family_members WHERE family_id = ? AND user_id = ? LIMIT 1',
      [family.id, memberUserId]
    );

    if (existingMember.length > 0) {
      return res.redirect('/family');
    }

    await db.query(
      'INSERT INTO family_members (family_id, user_id, role) VALUES (?, ?, ?)',
      [family.id, memberUserId, 'member']
    );

    return res.redirect('/family');
  } catch (error) {
    console.error('Add family member error:', error.message);
    return res.redirect('/family');
  }
});

module.exports = router;