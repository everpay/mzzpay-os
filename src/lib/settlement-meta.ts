// Single source of truth for the per-PSP settlement meta contract.
//
// Each PSP webhook writes a provider-namespaced meta block onto the transaction
// row's `processor_raw_response`. The UI reads any of these blocks via
// `deriveBadge` and produces the same BadgeKind regardless of provider.
//
// Writer side (must use buildProviderMeta or equivalent shape):
//   - supabase/functions/risonpay-webhook/index.ts   → _risonpay_meta
//   - supabase/functions/shieldhub-webhook (planned) → _shieldhub_meta
//   - supabase/functions/matrix-webhook/index.ts     → _matrix_meta
//
// Reader side:
//   - src/components/RisonpaySettlementBadge.tsx
//   - src/components/SettlementTimeline.tsx
//
// Locked by src/lib/settlement-meta.test.ts.

import { differenceInHours } from "date-fns";

export type SettlementStatus = "pending" | "scheduled" | "settled";
export type InternalTxStatus = "pending" | "processing" | "completed" | "failed" | "refunded";

/** Providers that publish a settlement meta block. */
export type SettlementProvider = "risonpay" | "shieldhub" | "matrix";

export interface ProviderSettlementMeta {
  mapped_status: InternalTxStatus;
  expected_settlement_at: string; // ISO-8601
  settlement_status: SettlementStatus;
  received_at: string; // ISO-8601
}

/** Backwards-compatible alias — Risonpay was the first PSP wired up. */
export type RisonpayMeta = ProviderSettlementMeta;

/**
 * Settlement-day SLA per PSP. Single place to change if a contract changes.
 *   - Shieldhub  → T+7 (card MID, MX acquirer)
 *   - Risonpay   → T+7 (card; APMs settle T+1)
 *   - Matrix     → T+4
 */
export function settlementDaysFor(
  provider: SettlementProvider,
  paymentMethod?: string | null,
): number {
  const isCard = (paymentMethod || "").toLowerCase().includes("card");
  switch (provider) {
    case "shieldhub":
      return 7;
    case "matrix":
      return 4;
    case "risonpay":
    default:
      // APM rails (open banking, SEPA, iDEAL...) clear next business day,
      // card rails follow the standard T+7 PSP schedule.
      return isCard ? 7 : 1;
  }
}

/** Map an InternalTxStatus → the provider-published settlement_status. */
function settlementStatusFor(mapped: InternalTxStatus): SettlementStatus {
  return mapped === "completed" ? "scheduled" : "pending";
}

/** Build the meta block any PSP webhook should attach to its transaction row. */
export function buildProviderMeta(args: {
  provider: SettlementProvider;
  mappedStatus: InternalTxStatus;
  paymentMethod?: string | null;
  now?: Date;
}): ProviderSettlementMeta {
  const now = args.now ?? new Date();
  const days = settlementDaysFor(args.provider, args.paymentMethod);
  return {
    mapped_status: args.mappedStatus,
    expected_settlement_at: new Date(now.getTime() + days * 86_400_000).toISOString(),
    settlement_status: settlementStatusFor(args.mappedStatus),
    received_at: now.toISOString(),
  };
}

/** Risonpay-specific shim kept for the existing webhook + tests. */
export function buildRisonpayMeta(args: {
  mappedStatus: InternalTxStatus;
  paymentMethod?: string | null;
  now?: Date;
}): RisonpayMeta {
  return buildProviderMeta({ provider: "risonpay", ...args });
}

/** Map provider → expected key in `processor_raw_response`. */
export const META_KEY_FOR: Record<SettlementProvider, string> = {
  risonpay: "_risonpay_meta",
  shieldhub: "_shieldhub_meta",
  matrix: "_matrix_meta",
};

export type BadgeKind = "missing" | "settled" | "delayed" | "scheduled";

/**
 * Derive badge state from a row's `processor_raw_response` + tx status.
 *
 * Accepts either:
 *   - the legacy `_risonpay_meta` shape (for back-compat), OR
 *   - any `_<provider>_meta` block from META_KEY_FOR.
 *
 * The first one found wins; ordering is risonpay → shieldhub → matrix to
 * preserve existing behaviour for rows that only have the Risonpay key.
 */
export function deriveBadge(
  raw:
    | (Record<string, unknown> & {
        _risonpay_meta?: Partial<ProviderSettlementMeta>;
        _shieldhub_meta?: Partial<ProviderSettlementMeta>;
        _matrix_meta?: Partial<ProviderSettlementMeta>;
      })
    | null
    | undefined,
  txStatus: string | null | undefined,
  now: Date = new Date(),
): BadgeKind {
  const meta = pickMeta(raw);
  if (!meta || (!meta.settlement_status && !meta.expected_settlement_at)) {
    return txStatus === "completed" || txStatus === "processing" ? "delayed" : "missing";
  }
  if (meta.settlement_status === "settled") return "settled";
  const when = meta.expected_settlement_at ? new Date(meta.expected_settlement_at) : null;
  if (when && differenceInHours(now, when) > 6 && meta.settlement_status !== "settled") {
    return "delayed";
  }
  return "scheduled";
}

function pickMeta(
  raw: Record<string, unknown> | null | undefined,
): Partial<ProviderSettlementMeta> | undefined {
  if (!raw) return undefined;
  for (const provider of ["risonpay", "shieldhub", "matrix"] as SettlementProvider[]) {
    const block = raw[META_KEY_FOR[provider]] as Partial<ProviderSettlementMeta> | undefined;
    if (block && (block.settlement_status || block.expected_settlement_at)) return block;
  }
  // Empty-but-present block — treat as "meta exists, no useful fields".
  for (const provider of ["risonpay", "shieldhub", "matrix"] as SettlementProvider[]) {
    if (raw[META_KEY_FOR[provider]]) return raw[META_KEY_FOR[provider]] as Partial<ProviderSettlementMeta>;
  }
  return undefined;
}
