import { toast as sonnerToast } from "sonner";

/**
 * Centralised error → user-facing toast mapping.
 *
 * Every fetch/edge-function error in the merchant portal should funnel through
 * `notify*` so error copy and positioning stay consistent. Toasts are rendered
 * by the `<Toaster />` configured in `src/components/ui/sonner.tsx` with
 * center-center positioning.
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
  | "rate_limited"
  | "unauthorized"
  | "validation"
  | "network"
  | "unknown";

interface NormalizedError {
  code: NormalizedErrorCode;
  title: string;
  description: string;
}

const COPY: Record<NormalizedErrorCode, { title: string; description: string }> = {
  idempotency_conflict: {
    title: "Duplicate request",
    description:
      "This request has already been processed. We returned the original result instead of charging twice.",
  },
  provider_failure: {
    title: "Payment processor error",
    description:
      "The payment processor returned an error. Try again in a moment, or contact support if it persists.",
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
  unknown: {
    title: "Something went wrong",
    description: "An unexpected error occurred. Please try again.",
  },
};

const REGEX: Array<{ re: RegExp; code: NormalizedErrorCode }> = [
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

export function normalizeError(input: unknown): NormalizedError {
  if (!input) return { code: "unknown", ...COPY.unknown };

  // Accept Error, string, FunctionsError, FunctionsHttpError, plain objects
  const raw =
    typeof input === "string"
      ? input
      : (input as any)?.message ??
        (input as any)?.error?.message ??
        (input as any)?.error_description ??
        (input as any)?.statusText ??
        JSON.stringify(input);

  const codeField =
    (input as any)?.code ??
    (input as any)?.error?.code ??
    (input as any)?.status_code ??
    null;

  // Direct code matches
  if (typeof codeField === "string") {
    const c = codeField.toLowerCase();
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
  return { code: "unknown", ...COPY.unknown, description: String(raw).slice(0, 240) };
}

export function notifyError(input: unknown, opts?: { fallback?: string }) {
  const norm = normalizeError(input);
  sonnerToast.error(norm.title, {
    description: norm.description || opts?.fallback,
    position: "top-center",
  });
  return norm;
}

export function notifySuccess(title: string, description?: string) {
  sonnerToast.success(title, {
    description,
    position: "top-center",
  });
}

export function notifyInfo(title: string, description?: string) {
  sonnerToast(title, {
    description,
    position: "top-center",
  });
}
