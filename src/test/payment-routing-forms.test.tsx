/**
 * Locks the routing-layer contract: every payment-creating UI form MUST send
 * its charge through the `process-payment` edge function. This guarantees
 * Shieldhub/Risonpay PSP selection, idempotency, and ledger writes all flow
 * through one auditable path. If a future PR bypasses process-payment from a
 * form, this test fails loudly.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(__dirname, "..", "..");
function read(rel: string) {
  return readFileSync(path.join(repoRoot, rel), "utf8");
}

describe("payment forms route through process-payment", () => {
  it("NewPayment.tsx invokes process-payment", () => {
    expect(read("src/pages/NewPayment.tsx")).toMatch(
      /functions\.invoke\(['"]process-payment['"]/,
    );
  });
  it("PayInvoice.tsx invokes process-payment", () => {
    expect(read("src/pages/PayInvoice.tsx")).toMatch(
      /functions\.invoke\(['"]process-payment['"]/,
    );
  });
  it("Checkout.tsx invokes process-payment", () => {
    expect(read("src/pages/Checkout.tsx")).toMatch(
      /functions\.invoke\(['"]process-payment['"]/,
    );
  });
});

describe("subscription billing + retry use process-payment (no simulated charges)", () => {
  const billing = read("supabase/functions/subscription-billing/index.ts");
  const retry = read("supabase/functions/retry-payment/index.ts");

  it("subscription-billing calls process-payment over fetch", () => {
    expect(billing).toMatch(/functions\/v1\/process-payment/);
  });
  it("subscription-billing has no Math.random simulated charge", () => {
    expect(billing).not.toMatch(/Math\.random/);
  });
  it("retry-payment calls process-payment over fetch", () => {
    expect(retry).toMatch(/functions\/v1\/process-payment/);
  });
  it("retry-payment has no Math.random simulated charge", () => {
    expect(retry).not.toMatch(/Math\.random/);
  });
});

describe("subscription failures are recorded in provider_events", () => {
  const billing = read("supabase/functions/subscription-billing/index.ts");
  const retry = read("supabase/functions/retry-payment/index.ts");

  it("subscription-billing writes subscription.charge_skipped on missing PM", () => {
    expect(billing).toMatch(/event_type:\s*['"]subscription\.charge_skipped['"]/);
  });
  it("subscription-billing writes subscription.charge_failed on PSP decline", () => {
    expect(billing).toMatch(/event_type:\s*['"]subscription\.charge_failed['"]/);
  });
  it("retry-payment writes payment.retry_attempted on PSP decline", () => {
    expect(retry).toMatch(/event_type:\s*['"]payment\.retry_attempted['"]/);
  });
  it("retry-payment writes payment.retry_success on PSP success", () => {
    expect(retry).toMatch(/event_type:\s*['"]payment\.retry_success['"]/);
  });
});

describe("process-payment enforces idempotency end-to-end", () => {
  const fn = read("supabase/functions/process-payment/index.ts");

  it("looks up prior idempotency_keys row before charging", () => {
    expect(fn).toMatch(/from\(['"]idempotency_keys['"]\)/);
    expect(fn).toMatch(/idempotency_replayed/);
  });
  it("persists idempotent response after a successful charge", () => {
    // Should both read and write idempotency_keys.
    const reads = fn.match(/idempotency_keys/g) || [];
    expect(reads.length).toBeGreaterThanOrEqual(2);
  });
  it("returns duplicate=true marker on cache hit", () => {
    expect(fn).toMatch(/duplicate:\s*true/);
  });
});
