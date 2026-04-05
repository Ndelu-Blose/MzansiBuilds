const { test, expect } = require('@playwright/test');

test.describe('Landing page', () => {
  test('loads hero and MzansiBuilds copy', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('body')).toContainText('MzansiBuilds', { timeout: 15000 });
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
  });

  test('hero CTA links to login', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('hero-cta-btn').click();
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
  });
});
