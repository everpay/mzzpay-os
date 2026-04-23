/**
 * Hosted checkout URL builder.
 *
 * Strategy (no-friction merchant payments):
 * 1. We always default to the apex `https://mzzpay.io/checkout?...` because it is
 *    guaranteed to serve the SPA and preserve query parameters.
 * 2. The pretty `https://checkout.mzzpay.io/` subdomain is supported by the app
 *    (App.tsx redirects `/` to `/checkout` on that hostname), but at the time of
 *    writing the DNS/CDN layer for that subdomain redirects every request back
 *    to the apex AND strips the query string — which breaks payments.
 * 3. Until the DNS is fixed at the registrar, builders should use the apex URL
 *    so customers never land on a broken page.
 *
 * To opt back into the pretty subdomain once DNS is fixed, set:
 *   localStorage.setItem('mzz:useCheckoutSubdomain', '1')
 * or pass `{ preferSubdomain: true }`.
 */

const APEX_HOST = "mzzpay.io";
const SUBDOMAIN_HOST = "checkout.mzzpay.io";

export interface CheckoutLinkParams {
  amount?: string | number;
  currency: string;
  description?: string;
  email?: string;
  name?: string;
  ref?: string;
  method?: string;
  merchantId?: string;
  successUrl?: string;
  cancelUrl?: string;
}

function shouldUseSubdomain(preferSubdomain?: boolean): boolean {
  if (preferSubdomain) return true;
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem("mzz:useCheckoutSubdomain") === "1";
  } catch {
    return false;
  }
}

export function buildCheckoutUrl(
  params: CheckoutLinkParams,
  opts: { preferSubdomain?: boolean } = {}
): string {
  const useSub = shouldUseSubdomain(opts.preferSubdomain);
  const host = useSub ? SUBDOMAIN_HOST : APEX_HOST;
  // Subdomain serves checkout at root; apex uses /checkout path.
  const path = useSub ? "/" : "/checkout";

  const sp = new URLSearchParams();
  if (params.amount !== undefined && params.amount !== "") {
    sp.set("amount", String(params.amount));
  }
  sp.set("currency", params.currency);
  if (params.description) sp.set("description", params.description);
  if (params.email) sp.set("email", params.email);
  if (params.name) sp.set("name", params.name);
  if (params.ref) sp.set("ref", params.ref);
  if (params.method && params.method !== "all") sp.set("method", params.method);
  if (params.merchantId) sp.set("merchant_id", params.merchantId);
  if (params.successUrl) sp.set("success_url", params.successUrl);
  if (params.cancelUrl) sp.set("cancel_url", params.cancelUrl);

  return `https://${host}${path}?${sp.toString()}`;
}

/**
 * Returns the host currently used for checkout links (for UI display).
 */
export function currentCheckoutHost(preferSubdomain?: boolean): string {
  return shouldUseSubdomain(preferSubdomain) ? SUBDOMAIN_HOST : APEX_HOST;
}
