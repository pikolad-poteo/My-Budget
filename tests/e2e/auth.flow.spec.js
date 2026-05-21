const { test, expect } = require('@playwright/test');

const E2E_USER_EMAIL = process.env.E2E_USER_EMAIL || 'admin@test.local';
const E2E_USER_PASSWORD = process.env.E2E_USER_PASSWORD || 'DemoOwner2026!';

async function login(page) {
  await page.goto('/login');

  await page.locator('input[name="email"]').fill(E2E_USER_EMAIL);
  await page.locator('input[name="password"]').fill(E2E_USER_PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();

  await expect(page).toHaveURL(/\/dashboard$/);
}

test.describe('Authentication flow', () => {
  test('valid user can sign in and open the dashboard', async ({ page }) => {
    await login(page);

    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Categories' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Transactions' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Wishlist' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Calendar' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Family' })).toBeVisible();
  });

  test('invalid password keeps user on login page with an error', async ({ page }) => {
    await page.goto('/login');

    await page.locator('input[name="email"]').fill(E2E_USER_EMAIL);
    await page.locator('input[name="password"]').fill('WrongPassword2026!');
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByText('Invalid email or password.')).toBeVisible();
  });

  test('signed in user can log out and is protected from dashboard access', async ({ page }) => {
    await login(page);

    await page.goto('/logout');
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('heading', { name: 'Login' })).toBeVisible();

    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login$/);
  });
});
