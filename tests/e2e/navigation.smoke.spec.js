// End-to-end smoke tests for authenticated navigation.
// The suite moves through the main application pages to confirm that shared layout links and page shells are available.

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

test.describe('authenticated page navigation', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('opens the main authenticated pages from the header navigation', async ({ page }) => {
    const pages = [
      { href: '/dashboard', shell: '.dashboard-shell' },
      { href: '/categories', shell: '.categories-shell' },
      { href: '/transactions', shell: '.transactions-shell' },
      { href: '/wishlist', shell: '.wishlist-shell' },
      { href: '/calendar', shell: '.calendar-shell' },
      { href: '/family', shell: '.family-shell' }
    ];

    for (const appPage of pages) {
      await page.locator(`a[href="${appPage.href}"]`).first().click();
      await expect(page).toHaveURL(new RegExp(`${appPage.href}(?:$|[?#])`));
      await expect(page.locator(appPage.shell)).toBeVisible();
    }
  });

  test('opens the account page for an authenticated user', async ({ page }) => {
    await page.goto('/account');

    await expect(page).toHaveURL(/\/account(?:$|[?#])/);
    await expect(page.locator('.account-page')).toBeVisible();
    await expect(page.locator('.app-header-user-name')).toBeVisible();
  });
});
