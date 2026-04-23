/**
 * Hosted checkout URL builder.
 *
 * Strategy (no-friction merchant payments):
 * 1. By default we use the apex `https://mzzpay.io/checkout?...` because it is
 *    guaranteed to serve the SPA and preserve query parameters.
 * 2. The pretty `https://checkout.mzzpay.io/` subdomain is supported by the app
 *    (App.tsx redirects `/` → `/checkout` on that hostname), but at the time of
 *    writing the DNS/CDN layer for that subdomain redirects every request back
 *    to the apex AND strips the query string — which breaks payments.
 * 3. Merchants can flip ON the subdomain via their settings (persisted in
 *    Supabase as `merchants.prefer_checkout_subdomain`). We always honor that
 *    preference but the merchant dashboard runs a live host probe before saving
 *    a payment link to warn them when the subdomain is misconfigured.
 *
 * Localstorage flag `mzz:useCheckoutSubdomain=1` still works as a per-browser
 * developer override (handy for QA without touching the DB).
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

export interface BuildCheckoutUrlOptions {
  /** Force the subdomain regardless of merchant or local override. */
  preferSubdomain?: boolean;
  /** Merchant preference loaded from the DB (overrides default, overridden by preferSubdomain). */
  merchantPreference?: boolean | null;
}

function localOverride(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem("mzz:useCheckoutSubdomain") === "1";
  } catch {
    return false;
  }
}

function shouldUseSubdomain(opts: BuildCheckoutUrlOptions = {}): boolean {
  if (opts.preferSubdomain === true) return true;
  if (opts.preferSubdomain === false) return false;
  if (opts.merchantPreference === true) return true;
  return localOverride();
}

export function buildCheckoutUrl(
  params: CheckoutLinkParams,
  opts: BuildCheckoutUrlOptions = {}
): string {
  const useSub = shouldUseSubdomain(opts);
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
 * Returns the host the link builder would currently use, given the same
 * options. Useful for displaying it in the UI.
 */
export function currentCheckoutHost(opts: BuildCheckoutUrlOptions = {}): string {
  return shouldUseSubdomain(opts) ? SUBDOMAIN_HOST : APEX_HOST;
}

export const CHECKOUT_HOSTS = {
  apex: APEX_HOST,
  subdomain: SUBDOMAIN_HOST,
} as const;
