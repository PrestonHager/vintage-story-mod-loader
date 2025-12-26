import { test, expect } from '@playwright/test';

test.describe('Mod Loader Basic Functionality', () => {
  test('should load the application', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toContainText('Vintage Story Mod Loader');
  });

  test('should navigate to mods page', async ({ page }) => {
    await page.goto('/');
    await page.click('a[href="/mods"]');
    await expect(page).toHaveURL(/.*\/mods/);
  });

  test('should navigate to browser page', async ({ page }) => {
    await page.goto('/');
    await page.click('a[href="/browser"]');
    await expect(page).toHaveURL(/.*\/browser/);
  });

  test('should navigate to settings page', async ({ page }) => {
    await page.goto('/');
    await page.click('a[href="/settings"]');
    await expect(page).toHaveURL(/.*\/settings/);
  });
});

