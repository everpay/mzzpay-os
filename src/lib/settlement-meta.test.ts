// Locks the contract between the risonpay-webhook Edge Function and the
// RisonpaySettlementBadge UI. If either side renames a key or changes the
// settlement-day math, this test fails.

import { describe, it, expect } from "vitest";
import {
  buildRisonpayMeta,
  deriveBadge,
  settlementDaysFor,
  type RisonpayMeta,
} from "./settlement-meta";

const NOW = new Date("2026-04-27T12:00:00Z");

describe("settlement-meta contract", () => {
  it("writes the exact keys the UI reads", () => {
    const meta = buildRisonpayMeta({ mappedStatus: "completed", paymentMethod: "card", now: NOW });
    // Must contain — and only contain — the four contract keys.
    expect(Object.keys(meta).sort()).toEqual([
      "expected_settlement_at",
      "mapped_status",
      "received_at",
      "settlement_status",
    ]);
  });

  it("Risonpay card payments settle T+4, APMs T+1", () => {
    expect(settlementDaysFor("card")).toBe(4);
    expect(settlementDaysFor("CARD_VISA")).toBe(4);
    expect(settlementDaysFor("open_banking")).toBe(1);
    expect(settlementDaysFor(null)).toBe(1);
    expect(settlementDaysFor(undefined)).toBe(1);
  });

  it("expected_settlement_at = received_at + settlementDays", () => {
    const cardMeta = buildRisonpayMeta({ mappedStatus: "completed", paymentMethod: "card", now: NOW });
    const apmMeta = buildRisonpayMeta({ mappedStatus: "completed", paymentMethod: "sepa", now: NOW });
    expect(new Date(cardMeta.expected_settlement_at).getTime() - NOW.getTime()).toBe(4 * 86_400_000);
    expect(new Date(apmMeta.expected_settlement_at).getTime() - NOW.getTime()).toBe(1 * 86_400_000);
  });

  it("non-completed statuses produce settlement_status='pending'", () => {
    const m = buildRisonpayMeta({ mappedStatus: "processing", paymentMethod: "card", now: NOW });
    expect(m.settlement_status).toBe("pending");
  });

  it("completed status produces settlement_status='scheduled'", () => {
    const m = buildRisonpayMeta({ mappedStatus: "completed", paymentMethod: "card", now: NOW });
    expect(m.settlement_status).toBe("scheduled");
  });
});

describe("deriveBadge — UI mirrors webhook output", () => {
  it("returns 'missing' when no meta and tx not in flight", () => {
    expect(deriveBadge(null, "pending", NOW)).toBe("missing");
    expect(deriveBadge({}, "failed", NOW)).toBe("missing");
  });

  it("returns 'delayed' when meta missing but tx is completed/processing", () => {
    expect(deriveBadge(null, "completed", NOW)).toBe("delayed");
    expect(deriveBadge(null, "processing", NOW)).toBe("delayed");
  });

  it("returns 'settled' when settlement_status='settled'", () => {
    const meta: RisonpayMeta = {
      mapped_status: "completed",
      settlement_status: "settled",
      expected_settlement_at: new Date(NOW.getTime() - 24 * 3600_000).toISOString(),
      received_at: new Date(NOW.getTime() - 48 * 3600_000).toISOString(),
    };
    expect(deriveBadge({ _risonpay_meta: meta }, "completed", NOW)).toBe("settled");
  });

  it("returns 'scheduled' for a fresh, in-window settlement", () => {
    const meta = buildRisonpayMeta({ mappedStatus: "completed", paymentMethod: "card", now: NOW });
    expect(deriveBadge({ _risonpay_meta: meta }, "completed", NOW)).toBe("scheduled");
  });

  it("returns 'delayed' when expected_settlement_at is >6h in the past and not settled", () => {
    const past = new Date(NOW.getTime() - 7 * 3600_000).toISOString();
    const meta: RisonpayMeta = {
      mapped_status: "completed",
      settlement_status: "scheduled",
      expected_settlement_at: past,
      received_at: past,
    };
    expect(deriveBadge({ _risonpay_meta: meta }, "completed", NOW)).toBe("delayed");
  });

  it("end-to-end: webhook writes meta → UI derives the matching badge", () => {
    // Simulate webhook execution at `received` time.
    const received = new Date("2026-04-25T10:00:00Z");
    const meta = buildRisonpayMeta({ mappedStatus: "completed", paymentMethod: "card", now: received });

    // T+0 hours → scheduled
    expect(deriveBadge({ _risonpay_meta: meta }, "completed", received)).toBe("scheduled");
    // T+4d (exactly window) → still scheduled
    expect(deriveBadge({ _risonpay_meta: meta }, "completed", new Date(received.getTime() + 4 * 86400_000))).toBe("scheduled");
    // T+4d + 7h → delayed
    expect(deriveBadge({ _risonpay_meta: meta }, "completed", new Date(received.getTime() + 4 * 86400_000 + 7 * 3600_000))).toBe("delayed");
  });
});
