const { test, expect } = require('@playwright/test');

const E2E_USER_EMAIL = process.env.E2E_USER_EMAIL || 'admin@test.local';
const E2E_USER_PASSWORD = process.env.E2E_USER_PASSWORD || 'DemoOwner2026!';

async function login(page) {
  await page.goto('/login');
  await page.locator('#email').fill(E2E_USER_EMAIL);
  await page.locator('#password').fill(E2E_USER_PASSWORD);
  await page.locator('form.auth-form button[type="submit"]').click();
  await expect(page).toHaveURL(/\/dashboard(?:$|[?#])/);
}

function activeCategoryItem(page, categoryName) {
  return page
    .locator('.categories-tab-panel.is-active [data-category-view-panel="cards"] [data-category-item]')
    .filter({ hasText: categoryName });
}

test.describe('category CRUD flow', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('creates and deletes a test expense category', async ({ page }) => {
    const categoryName = `E2E Category ${Date.now()}`;

    await page.goto('/categories?tab=expense');
    await expect(page.locator('.categories-shell')).toBeVisible();

    await page.locator('#toggleCategoryCreateButton').click();
    await expect(page.locator('#categoryCreatePanel')).toBeVisible();

    await page.locator('#categoryName').fill(categoryName);
    await page.locator('#categoryCreateForm button[type="submit"]').click();

    await expect(page).toHaveURL(/\/categories(?:\?|$)/);
    await expect(activeCategoryItem(page, categoryName)).toHaveCount(1);

    await activeCategoryItem(page, categoryName)
      .locator('[data-open-category-modal]')
      .first()
      .click();

    const modal = page.locator('.category-modal:not([hidden])');
    await expect(modal).toBeVisible();
    await expect(modal.locator('input[name="name"]')).toHaveValue(categoryName);

    page.once('dialog', async (dialog) => {
      await dialog.accept();
    });

    await modal.locator('.category-delete-btn').click();

    await expect(page).toHaveURL(/\/categories(?:\?|$)/);
    await expect(activeCategoryItem(page, categoryName)).toHaveCount(0);
  });
});
