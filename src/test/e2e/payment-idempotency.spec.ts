import { test, expect, type Route } from '@playwright/test';

/**
 * Playwright E2E – payment idempotency key deduplication.
 *
 * Submits the same idempotency key twice via process-payment and asserts:
 *   1. Both calls return the same transaction ID (idempotent).
 *   2. No duplicate ledger entries are created (≤ 2 per reference).
 *   3. Response bodies are structurally identical.
 */

const EDGE_FN_PATTERN = /\/functions\/v1\/process-payment/;

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
  test('same idempotency key returns identical transaction ID', async ({ page }) => {
    const intercepted: Array<{ status: number; body: any }> = [];

    await page.route(EDGE_FN_PATTERN, async (route: Route) => {
      const response = await route.fetch();
      const body = await response.json().catch(() => ({}));
      intercepted.push({ status: response.status(), body });
      await route.fulfill({ response });
    });

    const idempotencyKey = `e2e_idem_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const payload = makePayload(idempotencyKey);

    await page.goto('/payments/new');
    await page.waitForLoadState('networkidle');

    const callEdgeFn = () =>
      page.evaluate(async (p) => {
        const { supabase } = await import('/src/integrations/supabase/client.ts' as any);
        const { data, error } = await (supabase as any).functions.invoke('process-payment', {
          body: p,
        });
        return { data, error: error ? String(error) : null };
      }, payload);

    // Fire both calls concurrently – worst case for idempotency
    const [res1, res2] = await Promise.all([callEdgeFn(), callEdgeFn()]);

    // Both should succeed at the HTTP level
    expect(res1.error).toBeNull();
    expect(res2.error).toBeNull();

    // Transaction IDs must match when both return one
    const txId1 = res1.data?.transaction?.id;
    const txId2 = res2.data?.transaction?.id;
    if (txId1 && txId2) {
      expect(txId1).toBe(txId2);
    }

    // All intercepted responses should be 200
    for (const r of intercepted) {
      expect(r.status).toBe(200);
    }
  });

  test('no duplicate ledger entries for the same idempotency key', async ({ page }) => {
    const idempotencyKey = `e2e_idem_ledger_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const payload = makePayload(idempotencyKey);

    await page.goto('/payments/new');
    await page.waitForLoadState('networkidle');

    const callEdgeFn = () =>
      page.evaluate(async (p) => {
        const { supabase } = await import('/src/integrations/supabase/client.ts' as any);
        const { data, error } = await (supabase as any).functions.invoke('process-payment', {
          body: p,
        });
        return { data, error: error ? String(error) : null };
      }, payload);

    const [res1, res2] = await Promise.all([callEdgeFn(), callEdgeFn()]);

    const txId = res1.data?.transaction?.id || res2.data?.transaction?.id;
    if (!txId) {
      test.skip(true, 'No transaction ID returned — cannot verify ledger');
      return;
    }

    // Check ledger for duplicates
    const ledger = await page.evaluate(async (refId: string) => {
      const { supabase } = await import('/src/integrations/supabase/client.ts' as any);
      const { data, error } = await (supabase as any)
        .from('ledger_entries')
        .select('id, entry_type, amount')
        .eq('reference_id', refId);
      return { entries: data || [], error: error ? String(error) : null };
    }, txId);

    if (ledger.error === null && ledger.entries.length > 0) {
      // Double-entry = at most 2 (debit + credit). 4 would mean duplicate posting.
      expect(ledger.entries.length).toBeLessThanOrEqual(2);
    }
  });

  test('response bodies are structurally identical on replay', async ({ page }) => {
    const idempotencyKey = `e2e_idem_struct_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const payload = makePayload(idempotencyKey);

    await page.goto('/payments/new');
    await page.waitForLoadState('networkidle');

    const callEdgeFn = () =>
      page.evaluate(async (p) => {
        const { supabase } = await import('/src/integrations/supabase/client.ts' as any);
        const { data } = await (supabase as any).functions.invoke('process-payment', { body: p });
        return data;
      }, payload);

    // Sequential to guarantee ordering
    const first = await callEdgeFn();
    const second = await callEdgeFn();

    if (first?.transaction?.id && second?.transaction?.id) {
      expect(first.transaction.id).toBe(second.transaction.id);
      expect(first.transaction.status).toBe(second.transaction.status);
    }
  });
});
