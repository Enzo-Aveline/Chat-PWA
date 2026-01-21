import { test, expect } from '@playwright/test';

test('Login flow', async ({ page }) => {
  // 1. Navigate to the login page
  await page.goto('/login');

  // 2. Check for login input
  const input = page.getByPlaceholder('Ton pseudo');
  await expect(input).toBeVisible();

  // 3. Enter username
  await input.fill('TestUser');

  // 4. Click Login button
  await page.getByRole('button', { name: 'Enregistrer' }).click();

  // 5. Verify redirection or success state
  // We expect to see "Salons" or be on the menu page
  await expect(page).toHaveURL(/.*\/chat\/menu/);
});
