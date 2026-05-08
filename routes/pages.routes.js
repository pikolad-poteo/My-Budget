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

router.get('/calendar', requireAuth, (req, res) => {
  res.render('calendar/index', {
    title: 'Calendar',
    activePage: 'calendar'
  });
});

module.exports = router;