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
const THREEDS_STATUSES = new Set([
  'requires_action', 'authentication_required', '3ds_required', 'pending_3ds', 'requires_3ds',
  'pending', 'redirect', 'processing',
]);

export function getThreeDSecureRedirectUrl(providerResponse: any, paymentMethod?: string): string | null {
  if (paymentMethod !== 'card' || !providerResponse) return null;

  const status = String(providerResponse.status || '').toLowerCase();

  if (APPROVED_STATUSES.has(status) || DECLINED_STATUSES.has(status)) return null;
  if (providerResponse.success === true) return null;
  if (providerResponse.success === false) return null;
  const internal = String(providerResponse.internal_status || '').toLowerCase();
  if (internal === 'completed' || internal === 'failed') return null;

  const errCode = String(providerResponse.error?.code || providerResponse.error_code || '').toLowerCase();
  if (errCode && errCode !== '800') return null;

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
