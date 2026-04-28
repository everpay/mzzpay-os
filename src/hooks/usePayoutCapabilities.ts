/**
 * Payouts capability matrix.
 *
 * Returns which currencies have a real, persisted payout backend. Today only
 * CAD payouts hit Moneto; USD/EUR/GBP payouts have no edge function, no
 * `payouts` table, and would silently disappear after page reload.
 *
 * This hook is consumed by the Payouts page to gate the UI: unsupported
 * currencies render a clear "coming soon" empty state instead of a broken
 * form. Update the matrix when new payout providers ship (e.g. Risonpay
 * SEPA, Shieldhub ACH).
 */
export type PayoutCurrency = "CAD" | "USD" | "EUR" | "GBP";

export interface PayoutCapability {
  currency: PayoutCurrency;
  enabled: boolean;
  provider: string | null;
  reason?: string;
}

const MATRIX: PayoutCapability[] = [
  { currency: "CAD", enabled: true, provider: "moneto" },
  {
    currency: "USD",
    enabled: false,
    provider: null,
    reason: "ACH/Wire payout backend not yet implemented",
  },
  {
    currency: "EUR",
    enabled: false,
    provider: null,
    reason: "SEPA payout backend pending Risonpay payout endpoint",
  },
  {
    currency: "GBP",
    enabled: false,
    provider: null,
    reason: "Faster Payments backend not yet implemented",
  },
];

export function usePayoutCapabilities() {
  const supported = MATRIX.filter((c) => c.enabled);
  const unsupported = MATRIX.filter((c) => !c.enabled);
  return {
    matrix: MATRIX,
    supported,
    unsupported,
    isSupported: (currency: string) =>
      MATRIX.some((c) => c.currency === currency && c.enabled),
    payoutsBackendReady: supported.length > 0,
    /**
     * Whether the entire payouts feature has any persistent backend.
     * Today: NO real `payouts` table — even CAD via Moneto is a transient
     * in-memory record. Set to true once a `payouts` table is added and
     * the moneto-wallet function persists rows.
     */
    payoutsPersistenceReady: false,
  };
}
