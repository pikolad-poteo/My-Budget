// End-to-end tests for read-only UI interactions.
// These checks verify that panels, filters and controls open correctly without creating or deleting database records.

const { test, expect } = require('@playwright/test');

// Credentials are configurable so the same tests can run against local or CI test databases.
const E2E_USER_EMAIL = process.env.E2E_USER_EMAIL || 'admin@test.local';
const E2E_USER_PASSWORD = process.env.E2E_USER_PASSWORD || 'DemoOwner2026!';

// Reusable login helper keeps authenticated scenarios focused on the feature under test.
async function login(page) {
  await page.goto('/login');
  await page.locator('#email').fill(E2E_USER_EMAIL);
  await page.locator('#password').fill(E2E_USER_PASSWORD);
  await page.locator('form.auth-form button[type="submit"]').click();
  await expect(page).toHaveURL(/\/dashboard(?:$|[?#])/);
}

async function expectPanelToggle(page, url, buttonSelector, panelSelector, fieldSelector) {
  await page.goto(url);
  await expect(page.locator(panelSelector)).toBeHidden();

  await page.locator(buttonSelector).click();
  await expect(page.locator(panelSelector)).toBeVisible();
  await expect(page.locator(fieldSelector)).toBeVisible();

  await page.locator(buttonSelector).click();
  await expect(page.locator(panelSelector)).toBeHidden();
}

test.describe('read-only UI interactions', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('opens and closes the category create panel without saving', async ({ page }) => {
    await expectPanelToggle(
      page,
      '/categories',
      '#toggleCategoryCreateButton',
      '#categoryCreatePanel',
      '#categoryName'
    );
  });

  test('opens and closes the transaction create panel without saving', async ({ page }) => {
    await expectPanelToggle(
      page,
      '/transactions',
      '#toggleTransactionCreateButton',
      '#transactionCreatePanel',
      '#transactionDate'
    );
  });

  test('opens and closes the wishlist create panel without saving', async ({ page }) => {
    await expectPanelToggle(
      page,
      '/wishlist',
      '#toggleWishlistCreateButton',
      '#wishlistCreatePanel',
      '#wishlistTitle'
    );
  });

  test('opens and closes the calendar create panel without saving', async ({ page }) => {
    await expectPanelToggle(
      page,
      '/calendar',
      '#toggleCalendarCreateButton',
      '#calendarCreatePanel',
      '#calendar-title'
    );
  });

  test('opens transaction advanced filters without applying them', async ({ page }) => {
    await page.goto('/transactions');

    const toggle = page.locator('[data-advanced-filters-toggle]');
    const panel = page.locator('[data-advanced-filters-panel]');

    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect(panel).toHaveClass(/is-open/);
    await expect(page.locator('#filterFrom')).toBeVisible();
    await expect(page.locator('#filterTo')).toBeVisible();
  });

  test('switches calendar between month and day views without creating an event', async ({ page }) => {
    await page.goto('/calendar');

    await page.locator('.calendar-view-btn[href*="view=day"]').click();
    await expect(page).toHaveURL(/\/calendar\?view=day/);
    await expect(page.locator('.calendar-shell')).toBeVisible();

    await page.locator('.calendar-view-btn[href*="view=month"]').click();
    await expect(page).toHaveURL(/\/calendar\?view=month/);
    await expect(page.locator('.calendar-shell')).toBeVisible();
  });
});
