// Single source of truth for the `_risonpay_meta` contract written by the
// risonpay-webhook Edge Function and consumed by RisonpaySettlementBadge,
// TransactionDetailDrawer, and the RisonpayLedgerAudit page.
//
// The keys here MUST stay in lockstep with:
//   - supabase/functions/risonpay-webhook/index.ts (writer)
//   - src/components/RisonpaySettlementBadge.tsx   (reader)
//
// Locked by src/lib/settlement-meta.test.ts.

import { differenceInHours } from "date-fns";

export type SettlementStatus = "pending" | "scheduled" | "settled";
export type InternalTxStatus = "pending" | "processing" | "completed" | "failed" | "refunded";

export interface RisonpayMeta {
  mapped_status: InternalTxStatus;
  expected_settlement_at: string; // ISO-8601
  settlement_status: SettlementStatus;
  received_at: string; // ISO-8601
}

/** Card payments settle T+2 business days; APMs settle T+1. */
export function settlementDaysFor(paymentMethod?: string | null): 1 | 2 {
  return (paymentMethod || "").toLowerCase().includes("card") ? 2 : 1;
}

/** Compute the meta block that the webhook writes onto `processor_raw_response`. */
export function buildRisonpayMeta(args: {
  mappedStatus: InternalTxStatus;
  paymentMethod?: string | null;
  now?: Date;
}): RisonpayMeta {
  const now = args.now ?? new Date();
  const days = settlementDaysFor(args.paymentMethod);
  return {
    mapped_status: args.mappedStatus,
    expected_settlement_at: new Date(now.getTime() + days * 86_400_000).toISOString(),
    settlement_status: args.mappedStatus === "completed" ? "scheduled" : "pending",
    received_at: now.toISOString(),
  };
}

export type BadgeKind = "missing" | "settled" | "delayed" | "scheduled";

/** Derive badge state from a row's `processor_raw_response` + tx status. */
export function deriveBadge(
  raw: { _risonpay_meta?: Partial<RisonpayMeta> } | null | undefined,
  txStatus: string | null | undefined,
  now: Date = new Date(),
): BadgeKind {
  const meta = raw?._risonpay_meta;
  if (!meta) {
    return txStatus === "completed" || txStatus === "processing" ? "delayed" : "missing";
  }
  if (meta.settlement_status === "settled") return "settled";
  const when = meta.expected_settlement_at ? new Date(meta.expected_settlement_at) : null;
  if (when && differenceInHours(now, when) > 6 && meta.settlement_status !== "settled") {
    return "delayed";
  }
  return "scheduled";
}
