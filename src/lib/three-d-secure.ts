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

// Statuses that EXPLICITLY indicate a 3DS challenge — these alone are enough
// to trigger a redirect (when a redirect URL is also present).
const EXPLICIT_THREEDS_STATUSES = new Set([
  'requires_action', 'authentication_required', '3ds_required', 'pending_3ds', 'requires_3ds',
]);

// Ambiguous statuses: many processors return these for BOTH 3DS challenges AND
// normal 2D flows (receipt redirects, async processing, etc.). We only treat
// them as 3DS when the response ALSO contains the explicit 3DS sentinel code
// 800 — otherwise a 2D MID would incorrectly redirect to a non-ACS page.
const AMBIGUOUS_STATUSES = new Set([
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
 * IMPORTANT — 2D MID safety:
 *   Generic statuses like "pending", "redirect", "processing" are used by many
 *   gateways for non-3DS flows (receipt pages, async settlements). On a 2D MID
 *   where the issuer is NOT enrolled in 3DS, the processor still returns these
 *   statuses with a URL that is NOT an ACS page. We therefore require code 800
 *   alongside ambiguous statuses. Explicit 3DS statuses (requires_action,
 *   authentication_required, etc.) are trusted on their own.
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

  // Extract error/response code early — needed for both the non-800 guard and
  // the ambiguous-status gate below.
  const errCode = String(providerResponse.error?.code || providerResponse.error_code || '').toLowerCase();
  const responseCode = String(
    providerResponse.error?.code || providerResponse.respcode || providerResponse.response_code || ''
  ).toLowerCase();
  const isCode800 = errCode === '800' || responseCode === '800';

  // If the provider attached an error code that's not the 3DS sentinel (800),
  // treat it as a decline and never redirect — prevents prepaid/2D cards from
  // being sent to a "transaction failed" receipt page.
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

  // Explicit 3DS status → always trust it
  if (EXPLICIT_THREEDS_STATUSES.has(status)) return redirectUrl;

  // Code 800 → always trust it (regardless of status string)
  if (isCode800) return redirectUrl;

  // Ambiguous status WITHOUT code 800 → do NOT redirect.
  // This is the critical 2D MID safety gate: the processor returned "pending"
  // or "redirect" with a URL, but no 3DS indicator. The URL is likely a
  // receipt page, not an ACS challenge.
  if (AMBIGUOUS_STATUSES.has(status)) return null;

  // Unknown status + no code 800 → safest to NOT redirect
  return null;
}
