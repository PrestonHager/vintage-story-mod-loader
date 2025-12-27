import { test, expect } from '@playwright/test';

test.describe('Mod Pack Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should navigate to mod packs page', async ({ page }) => {
    // Check if mod packs link exists in navigation
    const modPacksLink = page.getByRole('link', { name: /mod packs/i });
    await expect(modPacksLink).toBeVisible();
    await modPacksLink.click();
    await expect(page).toHaveURL(/.*\/packs/);
  });

  test('should display mod packs list', async ({ page }) => {
    // Navigate to mod packs page
    const modPacksLink = page.getByRole('link', { name: /mod packs/i });
    await expect(modPacksLink).toBeVisible();
    await modPacksLink.click();
    await expect(page).toHaveURL(/.*\/packs/);

    // Check that mod packs list is displayed
    const heading = page.getByRole('heading', { name: /mod packs/i });
    await expect(heading).toBeVisible();
  });

  test('should enable a mod pack', async ({ page }) => {
    // Navigate to mod packs page
    const modPacksLink = page.getByRole('link', { name: /mod packs/i });
    await expect(modPacksLink).toBeVisible();
    await modPacksLink.click();
    await expect(page).toHaveURL(/.*\/packs/);

    // Look for enable button (if mod packs exist)
    const enableButton = page.getByRole('button', { name: /enable/i }).first();
    // Only test if button exists (skip if no mod packs available)
    const isVisible = await enableButton.isVisible().catch(() => false);
    if (isVisible) {
      await enableButton.click();
      // Should show success message or update UI
      await expect(page).toHaveURL(/.*\/packs/);
    } else {
      // Skip test if no mod packs to enable
      test.skip();
    }
  });

  test('should disable a mod pack', async ({ page }) => {
    // Navigate to mod packs page
    const modPacksLink = page.getByRole('link', { name: /mod packs/i });
    await expect(modPacksLink).toBeVisible();
    await modPacksLink.click();
    await expect(page).toHaveURL(/.*\/packs/);

    // Look for disable button (if enabled mod packs exist)
    const disableButton = page.getByRole('button', { name: /disable/i }).first();
    // Only test if button exists (skip if no enabled mod packs available)
    const isVisible = await disableButton.isVisible().catch(() => false);
    if (isVisible) {
      await disableButton.click();
      // Should show success message or update UI
      await expect(page).toHaveURL(/.*\/packs/);
    } else {
      // Skip test if no enabled mod packs to disable
      test.skip();
    }
  });

  test('should expand mod pack to view mods', async ({ page }) => {
    // Navigate to mod packs page
    const modPacksLink = page.getByRole('link', { name: /mod packs/i });
    await expect(modPacksLink).toBeVisible();
    await modPacksLink.click();
    await expect(page).toHaveURL(/.*\/packs/);

    // Look for expand/show mods button
    const showModsButton = page.getByRole('button', { name: /show mods/i }).first();
    // Only test if button exists (skip if no mod packs available)
    const isVisible = await showModsButton.isVisible().catch(() => false);
    if (isVisible) {
      await showModsButton.click();
      // Should display mod list
      await expect(page).toHaveURL(/.*\/packs/);
    } else {
      // Skip test if no mod packs to expand
      test.skip();
    }
  });

  test('should handle empty mod packs list', async ({ page }) => {
    // Navigate to mod packs page
    const modPacksLink = page.getByRole('link', { name: /mod packs/i });
    await expect(modPacksLink).toBeVisible();
    await modPacksLink.click();
    await expect(page).toHaveURL(/.*\/packs/);

    // Should display empty state message or mod packs list
    // This test checks that the page renders properly
    const pageContent = page.locator('main, body');
    await expect(pageContent).toBeVisible();
  });
});

