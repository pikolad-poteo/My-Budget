const express = require('express');
const router = express.Router();

const db = require('../scr/db');
const { requireAuth } = require('../scr/middleware');
const { getUserFamily } = require('../scr/family.service');
const { getCanEditBudget, requireBudgetEditor } = require('../scr/budget.permissions');

function pad2(value) {
  return String(value).padStart(2, '0');
}

function formatDateLocal(date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function parseDate(value) {
  const raw = String(value || '').trim();
  const parsed = raw ? new Date(`${raw}T00:00:00`) : new Date();
  if (Number.isNaN(parsed.getTime())) return new Date();
  return parsed;
}

function formatMonthTitle(date) {
  return new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric' }).format(date);
}

function formatHumanDate(dateInput) {
  return new Intl.DateTimeFormat('en', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(parseDate(dateInput));
}

function sanitizeText(value, maxLength = 255) {
  return String(value || '').trim().slice(0, maxLength);
}

function sanitizeTime(value) {
  const raw = String(value || '').trim();
  return /^\d{2}:\d{2}$/.test(raw) ? raw : null;
}

function sanitizeType(value) {
  const allowed = ['event', 'reminder', 'task', 'birthday'];
  return allowed.includes(value) ? value : 'event';
}

function sanitizeColor(value) {
  const raw = String(value || '').trim();

  if (/^#[0-9a-fA-F]{6}$/.test(raw)) {
    return raw.toLowerCase();
  }

  const legacyColors = {
    blue: '#0d6efd',
    green: '#198754',
    orange: '#fd7e14',
    red: '#dc3545',
    purple: '#6f42c1'
  };

  return legacyColors[raw] || '#0d6efd';
}

function sanitizeRecurring(value) {
  const allowed = ['none', 'daily', 'weekly', 'monthly', 'yearly'];
  return allowed.includes(value) ? value : 'none';
}

function getEventTypeLabel(type) {
  switch (type) {
    case 'birthday': return 'Birthday';
    case 'reminder': return 'Reminder';
    case 'task': return 'Task';
    default: return 'Event';
  }
}

function getEventColorStyle(color) {
  return sanitizeColor(color);
}

function normalizeEvent(event) {
  return {
    ...event,
    type_label: getEventTypeLabel(event.type),
    color_style: getEventColorStyle(event.color),
    event_time_label: Number(event.is_all_day) === 1
      ? 'All day'
      : String(event.event_time || '').slice(0, 5) || 'No time',
    end_time_label: event.end_time ? String(event.end_time).slice(0, 5) : '',
    is_all_day: Number(event.is_all_day) === 1,
    is_important: Number(event.is_important) === 1,
    is_recurring: Number(event.is_recurring) === 1,
    is_completed: Number(event.is_completed) === 1
  };
}

function buildMonthMatrix(baseDate, events) {
  const year = baseDate.getFullYear();
  const month = baseDate.getMonth();
  const firstDayOfMonth = new Date(year, month, 1);
  const firstWeekday = (firstDayOfMonth.getDay() + 6) % 7;
  const startDate = new Date(year, month, 1 - firstWeekday);
  const todayString = formatDateLocal(new Date());

  const eventsMap = events.reduce((acc, event) => {
    const key = formatDateLocal(new Date(event.event_date));
    if (!acc[key]) acc[key] = [];
    acc[key].push(normalizeEvent(event));
    return acc;
  }, {});

  const weeks = [];

  for (let weekIndex = 0; weekIndex < 6; weekIndex += 1) {
    const week = [];

    for (let dayIndex = 0; dayIndex < 7; dayIndex += 1) {
      const current = new Date(startDate);
      current.setDate(startDate.getDate() + weekIndex * 7 + dayIndex);
      const dateString = formatDateLocal(current);

      week.push({
        date: dateString,
        dayNumber: current.getDate(),
        isCurrentMonth: current.getMonth() === month,
        isToday: dateString === todayString,
        events: eventsMap[dateString] || []
      });
    }

    weeks.push(week);
  }

  return weeks;
}

function buildRedirect(view, date) {
  const safeView = view === 'day' ? 'day' : 'month';
  const safeDate = sanitizeText(date, 20) || formatDateLocal(new Date());
  return `/calendar?view=${safeView}&date=${encodeURIComponent(safeDate)}`;
}

async function getCalendarMembers(familyId, currentUser) {
  if (!familyId) return [{ id: currentUser.id, name: currentUser.name || 'Me' }];

  const [rows] = await db.query(
    `
    SELECT u.id, u.name
    FROM family_members fm
    INNER JOIN users u ON u.id = fm.user_id
    WHERE fm.family_id = ?
    ORDER BY
      CASE WHEN fm.role = 'owner' THEN 0 ELSE 1 END,
      u.name ASC
    `,
    [familyId]
  );

  return rows.length ? rows : [{ id: currentUser.id, name: currentUser.name || 'Me' }];
}

function getEventScopeClause(familyId) {
  if (familyId) return '((family_id = ?) OR (family_id IS NULL AND user_id = ?))';
  return '(family_id IS NULL AND user_id = ?)';
}

function getScopeParams(familyId, userId) {
  return familyId ? [familyId, userId] : [userId];
}

router.get('/calendar', requireAuth, async (req, res) => {
  try {
    const currentUser = req.session.user;
    const currentUserId = currentUser.id;
    const family = await getUserFamily(currentUserId);
    const canEditBudget = getCanEditBudget(family);
    const familyId = family ? family.id : null;
    const members = await getCalendarMembers(familyId, currentUser);

    const today = new Date();
    const selectedDateString = sanitizeText(req.query.date, 20) || formatDateLocal(today);
    const selectedDate = parseDate(selectedDateString);
    const selectedDateSafe = formatDateLocal(selectedDate);
    const calendarView = req.query.view === 'day' ? 'day' : 'month';

    const monthBaseDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
    const monthStart = new Date(monthBaseDate.getFullYear(), monthBaseDate.getMonth(), 1);
    const monthEnd = new Date(monthBaseDate.getFullYear(), monthBaseDate.getMonth() + 1, 0);

    const scopeClause = getEventScopeClause(familyId);
    const scopeParams = getScopeParams(familyId, currentUserId);

    const [monthEvents] = await db.query(
      `
      SELECT *
      FROM calendar_events
      WHERE ${scopeClause}
        AND event_date BETWEEN ? AND ?
      ORDER BY event_date ASC, is_completed ASC, is_all_day DESC, event_time ASC, id ASC
      `,
      [...scopeParams, formatDateLocal(monthStart), formatDateLocal(monthEnd)]
    );

    const [dayEventsRows] = await db.query(
      `
      SELECT *
      FROM calendar_events
      WHERE ${scopeClause}
        AND event_date = ?
      ORDER BY is_completed ASC, is_all_day DESC, event_time ASC, id ASC
      `,
      [...scopeParams, selectedDateSafe]
    );

    const prevMonth = new Date(monthBaseDate.getFullYear(), monthBaseDate.getMonth() - 1, 1);
    const nextMonth = new Date(monthBaseDate.getFullYear(), monthBaseDate.getMonth() + 1, 1);
    const prevDay = new Date(selectedDate);
    prevDay.setDate(prevDay.getDate() - 1);
    const nextDay = new Date(selectedDate);
    nextDay.setDate(nextDay.getDate() + 1);

    const flash = req.session.calendarFlash || null;
    delete req.session.calendarFlash;

    return res.render('calendar/index', {
      title: 'Calendar',
      activePage: 'calendar',
      family,
      canEditBudget,
      members,
      calendarView,
      selectedDate: selectedDateSafe,
      formattedSelectedDate: formatHumanDate(selectedDateSafe),
      monthTitle: formatMonthTitle(monthBaseDate),
      monthMatrix: buildMonthMatrix(monthBaseDate, monthEvents),
      dayEvents: dayEventsRows.map(normalizeEvent),
      summary: {
        monthTotal: monthEvents.length,
        dayTotal: dayEventsRows.length,
        completed: monthEvents.filter((event) => Number(event.is_completed) === 1).length,
        important: monthEvents.filter((event) => Number(event.is_important) === 1).length
      },
      nav: {
        today: formatDateLocal(today),
        prevMonth: formatDateLocal(prevMonth),
        nextMonth: formatDateLocal(nextMonth),
        prevDay: formatDateLocal(prevDay),
        nextDay: formatDateLocal(nextDay)
      },
      errorMessage: flash && flash.type === 'error' ? flash.message : '',
      successMessage: flash && flash.type === 'success' ? flash.message : ''
    });
  } catch (error) {
    console.error('Calendar page error:', error.message);
    return res.render('calendar/index', {
      title: 'Calendar',
      activePage: 'calendar',
      family: null,
      canEditBudget: true,
      members: [],
      calendarView: 'month',
      selectedDate: formatDateLocal(new Date()),
      formattedSelectedDate: formatHumanDate(formatDateLocal(new Date())),
      monthTitle: formatMonthTitle(new Date()),
      monthMatrix: buildMonthMatrix(new Date(), []),
      dayEvents: [],
      summary: { monthTotal: 0, dayTotal: 0, completed: 0, important: 0 },
      nav: {
        today: formatDateLocal(new Date()),
        prevMonth: formatDateLocal(new Date()),
        nextMonth: formatDateLocal(new Date()),
        prevDay: formatDateLocal(new Date()),
        nextDay: formatDateLocal(new Date())
      },
      errorMessage: 'Failed to load calendar.',
      successMessage: ''
    });
  }
});

router.post('/calendar/create', requireAuth, requireBudgetEditor('calendar'), async (req, res) => {
  try {
    const currentUserId = req.session.user.id;
    const family = await getUserFamily(currentUserId);
    const familyId = req.body.scope === 'personal' ? null : (family ? family.id : null);

    const title = sanitizeText(req.body.title, 255);
    const eventDate = sanitizeText(req.body.event_date, 20);
    const isAllDay = req.body.is_all_day === '1' ? 1 : 0;
    const eventTime = isAllDay ? null : sanitizeTime(req.body.event_time);
    const endTime = isAllDay ? null : sanitizeTime(req.body.end_time);
    const isRecurring = req.body.is_recurring === '1' ? 1 : 0;
    const recurringType = isRecurring ? sanitizeRecurring(req.body.recurring_type) : 'none';

    if (!title || !eventDate) {
      req.session.calendarFlash = { type: 'error', message: 'Please enter event title and date.' };
      return res.redirect(buildRedirect(req.body.redirect_view, eventDate));
    }

    await db.query(
      `
      INSERT INTO calendar_events
        (user_id, family_id, title, event_date, event_time, end_time, type, member_name, description, color, is_all_day, is_important, is_recurring, recurring_type)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        currentUserId,
        familyId,
        title,
        eventDate,
        eventTime,
        endTime,
        sanitizeType(req.body.type),
        sanitizeText(req.body.member_name, 100) || null,
        sanitizeText(req.body.description, 1000) || null,
        sanitizeColor(req.body.color),
        isAllDay,
        req.body.is_important === '1' ? 1 : 0,
        isRecurring,
        recurringType
      ]
    );

    req.session.calendarFlash = { type: 'success', message: 'Event created successfully.' };
    return res.redirect(buildRedirect(req.body.redirect_view, eventDate));
  } catch (error) {
    console.error('Calendar create error:', error.message);
    req.session.calendarFlash = { type: 'error', message: 'Failed to create event.' };
    return res.redirect('/calendar');
  }
});

router.post('/calendar/update', requireAuth, requireBudgetEditor('calendar'), async (req, res) => {
  try {
    const currentUserId = req.session.user.id;
    const family = await getUserFamily(currentUserId);
    const familyId = family ? family.id : null;
    const id = Number(req.body.id);

    const title = sanitizeText(req.body.title, 255);
    const eventDate = sanitizeText(req.body.event_date, 20);
    const isAllDay = req.body.is_all_day === '1' ? 1 : 0;
    const eventTime = isAllDay ? null : sanitizeTime(req.body.event_time);
    const endTime = isAllDay ? null : sanitizeTime(req.body.end_time);
    const isRecurring = req.body.is_recurring === '1' ? 1 : 0;
    const recurringType = isRecurring ? sanitizeRecurring(req.body.recurring_type) : 'none';

    if (!id || !title || !eventDate) {
      req.session.calendarFlash = { type: 'error', message: 'Event update data is incomplete.' };
      return res.redirect(buildRedirect(req.body.redirect_view, req.body.redirect_date));
    }

    const scopeClause = getEventScopeClause(familyId);
    const scopeParams = getScopeParams(familyId, currentUserId);

    await db.query(
      `
      UPDATE calendar_events
      SET
        title = ?,
        event_date = ?,
        event_time = ?,
        end_time = ?,
        type = ?,
        member_name = ?,
        description = ?,
        color = ?,
        is_all_day = ?,
        is_important = ?,
        is_recurring = ?,
        recurring_type = ?
      WHERE id = ? AND ${scopeClause}
      `,
      [
        title,
        eventDate,
        eventTime,
        endTime,
        sanitizeType(req.body.type),
        sanitizeText(req.body.member_name, 100) || null,
        sanitizeText(req.body.description, 1000) || null,
        sanitizeColor(req.body.color),
        isAllDay,
        req.body.is_important === '1' ? 1 : 0,
        isRecurring,
        recurringType,
        id,
        ...scopeParams
      ]
    );

    req.session.calendarFlash = { type: 'success', message: 'Event updated successfully.' };
    return res.redirect(buildRedirect(req.body.redirect_view, eventDate));
  } catch (error) {
    console.error('Calendar update error:', error.message);
    req.session.calendarFlash = { type: 'error', message: 'Failed to update event.' };
    return res.redirect('/calendar');
  }
});

router.post('/calendar/complete', requireAuth, requireBudgetEditor('calendar'), async (req, res) => {
  try {
    const currentUserId = req.session.user.id;
    const family = await getUserFamily(currentUserId);
    const familyId = family ? family.id : null;
    const id = Number(req.body.id);

    if (!id) return res.redirect('/calendar');

    const scopeClause = getEventScopeClause(familyId);
    const scopeParams = getScopeParams(familyId, currentUserId);

    await db.query(
      `
      UPDATE calendar_events
      SET
        completed_at = CASE WHEN is_completed = 0 THEN NOW() ELSE NULL END,
        is_completed = CASE WHEN is_completed = 1 THEN 0 ELSE 1 END
      WHERE id = ? AND ${scopeClause}
      `,
      [id, ...scopeParams]
    );

    return res.redirect(buildRedirect(req.body.redirect_view, req.body.redirect_date));
  } catch (error) {
    console.error('Calendar complete error:', error.message);
    req.session.calendarFlash = { type: 'error', message: 'Failed to update event status.' };
    return res.redirect('/calendar');
  }
});

router.post('/calendar/delete', requireAuth, requireBudgetEditor('calendar'), async (req, res) => {
  try {
    const currentUserId = req.session.user.id;
    const family = await getUserFamily(currentUserId);
    const familyId = family ? family.id : null;
    const id = Number(req.body.id);

    if (!id) return res.redirect('/calendar');

    const scopeClause = getEventScopeClause(familyId);
    const scopeParams = getScopeParams(familyId, currentUserId);

    await db.query(
      `DELETE FROM calendar_events WHERE id = ? AND ${scopeClause}`,
      [id, ...scopeParams]
    );

    req.session.calendarFlash = { type: 'success', message: 'Event deleted successfully.' };
    return res.redirect(buildRedirect(req.body.redirect_view, req.body.redirect_date));
  } catch (error) {
    console.error('Calendar delete error:', error.message);
    req.session.calendarFlash = { type: 'error', message: 'Failed to delete event.' };
    return res.redirect('/calendar');
  }
});

module.exports = router;
