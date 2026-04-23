/**
 * Validation + normalization for inbound hosted-checkout query parameters.
 *
 * The hosted checkout page is reached from many channels (payment links,
 * subscriptions, invoices, embedded buttons) so the parameter shape varies. We
 * normalize once, here, and surface clear errors instead of silently accepting
 * malformed input.
 *
 * Hard requirements (we MUST have these to render a real checkout):
 *  - merchant_id  → must be a UUID
 *  - currency     → must be a 3-letter ISO-4217 currency we actually accept
 *
 * Soft fields (sanitized but not required):
 *  - amount, ref, description, email, name, method
 *  - success_url, cancel_url → must be absolute http(s) URLs if provided
 */

export const ALLOWED_CURRENCIES = [
  "USD",
  "EUR",
  "GBP",
  "BRL",
  "MXN",
  "COP",
  "CAD",
  "AUD",
  "JPY",
  "CHF",
] as const;

export type AllowedCurrency = (typeof ALLOWED_CURRENCIES)[number];

export type CheckoutPaymentMethod = "all" | "card" | "openbanking" | "crypto";

export interface NormalizedCheckoutParams {
  amount: string;
  currency: AllowedCurrency;
  description: string;
  email: string;
  name: string;
  ref: string;
  orderId: string;
  method: CheckoutPaymentMethod;
  merchantId?: string;
  successUrl: string;
  cancelUrl: string;
}

export interface CheckoutParamIssue {
  field: string;
  message: string;
  /** "error" prevents checkout, "warn" only flags it. */
  severity: "error" | "warn";
}

export interface CheckoutParamValidation {
  values: NormalizedCheckoutParams;
  issues: CheckoutParamIssue[];
  isValid: boolean;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function safeDecode(value: string | null): string {
  if (!value) return "";
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function isAbsoluteHttpUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

function isValidAmount(value: string): boolean {
  if (!value) return true; // amount is optional
  const n = Number(value);
  return Number.isFinite(n) && n > 0 && n < 10_000_000;
}

function isValidEmail(value: string): boolean {
  if (!value) return true;
  // Pragmatic email check; real validation happens server-side.
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 320;
}

function normalizeMethod(value: string | null): CheckoutPaymentMethod {
  switch ((value || "all").toLowerCase()) {
    case "card":
      return "card";
    case "openbanking":
    case "open_banking":
      return "openbanking";
    case "crypto":
      return "crypto";
    default:
      return "all";
  }
}

/**
 * Validate raw query params (URLSearchParams or a record) and return a
 * normalized payload + the list of issues. Pages should render an error banner
 * whenever `isValid` is false.
 */
export function validateCheckoutParams(
  source: URLSearchParams | Record<string, string | null | undefined>
): CheckoutParamValidation {
  const get = (k: string): string | null => {
    if (source instanceof URLSearchParams) return source.get(k);
    const v = source[k];
    return v === undefined || v === null ? null : String(v);
  };

  const issues: CheckoutParamIssue[] = [];

  // --- Currency (required) ---
  const rawCurrency = (get("currency") || "USD").toUpperCase().trim();
  let currency: AllowedCurrency = "USD";
  if (!rawCurrency) {
    issues.push({
      field: "currency",
      message: "Currency is required.",
      severity: "error",
    });
  } else if (!ALLOWED_CURRENCIES.includes(rawCurrency as AllowedCurrency)) {
    issues.push({
      field: "currency",
      message: `Currency "${rawCurrency}" is not supported. Allowed: ${ALLOWED_CURRENCIES.join(", ")}.`,
      severity: "error",
    });
  } else {
    currency = rawCurrency as AllowedCurrency;
  }

  // --- Merchant id (required) ---
  const merchantIdRaw = (get("merchant_id") || "").trim();
  let merchantId: string | undefined;
  if (!merchantIdRaw) {
    issues.push({
      field: "merchant_id",
      message: "Missing merchant_id. This payment link is incomplete.",
      severity: "error",
    });
  } else if (!UUID_RE.test(merchantIdRaw)) {
    issues.push({
      field: "merchant_id",
      message: "merchant_id is not a valid identifier.",
      severity: "error",
    });
  } else {
    merchantId = merchantIdRaw;
  }

  // --- Amount (optional) ---
  const amount = (get("amount") || "").trim();
  if (amount && !isValidAmount(amount)) {
    issues.push({
      field: "amount",
      message: "Amount must be a positive number.",
      severity: "error",
    });
  }

  // --- Strings ---
  const description = safeDecode(get("description"));
  const email = safeDecode(get("email")).trim();
  const name = safeDecode(get("name")).trim();
  const ref = (get("ref") || "").trim();
  const orderId = (get("order_id") || ref).trim();
  const method = normalizeMethod(get("method"));

  if (email && !isValidEmail(email)) {
    issues.push({
      field: "email",
      message: "Customer email looks invalid.",
      severity: "warn",
    });
  }

  if (!ref) {
    issues.push({
      field: "ref",
      message: "Missing order reference (ref). Reconciliation may be harder.",
      severity: "warn",
    });
  }

  // --- URLs ---
  const successUrl = safeDecode(get("success_url"));
  const cancelUrl = safeDecode(get("cancel_url"));
  if (successUrl && !isAbsoluteHttpUrl(successUrl)) {
    issues.push({
      field: "success_url",
      message: "success_url must be an absolute http(s) URL.",
      severity: "error",
    });
  }
  if (cancelUrl && !isAbsoluteHttpUrl(cancelUrl)) {
    issues.push({
      field: "cancel_url",
      message: "cancel_url must be an absolute http(s) URL.",
      severity: "error",
    });
  }

  const values: NormalizedCheckoutParams = {
    amount,
    currency,
    description,
    email,
    name,
    ref,
    orderId,
    method,
    merchantId,
    successUrl,
    cancelUrl,
  };

  const isValid = !issues.some((i) => i.severity === "error");
  return { values, issues, isValid };
}
