const { test, expect } = require('@playwright/test');

const E2E_USER_EMAIL = process.env.E2E_USER_EMAIL || 'admin@test.local';
const E2E_USER_PASSWORD = process.env.E2E_USER_PASSWORD || 'Owner2026!';

async function signIn(page) {
  await page.goto('/login');
  await page.locator('input[name="email"]').fill(E2E_USER_EMAIL);
  await page.locator('input[name="password"]').fill(E2E_USER_PASSWORD);
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/dashboard(?:\?|$)/);
}

function wishlistCard(page, title) {
  return page.locator('.wishlist-item-card').filter({ hasText: title });
}

async function openWishlistCreatePanel(page) {
  const overviewButton = page.locator('#toggleWishlistCreateButton');
  if (await overviewButton.count()) {
    await overviewButton.click();
  } else {
    await page.locator('[data-wishlist-open-add-choice]').first().click();
  }
  await expect(page.locator('#wishlistCreatePanel')).toBeVisible();
}

test.describe('wishlist CRUD flow', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
  });

  test('creates, updates, and deletes a test wishlist item', async ({ page }) => {
    const uniqueId = Date.now();
    const createdTitle = `E2E Wishlist ${uniqueId}`;
    const updatedTitle = `E2E Updated Wishlist ${uniqueId}`;

    await page.goto('/wishlist');
    await expect(page.locator('.wishlist-shell')).toBeVisible();

    await openWishlistCreatePanel(page);
    await page.locator('#wishlistTitle').fill(createdTitle);
    await page.locator('#wishlistPrice').fill('123.45');
    await page.locator('#wishlistDescription').fill('Created by Playwright E2E test.');
    await page.locator('#wishlistCreatePanel button[type="submit"]').click();

    await expect(page).toHaveURL(/\/wishlist(?:\?|$)/);
    await expect(wishlistCard(page, createdTitle)).toHaveCount(1);

    await wishlistCard(page, createdTitle).click();
    await expect(page).toHaveURL(/\/wishlist\/\d+(?:\?|$)/);
    await expect(page.locator('.wishlist-detail-card h1')).toHaveText(createdTitle);

    await page.locator('[data-wishlist-edit-open]').click();
    const editModal = page.locator('.wishlist-item-edit-modal').filter({ has: page.locator('input[name="title"]') });
    await expect(editModal).toBeVisible();

    await editModal.locator('input[name="title"]').fill(updatedTitle);
    await editModal.locator('input[name="amount"]').fill('234.56');
    await editModal.locator('textarea[name="description"]').fill('Updated by Playwright E2E test.');
    await editModal.locator('button[type="submit"]').click();

    await expect(page.locator('.wishlist-detail-card h1')).toHaveText(updatedTitle);
    await expect(page.locator('.wishlist-detail-description')).toContainText('Updated by Playwright E2E test.');

    await page.locator('[data-wishlist-delete-open]').click();
    const deleteModal = page.locator('#wishlistItemDeleteModal').filter({ hasText: updatedTitle });
    await expect(deleteModal).toBeVisible();
    await deleteModal.locator('button[type="submit"]').click();

    await expect(page).toHaveURL(/\/wishlist(?:\?|$)/);
    await expect(wishlistCard(page, updatedTitle)).toHaveCount(0);
  });
});
