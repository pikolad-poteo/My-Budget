const { test, expect } = require('@playwright/test');

test.describe('Authentication smoke tests', () => {
  test('login page renders the main auth form', async ({ page }) => {
    await page.goto('/login');

    await expect(page).toHaveTitle(/Login \| My Budget/);
    await expect(page.getByRole('heading', { name: 'Login' })).toBeVisible();
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
  });

  test('guest user is redirected from dashboard to login', async ({ page }) => {
    await page.goto('/dashboard');

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('heading', { name: 'Login' })).toBeVisible();
  });

  test('register and password recovery pages are reachable from login', async ({ page }) => {
    await page.goto('/login');

    await page.getByRole('link', { name: 'Create one here' }).click();
    await expect(page).toHaveURL(/\/register$/);
    await expect(page.getByRole('heading', { name: 'Register' })).toBeVisible();

    await page.goto('/login');
    await page.getByRole('link', { name: 'Forgot password?' }).click();
    await expect(page).toHaveURL(/\/forgot-password$/);
    await expect(page.getByRole('heading', { name: 'Forgot password' })).toBeVisible();
  });

  test('empty login submit shows validation feedback', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page.getByText('Please enter both email and password.')).toBeVisible();
  });
});
