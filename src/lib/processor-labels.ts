/**
 * Single source of truth for processor display names.
 *
 * Internal/database keys (`matrix`, `mzzpay`, `shieldhub`, `mondo`, …) map to
 * the public-facing brand labels surfaced in the merchant portal, settings,
 * docs, and admin dashboards. Always go through `processorLabel()` /
 * `processorEnvironmentLabel()` instead of hardcoding strings so a rename
 * only needs to happen in one place.
 *
 * Note: `mzzpay` and `shieldhub` are the same upstream endpoint and therefore
 * share the same public label.
 */

export type ProcessorKey =
  | "matrix"
  | "mzzpay"
  | "shieldhub"
  | "mondo"
  | "moneto"
  | "moneto_mpg"
  | "stripe"
  | string;

const LABELS: Record<string, string> = {
  matrix: "EU/International",
  mzzpay: "US/International",
  shieldhub: "US/International",
  mondo: "Openbanking EU",
  moneto: "Moneto Wallet",
  moneto_mpg: "Moneto Payment Gateway",
  stripe: "Stripe",
};

const DESCRIPTIONS: Record<string, string> = {
  matrix:
    "EUR/USD card processing reserved for gambling, casino, lottery, sportsbook and sweepstakes merchants. Enabled per-merchant by super admins.",
  mzzpay:
    "Primary 2D card MID — USD/multi-currency card processing for US and international merchants. No 3DS step-up.",
  shieldhub:
    "Primary 2D card MID — USD/multi-currency card processing for US and international merchants. No 3DS step-up.",
  mondo:
    "EUR/GBP open banking, SEPA, Faster Payments and 3DS card processing for EU/UK merchants.",
};

export function processorLabel(key: ProcessorKey | null | undefined): string {
  if (!key) return "—";
  return LABELS[key] ?? key;
}

export function processorDescription(
  key: ProcessorKey | null | undefined,
): string | undefined {
  if (!key) return undefined;
  return DESCRIPTIONS[key];
}

export function processorEnvironmentLabel(
  key: ProcessorKey | null | undefined,
  environment?: string | null,
): string {
  const base = processorLabel(key);
  if (!environment) return base;
  return `${base} · ${environment}`;
}

/** All public processor labels currently advertised to merchants. */
export const PUBLIC_PROCESSOR_LABELS = Array.from(
  new Set(Object.values(LABELS)),
);
