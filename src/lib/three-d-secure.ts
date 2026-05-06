export function isAbsoluteHttpUrl(value?: string | null): value is string {
  if (!value) return false;

  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

const APPROVED_STATUSES = new Set([
  'approved', 'success', 'completed', 'captured', 'authorized', 'paid', 'ok',
]);
const DECLINED_STATUSES = new Set([
  'declined', 'failed', 'error', 'blocked', 'rejected', 'insufficient_funds', 'failed3ds',
]);
// "redirect" alone is intentionally NOT here — many declines also redirect to a
// receipt/error page. We require an explicit 3DS-style status OR response code 800.
// Statuses that indicate the issuer wants the customer to complete an ACS
// challenge. We also treat generic "pending" / "redirect" as 3DS-eligible
// **when an absolute redirect URL is present** — many gateways (ShieldHub,
// makapay, etc.) bucket every issuer challenge under those statuses.
const THREEDS_STATUSES = new Set([
  'requires_action', 'authentication_required', '3ds_required', 'pending_3ds', 'requires_3ds',
  'pending', 'redirect', 'processing',
]);

/**
 * Decide whether a provider response represents a 3DS challenge that needs the
 * customer to interact with the issuer's ACS page.
 *
 * Returns the redirect URL **only** when:
 *   - payment method is card,
 *   - provider explicitly signals a 3DS-style status OR code 800,
 *   - AND a usable absolute http(s) redirect URL is present.
 *
 * If the provider response says approved/declined, we *never* trigger 3DS —
 * even if some auxiliary URL is echoed back. This prevents the modal from
 * appearing for cards that did not actually require Strong Customer
 * Authentication, which previously caused Failed 3DS toasts on approved
 * transactions.
 */
export function getThreeDSecureRedirectUrl(providerResponse: any, paymentMethod?: string): string | null {
  if (paymentMethod !== 'card' || !providerResponse) return null;

  const status = String(providerResponse.status || '').toLowerCase();

  // Hard short-circuit: if the provider already gave a terminal answer, skip 3DS.
  if (APPROVED_STATUSES.has(status) || DECLINED_STATUSES.has(status)) return null;

  // Also skip if the wrapper bubbled up a `success: true` flag (process-payment
  // sets this on authorized cascades) or `internal_status: completed/failed`.
  if (providerResponse.success === true) return null;
  if (providerResponse.success === false) return null; // explicit decline — never challenge
  const internal = String(providerResponse.internal_status || '').toLowerCase();
  if (internal === 'completed' || internal === 'failed') return null;

  // If the provider attached an error code that's not the 3DS sentinel (800),
  // treat it as a decline and never open the issuer iframe — prevents prepaid/2DS
  // cards from showing a "transaction failed" page rendered inside our 3DS modal.
  // NOTE: We intentionally do NOT short-circuit on `errMsg` alone — ShieldHub
  // (and many other gateways) ALWAYS attach a "3DS required" message alongside
  // code 800 and `redirect_url`. Killing the modal here was the bug that left
  // payments stuck on "Payment processing — Checking status…" forever.
  const errCode = String(providerResponse.error?.code || providerResponse.error_code || '').toLowerCase();
  if (errCode && errCode !== '800') {
    return null;
  }

  const redirectUrl =
    providerResponse['3d_secure_redirect_url'] ||
    providerResponse.redirect_url ||
    providerResponse.acs_url ||
    providerResponse.threeds_url ||
    providerResponse.checkout_url;
  if (!isAbsoluteHttpUrl(redirectUrl)) return null;

  const responseCode = String(
    providerResponse.error?.code || providerResponse.respcode || providerResponse.response_code || ''
  ).toLowerCase();

  const isThreeDSStatus = THREEDS_STATUSES.has(status);
  const isThreeDSCode = responseCode === '800';

  return isThreeDSStatus || isThreeDSCode ? redirectUrl : null;
}
