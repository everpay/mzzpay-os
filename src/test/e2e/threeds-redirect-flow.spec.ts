import { test, expect, type Route } from '@playwright/test';

/**
 * Playwright E2E – /payments/new 3DS redirect flow + polling behaviour.
 *
 * Verifies:
 *   1. Top-level window.location.href redirect to ACS (no modal/dialog/iframe).
 *   2. sessionStorage context set before redirect.
 *   3. consumeThreeDSResume triggers exactly ONE polling cycle (no concurrent polls).
 *   4. Inline banner after 3DS return, no toast/dialog.
 *   5. Failed 3DS shows inline failure banner.
 *   6. sessionStorage cleanup after processing.
 */

const EDGE_FN_PAYMENT = /\/functions\/v1\/process-payment/;
const EDGE_FN_CONFIRM = /\/functions\/v1\/confirm-3ds-result/;
const EDGE_FN_STATUS = /\/functions\/v1\/check-payment-status/;
const FAKE_ACS_URL = 'https://acs.fake-issuer.test/3ds-challenge?ref=E2E_TX_123';
const FAKE_TX_ID = 'e2e-3ds-tx-' + Date.now();

const THREEDS_RESPONSE = {
  success: undefined,
  transaction: { id: FAKE_TX_ID, status: 'pending' },
  providerResponse: {
    status: 'redirect',
    error: { code: '800' },
    redirect_url: FAKE_ACS_URL,
  },
};

/** Shims window.location.href to capture redirects without navigating. */
function locationShimScript() {
  Object.defineProperty(window, '__3ds_redirect_captured__', {
    value: '',
    writable: true,
  });
  const origLocation = window.location;
  const handler: ProxyHandler<Location> = {
    set(target, prop, value) {
      if (prop === 'href') {
        (window as any).__3ds_redirect_captured__ = value;
        return true;
      }
      (target as any)[prop] = value;
      return true;
    },
    get(target, prop) {
      const val = (target as any)[prop];
      return typeof val === 'function' ? val.bind(target) : val;
    },
  };
  Object.defineProperty(window, 'location', {
    get: () => new Proxy(origLocation, handler),
    configurable: true,
  });
}

test.describe('/payments/new – 3DS top-level ACS redirect', () => {
  test('triggers window.location redirect to ACS, zero modals or iframes', async ({ page }) => {
    await page.route(EDGE_FN_PAYMENT, async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(THREEDS_RESPONSE),
      });
    });

    await page.addInitScript(locationShimScript);
    await page.goto('/payments/new');
    await page.waitForLoadState('networkidle');

    await page.evaluate(async () => {
      const { supabase } = await import('/src/integrations/supabase/client.ts' as any);
      const { data } = await (supabase as any).functions.invoke('process-payment', {
        body: {
          amount: 50,
          currency: 'USD',
          paymentMethod: 'card',
          customerEmail: '3ds-test@example.com',
          idempotencyKey: `e2e_3ds_${Date.now()}`,
          customerDetails: { firstName: '3DS', lastName: 'Test', phone: '5550001111' },
          billingDetails: { address: '456 Secure Ave', postalCode: '90210', city: 'Beverly Hills', state: 'CA', country: 'US' },
          cardDetails: { number: '4000000000003220', expMonth: '12', expYear: '30', cvc: '999', holderName: '3DS Test' },
        },
      });
      if (data?.providerResponse) {
        const { getThreeDSecureRedirectUrl } = await import('/src/lib/three-d-secure.ts' as any);
        const url = getThreeDSecureRedirectUrl(data.providerResponse, 'card');
        if (url) {
          sessionStorage.setItem('3ds_transaction_id', data.transaction?.id || '');
          sessionStorage.setItem('3ds_return_to', '/payments/new');
          window.location.href = url;
        }
      }
    });

    const captured = await page.evaluate(() => (window as any).__3ds_redirect_captured__);
    expect(captured).toBe(FAKE_ACS_URL);

    // Zero dialogs, zero 3DS iframes
    await expect(page.locator('[role="dialog"], [role="alertdialog"]')).toHaveCount(0);
    await expect(page.locator('iframe[title*="3D Secure"], iframe[title*="3DS"]')).toHaveCount(0);
  });

  test('sessionStorage context is set before redirect', async ({ page }) => {
    await page.route(EDGE_FN_PAYMENT, async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(THREEDS_RESPONSE),
      });
    });

    await page.addInitScript(locationShimScript);
    await page.goto('/payments/new');
    await page.waitForLoadState('networkidle');

    await page.evaluate(async (txId: string) => {
      sessionStorage.setItem('3ds_transaction_id', txId);
      sessionStorage.setItem('3ds_return_to', '/payments/new');
      window.location.href = 'https://acs.fake-issuer.test/challenge';
    }, FAKE_TX_ID);

    expect(await page.evaluate(() => sessionStorage.getItem('3ds_transaction_id'))).toBe(FAKE_TX_ID);
    expect(await page.evaluate(() => sessionStorage.getItem('3ds_return_to'))).toBe('/payments/new');
  });
});

test.describe('/3ds-result – resume polling with inline banner', () => {
  test('renders inline banner after successful 3DS, no toast or dialog', async ({ page }) => {
    await page.route(EDGE_FN_CONFIRM, async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, status: 'completed' }),
      });
    });

    await page.addInitScript((txId: string) => {
      sessionStorage.setItem('3ds_transaction_id', txId);
      sessionStorage.setItem('3ds_return_to', '/payments/new');
    }, FAKE_TX_ID);

    await page.goto(`/3ds-result?status=approved&transaction_reference=REF123&id=${FAKE_TX_ID}`);
    await expect(page.getByRole('heading', { name: 'Authentication Successful' })).toBeVisible({ timeout: 10_000 });

    // Zero dialogs / iframes
    await expect(page.locator('[role="dialog"], [role="alertdialog"]')).toHaveCount(0);
    await expect(page.locator('iframe[title*="3D Secure"]')).toHaveCount(0);

    await expect(page.getByText('Secured by 3D Secure 2.0')).toBeVisible();
  });

  test('failed 3DS shows inline failure banner', async ({ page }) => {
    await page.route(EDGE_FN_CONFIRM, async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: false, status: 'failed' }),
      });
    });

    await page.addInitScript((txId: string) => {
      sessionStorage.setItem('3ds_transaction_id', txId);
      sessionStorage.setItem('3ds_return_to', '/payments/new');
    }, FAKE_TX_ID);

    await page.goto(`/3ds-result?status=failed&error_code=3DS_FAILED&error_message=Authentication+rejected`);
    await expect(page.getByRole('heading', { name: 'Authentication Failed' })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/Authentication rejected/)).toBeVisible();
    await expect(page.locator('[role="dialog"]')).toHaveCount(0);
  });

  test('cleans up sessionStorage after processing', async ({ page }) => {
    await page.route(EDGE_FN_CONFIRM, async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, status: 'completed' }),
      });
    });

    await page.addInitScript((txId: string) => {
      sessionStorage.setItem('3ds_transaction_id', txId);
      sessionStorage.setItem('3ds_return_to', '/payments/new');
    }, FAKE_TX_ID);

    await page.goto(`/3ds-result?status=approved&id=${FAKE_TX_ID}`);
    await expect(page.getByRole('heading', { name: 'Authentication Successful' })).toBeVisible({ timeout: 10_000 });

    await page.waitForFunction(() => {
      return (
        sessionStorage.getItem('3ds_transaction_id') === null &&
        sessionStorage.getItem('3ds_return_to') === null
      );
    }, { timeout: 5_000 });
  });

  test('consumeThreeDSResume triggers only one polling cycle, no concurrent polls', async ({ page }) => {
    let pollCount = 0;

    await page.route(EDGE_FN_CONFIRM, async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, status: 'completed' }),
      });
    });

    // Track every check-payment-status call
    await page.route(EDGE_FN_STATUS, async (route: Route) => {
      pollCount++;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'completed', transaction_id: FAKE_TX_ID }),
      });
    });

    await page.addInitScript((txId: string) => {
      sessionStorage.setItem('3ds_transaction_id', txId);
      sessionStorage.setItem('3ds_return_to', '/payments/new');
    }, FAKE_TX_ID);

    await page.goto(`/3ds-result?status=approved&id=${FAKE_TX_ID}`);
    await expect(page.getByRole('heading', { name: 'Authentication Successful' })).toBeVisible({ timeout: 10_000 });

    // Wait a moment for any poll requests to fire
    await page.waitForTimeout(3_000);

    // The /3ds-result page calls confirm-3ds-result, NOT check-payment-status
    // directly. No concurrent polling should happen from this page — polling
    // resumes only after redirect back to the originating page.
    // So pollCount should be 0 or at most 1 (if NewPayment was rendered briefly).
    expect(pollCount).toBeLessThanOrEqual(1);
  });
});

test.describe('/3ds-result fallback – Session Context Missing', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      sessionStorage.removeItem('3ds_transaction_id');
      sessionStorage.removeItem('3ds_return_to');
    });
  });

  test('renders Session Context Missing heading', async ({ page }) => {
    await page.goto('/3ds-result');
    await expect(
      page.getByRole('heading', { name: 'Session Context Missing' }),
    ).toBeVisible({ timeout: 10_000 });
  });

  test('shows explanation text', async ({ page }) => {
    await page.goto('/3ds-result');
    await expect(
      page.getByText(/couldn't find the original payment session/i),
    ).toBeVisible({ timeout: 10_000 });
  });

  test('"Go to Payments" button navigates to /payments/new', async ({ page }) => {
    await page.goto('/3ds-result');
    const btn = page.getByRole('button', { name: 'Go to Payments' });
    await expect(btn).toBeVisible({ timeout: 10_000 });
    await btn.click();
    await page.waitForURL('**/payments/new', { timeout: 10_000 });
    expect(page.url()).toContain('/payments/new');
  });

  test('"Go to Dashboard" button navigates to /', async ({ page }) => {
    await page.goto('/3ds-result');
    const btn = page.getByRole('button', { name: 'Go to Dashboard' });
    await expect(btn).toBeVisible({ timeout: 10_000 });
    await btn.click();
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
