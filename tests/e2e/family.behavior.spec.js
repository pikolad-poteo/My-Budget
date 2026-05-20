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

async function closeModal(page, modalSelector) {
  const modal = page.locator(modalSelector);

  const closeButton = modal.locator(
    '.btn-close, [data-bs-dismiss="modal"], button:has-text("Cancel"), button:has-text("Close")'
  ).first();

  if (await closeButton.count()) {
    await closeButton.click();
  } else {
    await page.keyboard.press('Escape');
  }

  await expect(modal).toBeHidden();
}

test.describe('family page behavior', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
  });

  test('shows the correct family mode controls without changing data', async ({ page }) => {
    await page.goto('/family');
    await expect(page.locator('.family-shell')).toBeVisible();

    const personalMode = page.locator('.family-empty-card');
    if (await personalMode.count()) {
      await expect(personalMode).toBeVisible();
      await expect(page.locator('.family-access-card')).toBeVisible();

      await page.locator('[data-bs-target="#createFamilyModal"]').click();
      await expect(page.locator('#createFamilyModal')).toBeVisible();
      await expect(page.locator('#createFamilyModal input[name="familyName"]')).toBeVisible();
      await closeModal(page, '#createFamilyModal');
      return;
    }

    await expect(page.locator('.family-overview-card')).toBeVisible();
    await expect(page.locator('.family-role-summary-card')).toBeVisible();
    await expect(page.locator('.family-members-card')).toBeVisible();
    await expect(page.locator('.family-member-item').first()).toBeVisible();

    await page.locator('[data-bs-target="#familyPermissionsPanel"]').click();
    await expect(page.locator('#familyPermissionsPanel')).toBeVisible();

    const addMemberButton = page.locator('.family-add-member-btn');
    if (await addMemberButton.count()) {
      await addMemberButton.click();
      await expect(page.locator('#addFamilyMemberModal')).toBeVisible();
      await expect(page.locator('#familyMemberEmail')).toBeVisible();
      await expect(page.locator('#familyMemberRole')).toBeVisible();
      await closeModal(page, '#addFamilyMemberModal');
    }

    const deleteFamilyButton = page.locator('.family-delete-row button');
    if (await deleteFamilyButton.count()) {
      await deleteFamilyButton.click();
      await expect(page.locator('#deleteFamilyModal')).toBeVisible();
      await expect(page.locator('#deleteFamilyModal input[name="confirmation"]')).toBeVisible();
      await closeModal(page, '#deleteFamilyModal');
    }
  });

  test('expands, filters, and sorts family activity in place', async ({ page }) => {
    await page.goto('/family');
    await expect(page.locator('.family-shell')).toBeVisible();

    const activityList = page.locator('#familyActivityList');
    await expect(activityList).toBeVisible();

    const toggleButton = page.locator('#toggleFamilyActivityButton');
    if (await toggleButton.count()) {
      await toggleButton.click();
      await expect(activityList).toHaveAttribute('data-view-mode', 'expanded');

      const oldSortButton = page.locator('[data-activity-sort-button="asc"]');
      if (await oldSortButton.count()) {
        await oldSortButton.click();
        await expect(activityList).toHaveAttribute('data-sort', 'asc');

        await page.locator('[data-activity-sort-button="desc"]').click();
        await expect(activityList).toHaveAttribute('data-sort', 'desc');
      }
    }

    const memberActivityButton = page.locator('[data-member-activity-button]').first();
    if (await memberActivityButton.count()) {
      const memberId = await memberActivityButton.getAttribute('data-member-id');
      await memberActivityButton.click();
      await expect(activityList).toHaveAttribute('data-view-mode', 'expanded');

      const userFilter = page.locator('#activityUserFilter');
      if (memberId && await userFilter.count()) {
        await expect(userFilter).toHaveValue(memberId);
      }
    }
  });
});
