/**
 * End-to-end smoke tests for the hosted checkout flows.
 *
 * Run with:  bunx playwright test src/test/e2e/checkout-hosts.spec.ts
 *
 * These tests exercise the LIVE production hosts to catch DNS / CDN drift
 * (the exact class of bug that broke checkout.mzzpay.io once already). They
 * are kept lightweight: GET each URL and assert that the SPA renders AND
 * the original query string is preserved end-to-end.
 *
 * Playwright is intentionally NOT a hard dev-dependency of the project. CI
 * installs it on demand via:  bunx playwright install --with-deps chromium
 */
import { test, expect } from '@playwright/test';

const APEX = 'https://mzzpay.io/checkout';
const SUBDOMAIN = 'https://checkout.mzzpay.io/';

const QS = new URLSearchParams({
  currency: 'USD',
  ref: 'ORD-E2E-PROBE',
  merchant_id: '144c0880-4734-43ef-a5aa-40bf382e1012',
  amount: '12.34',
});

async function expectsCheckoutRendered(page: import('@playwright/test').Page) {
  // The SPA always shows a "MZZPay" header on the checkout page.
  await expect(page.getByText(/MZZPay/i).first()).toBeVisible({ timeout: 15_000 });
}

function expectQueryPreserved(finalUrl: string) {
  const u = new URL(finalUrl);
  expect(u.searchParams.get('currency')).toBe('USD');
  expect(u.searchParams.get('ref')).toBe('ORD-E2E-PROBE');
  expect(u.searchParams.get('merchant_id')).toBe('144c0880-4734-43ef-a5aa-40bf382e1012');
}

test.describe('hosted checkout @live', () => {
  test('apex renders and preserves the query string', async ({ page }) => {
    const target = `${APEX}?${QS.toString()}`;
    const resp = await page.goto(target);
    expect(resp?.ok()).toBeTruthy();
    expectQueryPreserved(page.url());
    await expectsCheckoutRendered(page);
    // The error banner must NOT be visible when params are valid.
    await expect(page.getByTestId('checkout-error-banner')).toHaveCount(0);
  });

  test('subdomain serves the SPA and preserves the query string', async ({ page }) => {
    const target = `${SUBDOMAIN}?${QS.toString()}`;
    const resp = await page.goto(target);
    // We allow either a direct 200 or a redirect chain that ends at the SPA,
    // as long as the query string survives.
    expect(resp?.status()).toBeLessThan(500);
    expectQueryPreserved(page.url());
    await expectsCheckoutRendered(page);
  });

  test('apex shows the validation banner for an incomplete link', async ({ page }) => {
    await page.goto(`${APEX}?currency=USD`); // missing merchant_id
    await expect(page.getByTestId('checkout-error-banner')).toBeVisible();
    await expect(page.getByTestId('checkout-error-banner')).toContainText('merchant_id');
  });
});
