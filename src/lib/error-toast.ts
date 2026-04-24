import { toast as sonnerToast } from "sonner";

/**
 * Centralised error → user-facing toast mapping.
 *
 * Every fetch/edge-function error in the merchant portal funnels through
 * `notify*` so error copy stays consistent. Each toast renders the
 * normalized error code in its description (in monospace square brackets)
 * so support and merchants can quote the exact code when reporting issues.
 *
 * Toasts render via the `<Toaster />` configured in
 * `src/components/ui/sonner.tsx`, anchored above center.
 */

export type NormalizedErrorCode =
  | "idempotency_conflict"
  | "provider_failure"
  | "region_blocked"
  | "card_declined"
  | "do_not_honor"
  | "insufficient_funds"
  | "expired_card"
  | "invalid_card"
  | "fraud_suspected"
  | "3ds_required"
  | "3ds_fallback_2d"
  | "rate_limited"
  | "unauthorized"
  | "validation"
  | "network"
  | "weak_password"
  | "user_already_exists"
  | "invalid_email"
  | "email_not_confirmed"
  | "invalid_credentials"
  | "processor_misconfigured"
  | "unknown";

interface NormalizedError {
  code: NormalizedErrorCode;
  title: string;
  description: string;
}

/**
 * Strict code → user-facing copy map.
 * Edits here should be the ONLY way to change customer-visible error wording.
 */
const COPY: Record<NormalizedErrorCode, { title: string; description: string }> = {
  idempotency_conflict: {
    title: "Duplicate request",
    description:
      "This request was already processed. We returned the original result instead of charging twice.",
  },
  provider_failure: {
    title: "Payment processor error",
    description:
      "The payment processor returned an error. Try again in a moment, or contact support if it keeps happening.",
  },
  region_blocked: {
    title: "Region not supported",
    description:
      "This payment route is not available in the customer's country. Try a different payment method.",
  },
  card_declined: {
    title: "Card declined",
    description: "The card was declined by the issuing bank.",
  },
  do_not_honor: {
    title: "Card declined (do not honor)",
    description: "The issuing bank declined the transaction without giving a reason.",
  },
  insufficient_funds: {
    title: "Insufficient funds",
    description: "The card does not have enough available balance to cover this charge.",
  },
  expired_card: {
    title: "Card expired",
    description: "Ask the customer for an updated card.",
  },
  invalid_card: {
    title: "Invalid card details",
    description: "Card number, CVV, or expiry are incorrect.",
  },
  fraud_suspected: {
    title: "Flagged as suspicious",
    description: "The processor's fraud engine blocked this transaction.",
  },
  "3ds_required": {
    title: "3DS authentication required",
    description: "Send the customer to the redirect URL to complete 3D Secure.",
  },
  "3ds_fallback_2d": {
    title: "3DS not available — fell back to 2D",
    description:
      "The issuer is not enrolled in 3D Secure. The charge proceeded as a standard 2D transaction.",
  },
  rate_limited: {
    title: "Too many requests",
    description: "Slow down — wait a few seconds and try again.",
  },
  unauthorized: {
    title: "Sign-in required",
    description: "Your session has expired. Sign in to continue.",
  },
  validation: {
    title: "Check the form",
    description: "Some fields are missing or invalid.",
  },
  network: {
    title: "Network error",
    description: "We couldn't reach the server. Check your connection and try again.",
  },
  weak_password: {
    title: "Password too weak",
    description:
      "This password has appeared in known data breaches or is too easy to guess. Pick a longer, unique password (mix of letters, numbers, symbols).",
  },
  user_already_exists: {
    title: "Account already exists",
    description:
      "An account with this email is already registered. Try signing in instead, or use a different email.",
  },
  invalid_email: {
    title: "Invalid email address",
    description: "Enter a valid email address (e.g. you@company.com).",
  },
  email_not_confirmed: {
    title: "Email not confirmed",
    description:
      "Open the confirmation link we sent to your inbox before signing in.",
  },
  invalid_credentials: {
    title: "Incorrect email or password",
    description: "Double-check your email and password and try again.",
  },
  processor_misconfigured: {
    title: "Processor not configured",
    description:
      "The payment processor is missing required acquirer settings (country, descriptor, or flow). Contact support so we can finish provisioning.",
  },
  unknown: {
    title: "Something went wrong",
    description: "An unexpected error occurred. Please try again.",
  },
};

const REGEX: Array<{ re: RegExp; code: NormalizedErrorCode }> = [
  // Auth-specific (Supabase) — match BEFORE generic patterns
  { re: /weak.?password|pwned|breach|password.*known/i, code: "weak_password" },
  { re: /already.*registered|already.*exists|user.?already|email.*taken|duplicate.*user/i, code: "user_already_exists" },
  { re: /email.*not.*confirm|confirm.*email|email_not_confirmed/i, code: "email_not_confirmed" },
  { re: /invalid.?login|invalid.*credential|wrong.*password|incorrect.*password/i, code: "invalid_credentials" },
  { re: /invalid.?email|email.*invalid|email_address_invalid/i, code: "invalid_email" },
  // Processor config
  { re: /processor.*not.*configured|missing.*acquirer|missing.*descriptor|processor_misconfigured/i, code: "processor_misconfigured" },
  { re: /3ds.*fallback|fallback.*2d|not.*enrolled|3ds_fallback/i, code: "3ds_fallback_2d" },
  // Payments
  { re: /idempot/i, code: "idempotency_conflict" },
  { re: /region|us\s?block|country.*block|geo.*block/i, code: "region_blocked" },
  { re: /3ds|three.?d.?secure|acs/i, code: "3ds_required" },
  { re: /insufficient/i, code: "insufficient_funds" },
  { re: /expired/i, code: "expired_card" },
  { re: /invalid.*card|card.*invalid|invalid.*cvv|invalid.*expiry/i, code: "invalid_card" },
  { re: /do.?not.?honor|do_not_honor/i, code: "do_not_honor" },
  { re: /declined|decline/i, code: "card_declined" },
  { re: /fraud|suspicious|risk/i, code: "fraud_suspected" },
  { re: /rate.?limit|429|too many/i, code: "rate_limited" },
  { re: /unauthor|401|jwt|sign.?in.?required/i, code: "unauthorized" },
  { re: /validation|invalid.*input|missing.*field/i, code: "validation" },
  { re: /network|fetch failed|timeout|econn|enetwork/i, code: "network" },
  {
    re: /(provider|processor|gateway|matrix|shieldhub|mondo|mpg|stripe)/i,
    code: "provider_failure",
  },
];

const CODE_FIELD_MAP: Record<string, NormalizedErrorCode> = {
  weak_password: "weak_password",
  user_already_exists: "user_already_exists",
  email_address_invalid: "invalid_email",
  email_not_confirmed: "email_not_confirmed",
  invalid_credentials: "invalid_credentials",
  invalid_grant: "invalid_credentials",
  processor_misconfigured: "processor_misconfigured",
  "3ds_fallback_2d": "3ds_fallback_2d",
};

export function normalizeError(input: unknown): NormalizedError {
  if (!input) return { code: "unknown", ...COPY.unknown };

  const raw =
    typeof input === "string"
      ? input
      : (input as any)?.message ??
        (input as any)?.error?.message ??
        (input as any)?.msg ??
        (input as any)?.error_description ??
        (input as any)?.statusText ??
        JSON.stringify(input);

  const codeField =
    (input as any)?.code ??
    (input as any)?.error_code ??
    (input as any)?.error?.code ??
    (input as any)?.status_code ??
    null;

  if (typeof codeField === "string") {
    const c = codeField.toLowerCase();
    if (CODE_FIELD_MAP[c]) {
      const mapped = CODE_FIELD_MAP[c];
      return { code: mapped, ...COPY[mapped] };
    }
    if (c.includes("idempotency")) return { code: "idempotency_conflict", ...COPY.idempotency_conflict };
    if (c.includes("region") || c.includes("country")) return { code: "region_blocked", ...COPY.region_blocked };
    if (c.includes("declined") || c.includes("card_declined")) return { code: "card_declined", ...COPY.card_declined };
    if (c.includes("3ds")) return { code: "3ds_required", ...COPY["3ds_required"] };
  }

  for (const { re, code } of REGEX) {
    if (re.test(String(raw))) {
      return { code, ...COPY[code] };
    }
  }
  return { code: "unknown", ...COPY.unknown };
}

/** Format the toast description so the error code is always visible. */
function withCode(code: NormalizedErrorCode, description: string) {
  return `${description}\n[code: ${code}]`;
}

export function notifyError(
  input: unknown,
  opts?: { fallback?: string; description?: string },
) {
  const norm = normalizeError(input);
  // Always pull the canonical description from COPY — never trust raw input
  // text in the toast body, but keep the raw error in console for debug.
  if (input) {
    // eslint-disable-next-line no-console
    console.warn(`[notifyError] ${norm.code}`, input);
  }
  const desc = opts?.description ?? COPY[norm.code].description ?? opts?.fallback ?? COPY.unknown.description;
  sonnerToast.error(norm.title, {
    description: withCode(norm.code, desc),
  });
  return norm;
}

export function notifySuccess(title: string, description?: string) {
  sonnerToast.success(title, {
    description: description ? `${description}\n[code: ok]` : `[code: ok]`,
  });
}

export function notifyInfo(title: string, description?: string) {
  sonnerToast(title, {
    description: description ? `${description}\n[code: info]` : `[code: info]`,
  });
}
