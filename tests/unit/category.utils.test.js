const {
  sanitizeCategoryName,
  sanitizeCategoryType,
  sanitizeCategoryScope,
  getWorkspaceCondition,
  sanitizeCategoryColor,
  sanitizeCategoryIcon,
  sanitizeCategoryDashboardFeatured,
  buildCategoriesRedirect,
  setCategoryFlash
} = require('../../scr/category.utils');

describe('category utility helpers', () => {
  test('sanitizes category names by trimming, normalizing spaces and limiting length', () => {
    const longName = `  Food    and     groceries ${'x'.repeat(120)}  `;

    const result = sanitizeCategoryName(longName);

    expect(result).toMatch(/^Food and groceries/);
    expect(result).toHaveLength(100);
    expect(result).not.toContain('  ');
  });

  test('allows only income or expense category types', () => {
    expect(sanitizeCategoryType('income')).toBe('income');
    expect(sanitizeCategoryType('expense')).toBe('expense');
    expect(sanitizeCategoryType('unknown')).toBe('expense');
    expect(sanitizeCategoryType()).toBe('expense');
  });

  test('chooses category scope from current workspace state', () => {
    expect(sanitizeCategoryScope('family', { id: 3 })).toBe('family');
    expect(sanitizeCategoryScope('personal', null)).toBe('personal');
  });

  test('builds personal and family workspace conditions', () => {
    expect(getWorkspaceCondition(7, null)).toEqual({
      clause: 'user_id = ? AND family_id IS NULL',
      params: [7]
    });

    expect(getWorkspaceCondition(7, 12, 'c')).toEqual({
      clause: 'c.family_id = ?',
      params: [12]
    });
  });

  test('sanitizes colors and icons with safe defaults', () => {
    expect(sanitizeCategoryColor('#12abEF')).toBe('#12abEF');
    expect(sanitizeCategoryColor('red')).toBe('#6c757d');
    expect(sanitizeCategoryIcon('CART3')).toBe('cart3');
    expect(sanitizeCategoryIcon('not-real')).toBe('tag');
  });

  test('converts dashboard featured values to database flags', () => {
    expect(sanitizeCategoryDashboardFeatured('1')).toBe(1);
    expect(sanitizeCategoryDashboardFeatured('on')).toBe(1);
    expect(sanitizeCategoryDashboardFeatured(true)).toBe(1);
    expect(sanitizeCategoryDashboardFeatured('0')).toBe(0);
  });

  test('builds categories redirect with safe tab and optional query', () => {
    const req = {
      body: { redirectTab: 'income', redirectQuery: 'food' },
      query: {}
    };

    expect(buildCategoriesRedirect(req)).toBe('/categories?tab=income&q=food');

    const fallbackReq = {
      body: { redirectTab: 'invalid' },
      query: {}
    };

    expect(buildCategoriesRedirect(fallbackReq)).toBe('/categories?tab=all');
  });

  test('stores category flash messages in session', () => {
    const req = { session: {} };

    setCategoryFlash(req, 'success', 'Saved');

    expect(req.session.categoryFlash).toEqual({ type: 'success', message: 'Saved' });
  });
});
