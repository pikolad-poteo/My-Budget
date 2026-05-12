const express = require('express');
const router = express.Router();

const { requireAuth } = require('../scr/middleware');

router.get('/', (req, res) => {
  if (req.session.user) {
    return res.redirect('/dashboard');
  }

  return res.redirect('/login');
});

router.get('/dashboard', requireAuth, (req, res) => {
  res.render('dashboard/index', {
    title: 'Dashboard',
    activePage: 'dashboard'
  });
});

module.exports = router;