/**
 * Page routes.
 * Renders the landing redirect and the authenticated dashboard with period filters,
 * budget health metrics, trend data, recent transactions, and wishlist summary data.
 */

const express = require('express');
const router = express.Router();

// Dashboard formatting uses stable browser locales for month, day, and chart labels.
const DASHBOARD_LOCALES = {
  en: 'en-US',
  ru: 'ru-RU',
  et: 'et-EE'
};

function getDashboardLocale(language = 'en') {
  return DASHBOARD_LOCALES[language] || DASHBOARD_LOCALES.en;
}

function getTranslator(req) {
  return typeof req.t === 'function' ? req.t : (key) => key;
}

const db = require('../scr/db');
const { requireAuth } = require('../scr/middleware');
const { getUserFamily } = require('../scr/family.service');
const { getCanEditBudget } = require('../scr/budget.permissions');
const { getWorkspaceCondition } = require('../scr/category.utils');

function pad2(value) {
  return String(value).padStart(2, '0');
}

function formatDateLocal(date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function clampNumber(value, min, max, fallback) {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function addMonths(date, amount) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function addYears(date, amount) {
  return new Date(date.getFullYear() + amount, 0, 1);
}

// Resolve the selected month/year period and prebuild navigation URLs for the dashboard.
function getDashboardPeriod(query = {}, language = 'en', t = (key) => key) {
  const locale = getDashboardLocale(language);
  const now = new Date();
  const mode = query.mode === 'year' ? 'year' : 'month';
  const year = clampNumber(query.year, 2000, 2100, now.getFullYear());
  const month = clampNumber(query.month, 1, 12, now.getMonth() + 1);
  const base = mode === 'year'
    ? new Date(year, 0, 1)
    : new Date(year, month - 1, 1);

  const start = mode === 'year'
    ? new Date(base.getFullYear(), 0, 1)
    : new Date(base.getFullYear(), base.getMonth(), 1);
  const end = mode === 'year'
    ? new Date(base.getFullYear(), 11, 31)
    : new Date(base.getFullYear(), base.getMonth() + 1, 0);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const containsToday = today >= start && today <= end;
  const chartEnd = containsToday ? today : end;
  const previousStart = mode === 'year'
    ? new Date(base.getFullYear() - 1, 0, 1)
    : new Date(base.getFullYear(), base.getMonth() - 1, 1);
  const previousEnd = mode === 'year'
    ? new Date(base.getFullYear() - 1, 11, 31)
    : new Date(base.getFullYear(), base.getMonth(), 0);
  const previousBase = mode === 'year' ? addYears(base, -1) : addMonths(base, -1);
  const nextBase = mode === 'year' ? addYears(base, 1) : addMonths(base, 1);

  const buildUrl = (targetMode, targetDate) => {
    const params = new URLSearchParams({
      mode: targetMode,
      year: String(targetDate.getFullYear())
    });

    if (targetMode === 'month') {
      params.set('month', String(targetDate.getMonth() + 1));
    }

    return `/dashboard?${params.toString()}`;
  };

  return {
    mode,
    year: base.getFullYear(),
    month: base.getMonth() + 1,
    start,
    end,
    previousStart,
    previousEnd,
    startString: formatDateLocal(start),
    endString: formatDateLocal(end),
    chartEnd,
    chartEndString: formatDateLocal(chartEnd),
    containsToday,
    previousStartString: formatDateLocal(previousStart),
    previousEndString: formatDateLocal(previousEnd),
    label: mode === 'year'
      ? String(base.getFullYear())
      : base.toLocaleString(locale, { month: 'long', year: 'numeric' }),
    shortLabel: mode === 'year'
      ? String(base.getFullYear())
      : base.toLocaleString(locale, { month: 'short', year: 'numeric' }),
    summaryLabel: mode === 'year' ? t('dashboard.period.thisYear') : t('dashboard.period.thisMonth'),
    previousUrl: buildUrl(mode, previousBase),
    nextUrl: buildUrl(mode, nextBase),
    monthUrl: buildUrl('month', mode === 'year' ? new Date(base.getFullYear(), now.getMonth(), 1) : base),
    yearUrl: buildUrl('year', base)
  };
}

function roundCurrency(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}

// Calculate percentage changes while handling empty previous periods safely.
function calculateChange(current, previous, positiveWhenLower = false, t = (key) => key) {
  const currentValue = Math.abs(Number(current || 0));
  const previousValue = Math.abs(Number(previous || 0));

  if (!previousValue && !currentValue) {
    return { value: 0, direction: 'flat', label: t('dashboard.messages.noActivityYet'), isGood: true };
  }

  if (!previousValue) {
    return { value: 100, direction: 'up', label: t('dashboard.messages.newActivity'), isGood: !positiveWhenLower };
  }

  const rawChange = ((currentValue - previousValue) / previousValue) * 100;
  const direction = rawChange > 0 ? 'up' : rawChange < 0 ? 'down' : 'flat';
  const isGood = positiveWhenLower ? rawChange <= 0 : rawChange >= 0;

  return {
    value: Math.abs(rawChange),
    direction,
    isGood,
    label: `${Math.abs(rawChange).toFixed(1)}% ${t('dashboard.messages.vsPreviousPeriod')}`
  };
}

function normalizeDateLabel(value, language = 'en') {
  const locale = getDashboardLocale(language);
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getDate()} ${date.toLocaleString(locale, { month: 'short' })}`;
}

// Fill daily trend data so chart labels stay continuous even on days without transactions.
function buildMonthTrend(periodStart, chartEnd, dailyRows, containsToday = false, language = 'en', t = (key) => key) {
  const locale = getDashboardLocale(language);
  const rowsByDate = new Map(
    dailyRows.map((row) => [formatDateLocal(new Date(row.period_key)), row])
  );
  const labels = [];
  const income = [];
  const expenses = [];
  let incomeRunning = 0;
  let expenseRunning = 0;

  for (let day = 1; day <= chartEnd.getDate(); day += 1) {
    const current = new Date(periodStart.getFullYear(), periodStart.getMonth(), day);
    const row = rowsByDate.get(formatDateLocal(current));

    incomeRunning += Number(row ? row.income : 0);
    expenseRunning += Math.abs(Number(row ? row.expenses : 0));

    labels.push(`${day} ${current.toLocaleString(locale, { month: 'short' })}`);
    income.push(roundCurrency(incomeRunning));
    expenses.push(roundCurrency(expenseRunning));
  }

  return {
    labels,
    income,
    expenses,
    currentIndex: containsToday && labels.length ? labels.length - 1 : null,
    currentLabel: containsToday ? t('dashboard.today') : ''
  };
}

// Build monthly trend data for yearly dashboard mode.
function buildYearTrend(year, chartEnd, monthlyRows, containsToday = false, language = 'en', t = (key) => key) {
  const locale = getDashboardLocale(language);
  const rowsByMonth = new Map(
    monthlyRows.map((row) => [Number(row.period_key), row])
  );
  const labels = [];
  const income = [];
  const expenses = [];
  let incomeRunning = 0;
  let expenseRunning = 0;

  const monthLimit = chartEnd.getFullYear() === year ? chartEnd.getMonth() + 1 : 12;

  for (let monthIndex = 0; monthIndex < monthLimit; monthIndex += 1) {
    const row = rowsByMonth.get(monthIndex + 1);
    incomeRunning += Number(row ? row.income : 0);
    expenseRunning += Math.abs(Number(row ? row.expenses : 0));

    labels.push(new Date(year, monthIndex, 1).toLocaleString(locale, { month: 'short' }));
    income.push(roundCurrency(incomeRunning));
    expenses.push(roundCurrency(expenseRunning));
  }

  return {
    labels,
    income,
    expenses,
    currentIndex: containsToday && labels.length ? labels.length - 1 : null,
    currentLabel: containsToday ? t('dashboard.currentMonth') : ''
  };
}

function getTransactionIcon(type) {
  return type === 'income' ? 'bi bi-arrow-down-circle' : 'bi bi-cart3';
}

function getCategoryIcon(icon) {
  return icon ? `bi bi-${icon}` : 'bi bi-tag';
}

// Convert financial signals into a simple health score and localized status label.
function calculateBudgetHealth(periodIncome, periodExpenses, savingsRate, wishlistPlannedTotal, t = (key) => key) {
  const income = Number(periodIncome || 0);
  const expenses = Number(periodExpenses || 0);
  const plannedGoals = Number(wishlistPlannedTotal || 0);

  if (!income && !expenses) {
    return {
      score: 0,
      status: t('dashboard.noDataYet'),
      text: t('dashboard.healthText.noData')
    };
  }

  let score = 50;

  if (income > 0) {
    score += 18;

    const expenseRatio = expenses / income;
    const savingContribution = Math.max(-30, Math.min(28, Number(savingsRate || 0) * 0.55));
    score += savingContribution;

    if (expenseRatio > 1) {
      score -= Math.min(38, (expenseRatio - 1) * 55);
    } else {
      score += Math.min(10, (1 - expenseRatio) * 12);
    }

    const wishlistPressure = plannedGoals / income;
    if (wishlistPressure > 0.6) {
      score -= Math.min(16, (wishlistPressure - 0.6) * 18);
    }
  } else {
    score = expenses > 0 ? 22 : 0;
  }

  score = Math.max(0, Math.min(100, Math.round(score)));

  return {
    score,
    status: score >= 80 ? t('dashboard.healthStatus.healthy') : score >= 55 ? t('dashboard.healthStatus.stable') : t('dashboard.healthStatus.needsAttention'),
    text: score >= 80
      ? t('dashboard.healthText.healthy')
      : score >= 55
        ? t('dashboard.healthText.stable')
        : t('dashboard.healthText.needsAttention')
  };
}

// Load all dashboard metrics with workspace-aware queries and prepared chart data.
async function loadDashboardData(user, query = {}, t = (key) => key, language = 'en') {
  const currentUserId = user.id;
  const family = await getUserFamily(currentUserId);
  const familyId = family ? family.id : null;
  const workspace = getWorkspaceCondition(currentUserId, familyId, 't');
  const wishlistWorkspace = getWorkspaceCondition(currentUserId, familyId, 'w');
  const eventWorkspace = getWorkspaceCondition(currentUserId, familyId, 'e');
  const period = getDashboardPeriod(query, language, t);
  const todayString = formatDateLocal(new Date());

  const [balanceRows] = await db.query(
    `SELECT COALESCE(SUM(t.amount), 0) AS balance FROM transactions t WHERE ${workspace.clause}`,
    workspace.params
  );

  const [periodRows] = await db.query(
    `
    SELECT
      COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE 0 END), 0) AS income,
      COALESCE(SUM(CASE WHEN t.type = 'expense' THEN ABS(t.amount) ELSE 0 END), 0) AS expenses
    FROM transactions t
    WHERE ${workspace.clause}
      AND t.transaction_date BETWEEN ? AND ?
    `,
    [...workspace.params, period.startString, period.endString]
  );

  const [previousRows] = await db.query(
    `
    SELECT
      COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE 0 END), 0) AS income,
      COALESCE(SUM(CASE WHEN t.type = 'expense' THEN ABS(t.amount) ELSE 0 END), 0) AS expenses
    FROM transactions t
    WHERE ${workspace.clause}
      AND t.transaction_date BETWEEN ? AND ?
    `,
    [...workspace.params, period.previousStartString, period.previousEndString]
  );

  const trendSelect = period.mode === 'year'
    ? 'MONTH(t.transaction_date) AS period_key'
    : 't.transaction_date AS period_key';
  const trendGroup = period.mode === 'year'
    ? 'MONTH(t.transaction_date)'
    : 't.transaction_date';

  const [trendRows] = await db.query(
    `
    SELECT
      ${trendSelect},
      COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE 0 END), 0) AS income,
      COALESCE(SUM(CASE WHEN t.type = 'expense' THEN ABS(t.amount) ELSE 0 END), 0) AS expenses
    FROM transactions t
    WHERE ${workspace.clause}
      AND t.transaction_date BETWEEN ? AND ?
    GROUP BY ${trendGroup}
    ORDER BY ${trendGroup} ASC
    `,
    [...workspace.params, period.startString, period.chartEndString]
  );

  const [categoryRows] = await db.query(
    `
    SELECT
      c.name,
      c.color,
      c.icon,
      c.dashboard_featured,
      COALESCE(SUM(ABS(t.amount)), 0) AS total
    FROM transactions t
    INNER JOIN categories c ON c.id = t.category_id
    WHERE ${workspace.clause}
      AND t.type = 'expense'
      AND t.transaction_date BETWEEN ? AND ?
    GROUP BY c.id, c.name, c.color, c.icon, c.dashboard_featured
    ORDER BY total DESC
    LIMIT 6
    `,
    [...workspace.params, period.startString, period.endString]
  );

  const [featuredCategoryRows] = await db.query(
    `
    SELECT
      c.id,
      c.name,
      c.color,
      c.icon,
      COALESCE(SUM(CASE
        WHEN t.type = 'expense' AND t.transaction_date BETWEEN ? AND ? THEN ABS(t.amount)
        ELSE 0
      END), 0) AS total
    FROM categories c
    LEFT JOIN transactions t ON t.category_id = c.id AND ${workspace.clause.replace(/t\./g, 't.')}
    WHERE ${getWorkspaceCondition(currentUserId, familyId, 'c').clause}
      AND c.type = 'expense'
      AND c.dashboard_featured = 1
    GROUP BY c.id, c.name, c.color, c.icon
    ORDER BY total DESC, c.name ASC
    LIMIT 8
    `,
    [period.startString, period.endString, ...workspace.params, ...getWorkspaceCondition(currentUserId, familyId, 'c').params]
  );

  const [recentRows] = await db.query(
    `
    SELECT
      t.id,
      t.type,
      t.amount,
      t.description,
      t.transaction_date,
      c.name AS category_name,
      c.color AS category_color,
      c.icon AS category_icon,
      COALESCE(payer.name, creator.name, 'Unknown member') AS actor_name
    FROM transactions t
    INNER JOIN categories c ON c.id = t.category_id
    LEFT JOIN users payer ON payer.id = t.paid_by_user_id
    LEFT JOIN users creator ON creator.id = t.user_id
    WHERE ${workspace.clause}
    ORDER BY t.created_at DESC, t.id DESC
    LIMIT 5
    `,
    workspace.params
  );

  const [wishlistRows] = await db.query(
    `
    SELECT
      COALESCE(SUM(CASE WHEN w.status = 'planned' THEN w.amount ELSE 0 END), 0) AS planned_total,
      COALESCE(SUM(CASE WHEN w.status = 'bought' THEN w.amount ELSE 0 END), 0) AS bought_total,
      COALESCE(SUM(CASE WHEN w.status = 'postponed' THEN w.amount ELSE 0 END), 0) AS postponed_total,
      SUM(CASE WHEN w.status = 'planned' THEN 1 ELSE 0 END) AS planned_count,
      SUM(CASE WHEN w.status = 'bought' THEN 1 ELSE 0 END) AS bought_count,
      SUM(CASE WHEN w.status = 'postponed' THEN 1 ELSE 0 END) AS postponed_count,
      COUNT(*) AS total_count
    FROM wishlist_items w
    WHERE ${wishlistWorkspace.clause}
    `,
    wishlistWorkspace.params
  );

  const [wishlistGoalRows] = await db.query(
    `
    SELECT title, amount, image_url, desired_date
    FROM wishlist_items w
    WHERE ${wishlistWorkspace.clause}
      AND w.status = 'planned'
    ORDER BY
      CASE WHEN w.desired_date IS NULL THEN 1 ELSE 0 END,
      w.desired_date ASC,
      w.amount DESC
    LIMIT 3
    `,
    wishlistWorkspace.params
  );

  const [eventRows] = await db.query(
    `
    SELECT title, event_date, event_time, is_all_day, type, description, color
    FROM calendar_events e
    WHERE ${eventWorkspace.clause}
      AND e.event_date >= ?
      AND e.is_completed = 0
    ORDER BY e.event_date ASC, e.is_all_day DESC, e.event_time ASC
    LIMIT 3
    `,
    [...eventWorkspace.params, todayString]
  );

  const monthly = {
    income: roundCurrency(periodRows[0] ? periodRows[0].income : 0),
    expenses: roundCurrency(periodRows[0] ? periodRows[0].expenses : 0)
  };
  const previous = {
    income: roundCurrency(previousRows[0] ? previousRows[0].income : 0),
    expenses: roundCurrency(previousRows[0] ? previousRows[0].expenses : 0)
  };
  const savingsRate = monthly.income > 0
    ? Math.max(0, ((monthly.income - monthly.expenses) / monthly.income) * 100)
    : 0;
  const categoryTotal = categoryRows.reduce((sum, row) => sum + Number(row.total || 0), 0);
  const categoryBreakdown = categoryRows.map((row) => ({
    name: row.name,
    icon: row.icon,
    iconClass: getCategoryIcon(row.icon),
    color: row.color || '#6b7280',
    dashboardFeatured: Number(row.dashboard_featured || 0) === 1,
    total: roundCurrency(row.total),
    percent: categoryTotal > 0 ? roundCurrency((Number(row.total || 0) / categoryTotal) * 100) : 0
  }));
  const featuredCategories = featuredCategoryRows.map((row) => ({
    id: row.id,
    name: row.name,
    iconClass: getCategoryIcon(row.icon),
    color: row.color || '#6b7280',
    total: roundCurrency(row.total),
    percent: categoryTotal > 0 ? roundCurrency((Number(row.total || 0) / categoryTotal) * 100) : 0
  }));

  const wishlistSummary = wishlistRows[0] || {};
  const wishlistPlannedTotal = roundCurrency(wishlistSummary.planned_total);
  const balance = roundCurrency(balanceRows[0] ? balanceRows[0].balance : 0);
  const budgetHealth = calculateBudgetHealth(monthly.income, monthly.expenses, savingsRate, wishlistPlannedTotal, t);
  const topCategory = categoryBreakdown[0] || null;
  const wishlistAfterBalance = roundCurrency(balance - wishlistPlannedTotal);

  return {
    family,
    canEditBudget: getCanEditBudget(family),
    workspaceLabel: family ? t('dashboard.familyWorkspace') : t('dashboard.personalWorkspace'),
    period,
    periodLabel: period.label,
    summary: {
      balance,
      periodIncome: monthly.income,
      periodExpenses: monthly.expenses,
      savingsRate: roundCurrency(savingsRate),
      incomeChange: calculateChange(monthly.income, previous.income, false, t),
      expenseChange: calculateChange(monthly.expenses, previous.expenses, true, t)
    },
    charts: {
      cashFlow: period.mode === 'year'
        ? buildYearTrend(period.year, period.chartEnd, trendRows, period.containsToday, language, t)
        : buildMonthTrend(period.start, period.chartEnd, trendRows, period.containsToday, language, t),
      categories: {
        labels: categoryRows.map((row) => row.name),
        totals: categoryRows.map((row) => roundCurrency(row.total)),
        colors: categoryRows.map((row) => row.color || '#6b7280')
      }
    },
    categoryBreakdown,
    featuredCategories,
    categoryTotal: roundCurrency(categoryTotal),
    topCategory,
    recentTransactions: recentRows.map((row) => ({
      id: row.id,
      type: row.type,
      amount: roundCurrency(row.amount),
      description: row.description || row.category_name,
      dateLabel: normalizeDateLabel(row.transaction_date, language),
      actorName: row.actor_name || t('dashboard.unknownMember'),
      categoryName: row.category_name,
      categoryColor: row.category_color || '#6b7280',
      categoryIconClass: getCategoryIcon(row.category_icon),
      iconClass: getTransactionIcon(row.type)
    })),
    wishlist: {
      plannedTotal: wishlistPlannedTotal,
      boughtTotal: roundCurrency(wishlistSummary.bought_total),
      postponedTotal: roundCurrency(wishlistSummary.postponed_total),
      plannedCount: Number(wishlistSummary.planned_count || 0),
      boughtCount: Number(wishlistSummary.bought_count || 0),
      postponedCount: Number(wishlistSummary.postponed_count || 0),
      totalCount: Number(wishlistSummary.total_count || 0),
      afterBalance: wishlistAfterBalance,
      goals: wishlistGoalRows.map((row) => ({
        title: row.title,
        amount: roundCurrency(row.amount),
        imageUrl: row.image_url,
        desiredDate: row.desired_date ? normalizeDateLabel(row.desired_date, language) : ''
      })),
      nextGoal: wishlistGoalRows[0] ? {
        title: wishlistGoalRows[0].title,
        amount: roundCurrency(wishlistGoalRows[0].amount),
        imageUrl: wishlistGoalRows[0].image_url,
        desiredDate: wishlistGoalRows[0].desired_date ? normalizeDateLabel(wishlistGoalRows[0].desired_date, language) : ''
      } : null
    },
    upcomingEvents: eventRows.map((row) => ({
      title: row.title,
      dateLabel: normalizeDateLabel(row.event_date, language),
      timeLabel: Number(row.is_all_day) === 1 ? t('dashboard.allDay') : String(row.event_time || '').slice(0, 5),
      type: row.type,
      description: row.description || t('dashboard.noDescription'),
      color: row.color || '#111827'
    })),
    analytics: {
      budgetHealth,
      monthlyComparison: {
        incomeChange: calculateChange(monthly.income, previous.income, false, t),
        expenseChange: calculateChange(monthly.expenses, previous.expenses, true, t),
        balanceChange: calculateChange(monthly.income - monthly.expenses, previous.income - previous.expenses, false, t)
      },
      insight: topCategory
        ? `${t('dashboard.insight.biggestExpensePrefix')} ${topCategory.name}. ${t('dashboard.insight.biggestExpenseMiddle')} ${topCategory.percent.toFixed(1)}% ${t('dashboard.insight.biggestExpenseSuffix')} ${period.label}.`
        : t('dashboard.insight.addExpenses'),
      upcomingCount: eventRows.length
    }
  };
}

router.get('/', (req, res) => {
  if (req.session.user) {
    return res.redirect('/dashboard');
  }

  return res.redirect('/login');
});

// Render the authenticated dashboard with period filters and aggregated workspace data.
router.get('/dashboard', requireAuth, async (req, res) => {
  const t = getTranslator(req);
  const language = req.language || 'en';

  try {
    const dashboard = await loadDashboardData(req.session.user, req.query, t, language);

    return res.render('dashboard/index', {
      title: t('nav.dashboard'),
      activePage: 'dashboard',
      dashboard,
      errorMessage: ''
    });
  } catch (error) {
    console.error('Dashboard page error:', error.message);

    return res.render('dashboard/index', {
      title: t('nav.dashboard'),
      activePage: 'dashboard',
      dashboard: null,
      errorMessage: t('dashboard.messages.failedToLoadAnalytics')
    });
  }
});

module.exports = router;
