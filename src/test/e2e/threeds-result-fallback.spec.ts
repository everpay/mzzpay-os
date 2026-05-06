import { test, expect } from '@playwright/test';

/**
 * Playwright E2E tests for /3ds-result fallback (Session Context Missing).
 *
 * When sessionStorage has NO 3ds_transaction_id and NO 3ds_return_to,
 * the page must render the fallback UI with clear messaging and
 * navigation buttons.
 */

test.describe('/3ds-result fallback – Session Context Missing', () => {
  test.beforeEach(async ({ page }) => {
    // Clear sessionStorage before navigating so the fallback triggers
    await page.addInitScript(() => {
      sessionStorage.removeItem('3ds_transaction_id');
      sessionStorage.removeItem('3ds_return_to');
    });
  });

  test('renders Session Context Missing heading', async ({ page }) => {
    await page.goto('/3ds-result');
    const heading = page.getByRole('heading', { name: 'Session Context Missing' });
    await expect(heading).toBeVisible({ timeout: 10_000 });
  });

  test('shows explanation text', async ({ page }) => {
    await page.goto('/3ds-result');
    await expect(
      page.getByText(/couldn't find the original payment session/i),
    ).toBeVisible({ timeout: 10_000 });
  });

  test('"Go to Payments" navigates to /payments/new', async ({ page }) => {
    await page.goto('/3ds-result');
    const btn = page.getByRole('button', { name: 'Go to Payments' });
    await expect(btn).toBeVisible({ timeout: 10_000 });
    await btn.click();
    await page.waitForURL('**/payments/new', { timeout: 10_000 });
    expect(page.url()).toContain('/payments/new');
  });

  test('"Go to Dashboard" navigates to /', async ({ page }) => {
    await page.goto('/3ds-result');
    const btn = page.getByRole('button', { name: 'Go to Dashboard' });
    await expect(btn).toBeVisible({ timeout: 10_000 });
    await btn.click();
    // The dashboard is at root "/"
    await page.waitForURL(/\/$/, { timeout: 10_000 });
  });

  test('shows query-param debug info when status param is present', async ({ page }) => {
    await page.goto('/3ds-result?status=failed&error_code=3DS_TIMEOUT&error_message=Timed+out');
    await expect(page.getByText('Status: failed')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Code: 3DS_TIMEOUT')).toBeVisible();
    await expect(page.getByText('Message: Timed out')).toBeVisible();
  });

  test('shows "Secured by 3D Secure 2.0" badge', async ({ page }) => {
    await page.goto('/3ds-result');
    await expect(page.getByText('Secured by 3D Secure 2.0')).toBeVisible({ timeout: 10_000 });
  });
});
