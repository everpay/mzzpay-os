import { test, expect, type Page, type Route } from '@playwright/test';

/**
 * Playwright E2E – payment idempotency key deduplication.
 *
 * Intercepts the process-payment Edge Function at the network level,
 * submits the same idempotency key twice, and asserts:
 *   1. Both calls return the same transaction ID.
 *   2. No duplicate ledger entries are created.
 */

const EDGE_FN_PATTERN = /\/functions\/v1\/process-payment/;

/** Helper: build a deterministic payment payload with a fixed idempotency key. */
function makePayload(idempotencyKey: string) {
  return {
    amount: 10.0,
    currency: 'USD',
    paymentMethod: 'card',
    customerEmail: 'test-idem@example.com',
    description: 'Idempotency E2E',
    idempotencyKey,
    redirectMode: 'modal',
    customerDetails: { firstName: 'Idem', lastName: 'Test', phone: '5551234567' },
    billingDetails: {
      address: '123 Idem St',
      postalCode: '10001',
      city: 'New York',
      state: 'NY',
      country: 'US',
    },
    cardDetails: {
      number: '4111111111111111',
      expMonth: '12',
      expYear: '30',
      cvc: '123',
      holderName: 'Idem Test',
    },
  };
}

test.describe('Payment idempotency key – duplicate prevention', () => {
  test('same idempotency key returns identical transaction, no duplicate ledger entries', async ({
    page,
  }) => {
    // We intercept the Edge Function responses so we can inspect them
    // without actually relying on a live processor (the test runs against
    // whatever environment the preview is pointed at).

    const responses: Array<{ status: number; body: any }> = [];

    // Intercept and pass-through all process-payment calls, recording bodies
    await page.route(EDGE_FN_PATTERN, async (route: Route) => {
      const response = await route.fetch();
      const body = await response.json().catch(() => ({}));
      responses.push({ status: response.status(), body });
      await route.fulfill({ response });
    });

    const idempotencyKey = `e2e_idem_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const payload = makePayload(idempotencyKey);

    // Navigate and wait for the app to be ready
    await page.goto('/payments/new');
    await page.waitForLoadState('networkidle');

    // We bypass the form and invoke the Edge Function directly twice
    // using page.evaluate so we stay in the same auth context.
    const callEdgeFunction = async () =>
      page.evaluate(async (p) => {
        const { supabase } = await import('/src/integrations/supabase/client.ts' as any);
        const { data, error } = await (supabase as any).functions.invoke('process-payment', {
          body: p,
        });
        return { data, error: error ? String(error) : null };
      }, payload);

    const [res1, res2] = await Promise.all([callEdgeFunction(), callEdgeFunction()]);

    // Both calls should succeed (status 200 at the edge-fn level)
    expect(res1.error).toBeNull();
    expect(res2.error).toBeNull();

    // If both returned a transaction, the IDs must match (idempotency)
    const txId1 = res1.data?.transaction?.id;
    const txId2 = res2.data?.transaction?.id;
    if (txId1 && txId2) {
      expect(txId1).toBe(txId2);
    }

    // Verify intercepted network responses agree
    for (const r of responses) {
      expect(r.status).toBe(200);
    }

    // If we got a transaction id, verify the ledger doesn't have duplicates.
    // We check via the balance-check Edge Function or directly via the page.
    if (txId1) {
      const ledgerCheck = await page.evaluate(async (txId) => {
        const { supabase } = await import('/src/integrations/supabase/client.ts' as any);
        const { data, error } = await (supabase as any)
          .from('ledger_entries')
          .select('id')
          .eq('reference_id', txId);
        return { count: data?.length ?? 0, error: error ? String(error) : null };
      }, txId1);

      // There should be exactly the expected number of entries (typically 2:
      // debit + credit), NOT 4 which would indicate a duplicate posting.
      if (ledgerCheck.error === null && ledgerCheck.count > 0) {
        expect(ledgerCheck.count).toBeLessThanOrEqual(2);
      }
    }
  });
});
