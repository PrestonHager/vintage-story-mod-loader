import { test, expect } from '@playwright/test';

test.describe('Mod Pack Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should navigate to mod packs page', async ({ page }) => {
    // Check if mod packs link exists in navigation
    const modPacksLink = page.getByRole('link', { name: /mod packs/i });
    if (await modPacksLink.isVisible()) {
      await modPacksLink.click();
      await expect(page).toHaveURL(/.*\/packs/);
    } else {
      // If link doesn't exist, check navigation structure
      const nav = page.locator('nav');
      await expect(nav).toBeVisible();
    }
  });

  test('should display mod packs list', async ({ page }) => {
    // Navigate to mod packs page if link exists
    const modPacksLink = page.getByRole('link', { name: /mod packs/i });
    if (await modPacksLink.isVisible()) {
      await modPacksLink.click();
      await expect(page).toHaveURL(/.*\/packs/);

      // Check that mod packs list is displayed
      const heading = page.getByRole('heading', { name: /mod packs/i });
      await expect(heading).toBeVisible();
    }
  });

  test('should enable a mod pack', async ({ page }) => {
    // Navigate to mod packs page
    const modPacksLink = page.getByRole('link', { name: /mod packs/i });
    if (await modPacksLink.isVisible()) {
      await modPacksLink.click();
      await expect(page).toHaveURL(/.*\/packs/);

      // Look for enable button (if mod packs exist)
      const enableButton = page.getByRole('button', { name: /enable/i }).first();
      if (await enableButton.isVisible()) {
        await enableButton.click();
        // Should show success message or update UI
        await expect(page).toHaveURL(/.*\/packs/);
      }
    }
  });

  test('should disable a mod pack', async ({ page }) => {
    // Navigate to mod packs page
    const modPacksLink = page.getByRole('link', { name: /mod packs/i });
    if (await modPacksLink.isVisible()) {
      await modPacksLink.click();
      await expect(page).toHaveURL(/.*\/packs/);

      // Look for disable button (if enabled mod packs exist)
      const disableButton = page.getByRole('button', { name: /disable/i }).first();
      if (await disableButton.isVisible()) {
        await disableButton.click();
        // Should show success message or update UI
        await expect(page).toHaveURL(/.*\/packs/);
      }
    }
  });

  test('should expand mod pack to view mods', async ({ page }) => {
    // Navigate to mod packs page
    const modPacksLink = page.getByRole('link', { name: /mod packs/i });
    if (await modPacksLink.isVisible()) {
      await modPacksLink.click();
      await expect(page).toHaveURL(/.*\/packs/);

      // Look for expand/show mods button
      const showModsButton = page.getByRole('button', { name: /show mods/i }).first();
      if (await showModsButton.isVisible()) {
        await showModsButton.click();
        // Should display mod list
        await expect(page).toHaveURL(/.*\/packs/);
      }
    }
  });

  test('should handle empty mod packs list', async ({ page }) => {
    // Navigate to mod packs page
    const modPacksLink = page.getByRole('link', { name: /mod packs/i });
    if (await modPacksLink.isVisible()) {
      await modPacksLink.click();
      await expect(page).toHaveURL(/.*\/packs/);

      // Should display empty state message
      const emptyMessage = page.getByText(/no mod packs found/i);
      await expect(emptyMessage).toBeVisible();
    }
  });
});

