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

function testDate() {
  const date = new Date();
  date.setDate(date.getDate() + 14);
  return date.toISOString().slice(0, 10);
}

function calendarEvent(page, title) {
  return page.locator('.calendar-day-item').filter({ hasText: title });
}

test.describe('calendar CRUD flow', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('creates, updates, and deletes a test calendar event', async ({ page }) => {
    const uniqueId = Date.now();
    const eventDate = testDate();
    const createdTitle = `E2E Calendar ${uniqueId}`;
    const updatedTitle = `E2E Updated Calendar ${uniqueId}`;

    await page.goto(`/calendar?view=day&date=${eventDate}`);
    await expect(page.locator('.calendar-shell')).toBeVisible();

    await page.locator('#toggleCalendarCreateButton').click();
    await expect(page.locator('#calendarCreatePanel')).toBeVisible();

    await page.locator('#calendar-title').fill(createdTitle);
    await page.locator('#calendar-date').fill(eventDate);
    await page.locator('#calendarCreatePanel button[type="submit"]').click();

    await expect(page).toHaveURL(new RegExp(`/calendar\\?view=day&date=${eventDate}`));
    await expect(calendarEvent(page, createdTitle)).toHaveCount(1);

    const createdEvent = calendarEvent(page, createdTitle).first();
    await createdEvent.locator('summary').click();

    const editForm = createdEvent.locator('form.calendar-edit-form');
    await expect(editForm).toBeVisible();
    await editForm.locator('input[name="title"]').fill(updatedTitle);
    await editForm.locator('button[type="submit"]').click();

    await expect(page).toHaveURL(new RegExp(`/calendar\\?view=day&date=${eventDate}`));
    await expect(calendarEvent(page, updatedTitle)).toHaveCount(1);
    await expect(calendarEvent(page, createdTitle)).toHaveCount(0);

    page.once('dialog', async (dialog) => {
      await dialog.accept();
    });

    await calendarEvent(page, updatedTitle)
      .first()
      .locator('form[action="/calendar/delete"] button[type="submit"]')
      .click();

    await expect(page).toHaveURL(new RegExp(`/calendar\\?view=day&date=${eventDate}`));
    await expect(calendarEvent(page, updatedTitle)).toHaveCount(0);
  });
});
