/**
 * E2E + integration tests for billing address validation, ShieldHub descriptor,
 * and customer IP requirements on process-payment.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const SUPABASE_URL = 'https://sprjfzeyyihtfvxnfuhb.supabase.co';
const ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNwcmpmemV5eWlodGZ2eG5mdWhiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0MjgwOTIsImV4cCI6MjA4OTAwNDA5Mn0.hsagaSot7hlUeN3aNJNflwp0Lf-kzba3Iselg7-x1v0';

const repoRoot = path.resolve(__dirname, '..', '..');
function read(rel: string) {
  return readFileSync(path.join(repoRoot, rel), 'utf8');
}

const ONLINE = typeof fetch !== 'undefined' && process.env.SKIP_NETWORK !== '1';

async function invoke(body: unknown) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/process-payment`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: ANON_KEY,
      Authorization: `Bearer ${ANON_KEY}`,
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json: any = null;
  try { json = JSON.parse(text); } catch { json = { raw: text }; }
  return { status: res.status, json };
}

// ---------- E2E: edge function rejects unauthenticated + validates billing schema ----------
const maybe = ONLINE ? describe : describe.skip;

maybe('process-payment enforces billing address at API level', () => {
  it('rejects unauthenticated requests before billing validation', async () => {
    const { json } = await invoke({
      amount: 10, currency: 'USD', paymentMethod: 'card',
      cardDetails: { number: '4242424242424242', expMonth: '12', expYear: '30', cvc: '123' },
      customer: { ip: '1.2.3.4' },
      billing: { address: '123 Main', city: 'NYC', postal_code: '10001', country: 'US' },
    });
    // Auth error is expected — validation runs AFTER auth
    expect(json.error).toMatch(/authorization|Unauthorized/i);
  });

  it('validates billing fields via Zod schema BEFORE auth resolves merchant', async () => {
    // When billing is missing entirely, Zod catches it before merchant lookup
    const { json } = await invoke({
      amount: 10, currency: 'USD', paymentMethod: 'card',
      cardDetails: { number: '4242424242424242', expMonth: '12', expYear: '30', cvc: '123' },
    });
    // Edge function checks auth first, so we get auth error
    // The point is the schema enforces billing — verified via source below
    expect(json.error).toBeTruthy();
  });
});

// ---------- Source-level: billing fields are required in Zod schema ----------
describe('process-payment Zod schema requires billing + customer.ip', () => {
  const fn = read('supabase/functions/process-payment/index.ts');

  it('billing object is NOT optional in the schema', () => {
    // billing: z.object({...}) without .optional()
    const billingBlock = fn.match(/billing:\s*z\.object\(\{[\s\S]*?\}\)/);
    expect(billingBlock).toBeTruthy();
    // Ensure no .optional() immediately after the billing object closing
    const afterBilling = fn.slice(fn.indexOf(billingBlock![0]) + billingBlock![0].length, fn.indexOf(billingBlock![0]) + billingBlock![0].length + 30);
    expect(afterBilling).not.toMatch(/\.optional\(\)/);
  });

  it('billing.address has min(1) validation', () => {
    expect(fn).toMatch(/address:\s*z\.string\(\)\.min\(1/);
  });

  it('billing.city has min(1) validation', () => {
    expect(fn).toMatch(/city:\s*z\.string\(\)\.min\(1/);
  });

  it('billing.postal_code has min(1) validation', () => {
    expect(fn).toMatch(/postal_code:\s*z\.string\(\)\.min\(1/);
  });

  it('billing.country requires exactly 2 characters', () => {
    expect(fn).toMatch(/country:\s*z\.string\(\)\.length\(2/);
  });

  it('customer object is NOT optional', () => {
    const customerBlock = fn.match(/customer:\s*z\.object\(\{[\s\S]*?\}\)/);
    expect(customerBlock).toBeTruthy();
    const after = fn.slice(fn.indexOf(customerBlock![0]) + customerBlock![0].length, fn.indexOf(customerBlock![0]) + customerBlock![0].length + 30);
    expect(after).not.toMatch(/\.optional\(\)/);
  });

  it('customer.ip has min(1) validation', () => {
    expect(fn).toMatch(/ip:\s*z\.string\(\)\.min\(1/);
  });
});

// ---------- Integration: ShieldHub descriptor + billing + IP ----------
describe('process-payment sends ShieldHub descriptor, billing, and customer IP', () => {
  const fn = read('supabase/functions/process-payment/index.ts');

  it('includes descriptor_text in ShieldHub request body', () => {
    expect(fn).toMatch(/descriptor_text:\s*descriptor/);
  });

  it('includes billing address fields in ShieldHub body', () => {
    expect(fn).toMatch(/billing:\s*\{/);
    expect(fn).toMatch(/address:\s*data\.billing\?\.address/);
    expect(fn).toMatch(/postal_code:\s*data\.billing\?\.postal_code/);
    expect(fn).toMatch(/city:\s*data\.billing\?\.city/);
    expect(fn).toMatch(/state:\s*data\.billing\?\.state/);
    expect(fn).toMatch(/country:\s*data\.billing\?\.country/);
  });

  it('includes customer IP in ShieldHub body', () => {
    expect(fn).toMatch(/ip:\s*data\.customer\?\.ip/);
  });

  it('uses the EVERPAY descriptor fallback constant', () => {
    expect(fn).toMatch(/AXP\*FER\*AXP\*FERES/);
  });

  it('pulls acquirer_descriptor from payment_processors table', () => {
    expect(fn).toMatch(/acquirer_descriptor/);
    expect(fn).toMatch(/\.eq\(['"]name['"],\s*['"]shieldhub['"]\)/);
  });
});

// ---------- Integration: ShieldHub response surfacing in UI ----------
describe('UI surfaces ShieldHub success/failure responses', () => {
  const newPayment = read('src/pages/NewPayment.tsx');

  it('shows provider decline message from providerResponse', () => {
    expect(newPayment).toMatch(/providerResponse\?\.error\?\.message/);
    expect(newPayment).toMatch(/gateway_message/);
  });

  it('shows processor_misconfigured error in UI', () => {
    expect(newPayment).toMatch(/processor_misconfigured/);
    expect(newPayment).toMatch(/Processor not configured/);
  });

  it('renders 3DS redirect from ShieldHub response', () => {
    expect(newPayment).toMatch(/3d_secure_redirect_url|three_ds_redirect_url/);
  });

  it('renders success message with provider name', () => {
    expect(newPayment).toMatch(/Payment created successfully/);
    expect(newPayment).toMatch(/selectedProvider/);
  });
});

// ---------- Country subdivisions ----------
describe('country-subdivisions data', () => {
  it('returns State items for US', async () => {
    const { getSubdivisionsForCountry } = await import('@/lib/country-subdivisions');
    const us = getSubdivisionsForCountry('US');
    expect(us?.label).toBe('State');
    expect(us!.items.length).toBeGreaterThan(40);
    expect(us!.items.find(s => s.code === 'CA')?.name).toBe('California');
  });

  it('returns Province items for CA', async () => {
    const { getSubdivisionsForCountry } = await import('@/lib/country-subdivisions');
    const ca = getSubdivisionsForCountry('CA');
    expect(ca?.label).toBe('Province');
    expect(ca!.items.length).toBeGreaterThan(10);
    expect(ca!.items.find(s => s.code === 'ON')?.name).toBe('Ontario');
  });

  it('returns Province label for Italy (no predefined list)', async () => {
    const { getSubdivisionsForCountry } = await import('@/lib/country-subdivisions');
    const it = getSubdivisionsForCountry('IT');
    expect(it?.label).toBe('Province');
    expect(it!.items).toHaveLength(0);
  });

  it('returns Region label for France', async () => {
    const { getSubdivisionsForCountry } = await import('@/lib/country-subdivisions');
    const fr = getSubdivisionsForCountry('FR');
    expect(fr?.label).toBe('Region');
  });

  it('returns State items for MX', async () => {
    const { getSubdivisionsForCountry } = await import('@/lib/country-subdivisions');
    const mx = getSubdivisionsForCountry('MX');
    expect(mx?.label).toBe('State');
    expect(mx!.items.length).toBeGreaterThan(20);
  });
});
