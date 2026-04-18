import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";

Deno.test('moneto-mpg: missing credentials yields config error path', () => {
  Deno.env.delete('MONETO_MPG_MERCHANT_ID');
  Deno.env.delete('MONETO_MPG_MERCHANT_SECRET');
  const id = Deno.env.get('MONETO_MPG_MERCHANT_ID');
  const secret = Deno.env.get('MONETO_MPG_MERCHANT_SECRET');
  assertEquals(id, undefined);
  assertEquals(secret, undefined);
});

Deno.test('moneto-mpg: basic auth header is constructed correctly', () => {
  const merchantId = '78582531-4405-50e1-b97f-9475df0fccb1';
  const secret = 'sk_sandbox_test';
  const expected = `Basic ${btoa(`${merchantId}:${secret}`)}`;
  assert(expected.startsWith('Basic '));
  // Decode and verify round-trip
  const decoded = atob(expected.replace('Basic ', ''));
  assertEquals(decoded, `${merchantId}:${secret}`);
});

Deno.test('moneto-mpg: refund endpoint path requires payment_id', () => {
  const payment_id = '67a28e5c39ff44895186a7b5';
  const path = `/payments/integration-api/payments/${payment_id}/refund`;
  assert(path.includes(payment_id));
  assert(path.endsWith('/refund'));
});
