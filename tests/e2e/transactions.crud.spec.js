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

function transactionRow(page, text) {
  return page.locator('.transactions-table tbody tr').filter({ hasText: text });
}

async function openTransactionModal(page, rowText) {
  const row = transactionRow(page, rowText).first();
  await expect(row).toBeVisible();
  await row.locator('.transaction-manage-btn').click();

  const modal = page.locator('.transaction-edit-modal.show');
  await expect(modal).toBeVisible();
  return modal;
}

test.describe('transaction CRUD flow', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('creates, updates, and deletes a test expense transaction', async ({ page }) => {
    const uniqueId = Date.now();
    const createdDescription = `E2E Transaction ${uniqueId}`;
    const updatedDescription = `E2E Updated Transaction ${uniqueId}`;
    const today = new Date().toISOString().slice(0, 10);

    await page.goto('/transactions?showAll=1&view=date');
    await expect(page.locator('.transactions-shell')).toBeVisible();

    await page.locator('#toggleTransactionCreateButton').click();
    await expect(page.locator('#transactionCreatePanel')).toBeVisible();

    await page.locator('[data-transaction-type-option][data-value="expense"]').click();
    await page.locator('#transactionAmount').fill('12.34');
    await page.locator('#transactionDate').fill(today);
    await page.locator('#transactionDescription').fill(createdDescription);

    await expect(page.locator('#transactionCategory option')).not.toHaveCount(0);
    await page.locator('.transaction-form button[type="submit"]').click();

    await expect(page).toHaveURL(/\/transactions(?:\?|$)/);
    await expect(transactionRow(page, createdDescription)).toHaveCount(1);

    const editModal = await openTransactionModal(page, createdDescription);
    await editModal.locator('input[name="amount"]').fill('21.00');
    await editModal.locator('input[name="description"]').fill(updatedDescription);
    await editModal.locator('button[form^="transactionEditForm"]').click();

    await expect(transactionRow(page, updatedDescription)).toHaveCount(1);
    await expect(transactionRow(page, createdDescription)).toHaveCount(0);

    const deleteModal = await openTransactionModal(page, updatedDescription);

    page.once('dialog', async (dialog) => {
      await dialog.accept();
    });

    await deleteModal.locator('button[form^="transactionDeleteForm"]').click();

    await expect(page).toHaveURL(/\/transactions(?:\?|$)/);
    await expect(transactionRow(page, updatedDescription)).toHaveCount(0);
  });
});
