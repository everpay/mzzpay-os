import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { normalizeShieldHubResponse, extractRedirectUrl } from "./shieldhub-normalize.ts";

// ─── ShieldHub 3DS behavior ───
// Redirect + challenge URL opens the 3DS modal. Redirect without a URL is a
// Failed3DS setup error, not an insufficient-funds decline.

Deno.test("Redirect WITHOUT url → Failed3DS missing challenge URL", () => {
  const out = normalizeShieldHubResponse(
    { id: 1, status: 'Redirect', error: { code: '800', message: 'Redirect customer' } },
    'ref_1',
  );
  assertEquals(out.status, 'Failed3DS');
  assertEquals(out.error?.code, '3DS_REDIRECT_MISSING_URL');
});

Deno.test("Redirect WITH url → Redirect for 3DS modal", () => {
  const out = normalizeShieldHubResponse(
    { id: 2, status: 'Redirect', redirect_url: 'https://acs.bank.example/3ds/abc' },
    'ref_2',
  );
  assertEquals(out.status, 'Redirect');
  assertEquals(out.redirect_url, 'https://acs.bank.example/3ds/abc');
});

Deno.test("Redirect with acs_url alias → Redirect", () => {
  const out = normalizeShieldHubResponse(
    { id: 3, status: 'Redirect', acs_url: 'https://acs.example.com/3ds/x' },
    'ref_3',
  );
  assertEquals(out.status, 'Redirect');
});

Deno.test("extractRedirectUrl ignores non-http strings", () => {
  assertEquals(extractRedirectUrl({ redirect_url: 'No URL' }), null);
  assertEquals(extractRedirectUrl({ redirect_url: 'https://x.io/y' }), 'https://x.io/y');
});

Deno.test("Approved → Approved", () => {
  const out = normalizeShieldHubResponse({ id: 4, status: 'Approved' }, 'ref_4');
  assertEquals(out.status, 'Approved');
});

Deno.test("Blocked → Declined", () => {
  const out = normalizeShieldHubResponse({ id: 5, status: 'Blocked', error: { code: '-', message: 'Min amount' } }, 'ref_5');
  assertEquals(out.status, 'Declined');
});

Deno.test("Declined → Declined preserves message", () => {
  const out = normalizeShieldHubResponse({ id: 6, status: 'Declined', error: { code: '304', message: 'Issuer declined' } }, 'ref_6');
  assertEquals(out.status, 'Declined');
  assertEquals(out.error?.code, '304');
});

Deno.test("transaction_reference is always set", () => {
  const out = normalizeShieldHubResponse({ id: 7, status: 'Approved' }, 'ref_7');
  assertEquals(out.transaction_reference, 'ref_7');
});
