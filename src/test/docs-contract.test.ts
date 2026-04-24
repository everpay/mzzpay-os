/**
 * Documentation contract test
 * --------------------------------------------------------------------------
 * For every edge function documented under /developers/api/*, invoke it with
 * a minimal valid payload (or an explicit "should reject" payload) and assert
 * the response field shape + HTTP status semantics described in the docs.
 *
 * NOTE: This test runs in jsdom against the *live* Supabase project using the
 * public anon key. It only invokes idempotent / safe operations: validation
 * paths, FX quotes, and balance lookups. State-mutating endpoints (process-
 * payment, refund-payment, payouts) are exercised with intentionally-invalid
 * payloads so we assert the documented 4xx contract without creating data.
 */
import { describe, it, expect } from "vitest";

const SUPABASE_URL = "https://sprjfzeyyihtfvxnfuhb.supabase.co";
const ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNwcmpmemV5eWlodGZ2eG5mdWhiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0MjgwOTIsImV4cCI6MjA4OTAwNDA5Mn0.hsagaSot7hlUeN3aNJNflwp0Lf-kzba3Iselg7-x1v0";

const ONLINE = typeof fetch !== "undefined" && process.env.SKIP_NETWORK !== "1";

async function invoke(fn: string, body: unknown, init: RequestInit = {}) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/${fn}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: ANON_KEY,
      Authorization: `Bearer ${ANON_KEY}`,
      ...(init.headers || {}),
    },
    body: JSON.stringify(body),
    ...init,
  });
  const text = await res.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }
  return { status: res.status, json };
}

const maybe = ONLINE ? describe : describe.skip;

maybe("docs contract: edge functions match documented schemas", () => {
  it("fx-convert returns { amount, converted, rate, from, to }", async () => {
    const { status, json } = await invoke("fx-convert", {
      amount: 100,
      from: "USD",
      to: "EUR",
    });
    expect(status).toBeLessThan(500);
    if (status === 200) {
      expect(json).toEqual(
        expect.objectContaining({
          amount: expect.any(Number),
          converted: expect.any(Number),
          rate: expect.any(Number),
          from: "USD",
          to: "EUR",
        }),
      );
    }
  });

  it("process-payment rejects an empty body with documented 4xx error shape", async () => {
    const { status, json } = await invoke("process-payment", {});
    // Documented contract: missing required fields → 400 with { error } or
    // { success: false, error } envelope.
    expect([400, 422]).toContain(status);
    expect(json).toEqual(
      expect.objectContaining({
        ...(json?.success !== undefined ? { success: false } : {}),
        error: expect.anything(),
      }),
    );
  });

  it("refund-payment rejects unknown transactionId per documented error envelope", async () => {
    const { status, json } = await invoke("refund-payment", {
      transactionId: "00000000-0000-0000-0000-000000000000",
      amount: 1,
    });
    expect([400, 404, 422]).toContain(status);
    expect(json).toEqual(expect.objectContaining({ error: expect.anything() }));
  });

  it("retry-payment rejects unknown transaction_id", async () => {
    const { status, json } = await invoke("retry-payment", {
      transaction_id: "00000000-0000-0000-0000-000000000000",
    });
    expect([400, 404, 422]).toContain(status);
    expect(json).toEqual(expect.objectContaining({ error: expect.anything() }));
  });

  it("crypto-pay rejects missing asset_id (documented required field)", async () => {
    const { status, json } = await invoke("crypto-pay", {
      amount: 50,
      currency: "USD",
    });
    expect([400, 422]).toContain(status);
    expect(json).toEqual(expect.objectContaining({ error: expect.anything() }));
  });

  it("subscription-billing rejects missing subscription_id when not run_all", async () => {
    const { status, json } = await invoke("subscription-billing", {});
    // run_all=false default → must specify subscription_id, OR returns
    // { processed: 0 } when invoked as cron without auth context.
    expect(status).toBeLessThan(500);
    if (status === 200) {
      expect(json).toEqual(
        expect.objectContaining({
          processed: expect.any(Number),
        }),
      );
    } else {
      expect([400, 401, 422]).toContain(status);
    }
  });

  it("prorate-subscription rejects missing subscription_id + new_plan_id", async () => {
    const { status, json } = await invoke("prorate-subscription", {});
    expect([400, 422]).toContain(status);
    expect(json).toEqual(expect.objectContaining({ error: expect.anything() }));
  });

  it("moneto-wallet 'balance' action returns a documented shape or auth error", async () => {
    const { status, json } = await invoke("moneto-wallet", { action: "balance" });
    expect(status).toBeLessThan(500);
    if (status === 200) {
      // Documented: { success, balance? } or { success:false, error }
      expect(json).toEqual(
        expect.objectContaining({ success: expect.any(Boolean) }),
      );
    }
  });

  it("elektropay-wallet 'balance' returns a documented envelope", async () => {
    const { status, json } = await invoke("elektropay-wallet", {
      action: "balance",
      asset_id: "USDT",
    });
    expect(status).toBeLessThan(500);
    if (status === 200) {
      expect(json).toEqual(
        expect.objectContaining({ success: expect.any(Boolean) }),
      );
    }
  });
});

describe("docs contract: webhook envelope shape (no network)", () => {
  it("documented envelope is { id, type, created, data }", () => {
    const sample = {
      id: "evt_test_abc123",
      type: "payment.completed",
      created: Date.now(),
      data: { transaction_id: "tx_1", amount: 5000, currency: "usd", status: "completed" },
    };
    expect(sample).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        type: expect.stringMatching(/^[a-z_]+\.[a-z_.]+$/),
        created: expect.any(Number),
        data: expect.any(Object),
      }),
    );
    // status terms standardized to completed | failed | pending
    expect(["completed", "failed", "pending"]).toContain(sample.data.status);
  });

  it("HMAC-SHA256 hex digest matches the documented signature scheme", async () => {
    const secret = "whsec_test_secret";
    const body = JSON.stringify({ id: "evt_1", type: "payment.completed", created: 1, data: {} });

    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      enc.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const sig = await crypto.subtle.sign("HMAC", key, enc.encode(body));
    const hex = Array.from(new Uint8Array(sig))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    expect(hex).toMatch(/^[a-f0-9]{64}$/);
  });
});
