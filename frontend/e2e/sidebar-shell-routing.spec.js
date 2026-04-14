const { test, expect } = require('@playwright/test');

test.describe('Sidebar shell routing', () => {
  test('public app-shell pages render shared chrome', async ({ page }) => {
    await page.goto('/feed');
    await expect(page.locator('aside').first()).toBeVisible();
    await expect(page.getByRole('link', { name: 'Explore' }).first()).toBeVisible();

    await page.goto('/explore');
    await expect(page.getByRole('heading', { name: 'Explore Projects' })).toBeVisible();

    await page.goto('/celebration');
    await expect(page.getByRole('heading', { name: 'Celebration Wall' })).toBeVisible();
  });

  test('protected page redirects to login when signed out', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/);
  });
});
