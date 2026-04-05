const { test, expect } = require('@playwright/test');

test.describe('Login page', () => {
  test('shows sign-in form and toggles to create account', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible({ timeout: 15000 });
    await page.getByTestId('toggle-auth-mode').click();
    await expect(page.getByRole('heading', { name: 'Create account' })).toBeVisible();
  });

  test('opens forgot password panel when Supabase is configured', async ({ page }) => {
    await page.goto('/login');
    const forgot = page.getByTestId('forgot-password-link');
    if (await forgot.isVisible()) {
      await forgot.click();
      await expect(page.getByTestId('forgot-password-panel')).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Reset password' })).toBeVisible();
    }
  });
});
