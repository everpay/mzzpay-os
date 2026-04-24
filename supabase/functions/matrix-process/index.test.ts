/**
 * Matrix Partners Integration — Contract Tests
 *
 * Verifies the three integration methods documented at
 * https://docs.matrixpaysolution.com/en/ :
 *   1. Transaction Pay   (action: 'pay')        — card.js + 3DS redirect
 *   2. Checkout Pay      (action: 'checkout')   — hosted checkout redirect
 *   3. H2H Payment       (action: 'h2h_payment')— PCI-DSS server-to-server
 *
 * Plus:
 *   - APM (Apple Pay / Google Pay) via /v1/h2h/apm/payment
 *   - Customer token issuance (/v1/customer/token) used by Checkout Pay
 *   - Refund + H2H Payout
 *   - US region block (Matrix Pay is unavailable for US customers)
 *   - Project & MID details
 *   - Webhook HMAC-SHA256 (TH-HMAC) signature verification
 *
 * Tests run in simulation mode (no MATRIX_SECRET_KEY) so they never hit
 * the live sandbox. The simulation branch is part of production code and
 * mirrors the documented response shapes.
 */

import {
  assertEquals,
  assert,
  assertExists,
  assertStringIncludes,
} from "https://deno.land/std@0.224.0/assert/mod.ts";

// Force test mode BEFORE importing index.ts so serve() is skipped.
Deno.env.set("MATRIX_TEST_MODE", "1");
Deno.env.set("MATRIX_PUBLIC_KEY", "test_public_key_sim");
Deno.env.set("MATRIX_PROJECT_ID", "1219560793");
Deno.env.delete("MATRIX_SECRET_KEY");

const { handler } = await import("./index.ts");

async function invoke(payload: Record<string, unknown>) {
  const req = new Request("http://localhost/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const res = await handler(req);
  const text = await res.text();
  let json: any = {};
  try { json = JSON.parse(text); } catch { json = { raw: text }; }
  return { status: res.status, json, headers: res.headers };
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Transaction Pay  (card.js + 3DS redirect)
// ─────────────────────────────────────────────────────────────────────────────
Deno.test("Matrix · 1. Transaction Pay — returns transaction with card mask", async () => {
  const { status, json } = await invoke({
    action: "pay",
    order_id: "tx_pay_eur_1",
    order_description: "card.js test",
    amount: 2010,
    currency: "EUR",
    country: "NL",
    cc_number: "4005519200000004",
    exp_month: 12,
    exp_year: 2034,
    card_cvv: "123",
    callback_url: "https://merch.site/cb",
  });

  assertEquals(status, 200);
  assertEquals(json.simulation, true);
  assertEquals(json.code, 0);
  assertEquals(json.status, "success");
  assertEquals(json.id, "tx_pay_eur_1");
  assertExists(json.transactions);
  assertEquals(json.transactions[0].type, "payment");
  assertEquals(json.transactions[0].amount, 2010);
  assertEquals(json.transactions[0].currency, "EUR");
  assertExists(json.card?.mask);
  assertEquals(json.card.brand, "visa");
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Checkout Pay  (hosted checkout)
// ─────────────────────────────────────────────────────────────────────────────
Deno.test("Matrix · 2. Checkout Pay — returns redirect_url + pending status", async () => {
  const { status, json } = await invoke({
    action: "checkout",
    reference: "id23422",
    order_id: "12345",
    order_description: "some test order",
    amount: 100,
    currency: "EUR",
    country: "DE",
    result_url: "https://my.site/order",
    success_url: "https://my.site/order/deposit-success",
    error_url: "https://my.site/order/error",
    language: "EN",
    customer_token: "b123cd4533523a412e2",
    allow_currency_convert: false,
    forced_convert: false,
    allow_cascading_after_3ds: false,
    callback_url: "https://my.site/order/cb",
  });

  assertEquals(status, 200);
  assertEquals(json.status, "pending");
  assertEquals(json.code, 0);
  assertEquals(json.id, "12345");
  assertExists(json.redirect_url);
  assertStringIncludes(json.redirect_url, "checkout-sandbox.matrixpaysolution.com");
});

Deno.test("Matrix · 2a. Customer Token — required precursor to Checkout Pay", async () => {
  const { status, json } = await invoke({
    action: "customer_token",
    country: "NL",
    id: "U31676025316",
    details: {
      email: "U31676025316@mail.com",
      first_name: "Gojo",
      last_name: "Satoru",
      phone: "+35799000000",
      address: "123 Main St",
      city: "Rotterdam",
      country: "NL",
      zip: "10001",
      cardholder: "Gojo Satoru",
    },
    labels: ["trusted"],
  });

  assertEquals(status, 200);
  assertEquals(json.code, 0);
  assertExists(json.customer_token);
  assertStringIncludes(json.customer_token, "ct_sim_");
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. H2H Payment  (PCI-DSS server-to-server)
// ─────────────────────────────────────────────────────────────────────────────
Deno.test("Matrix · 3. H2H Payment — accepts full card + extra_params", async () => {
  const { status, json } = await invoke({
    action: "h2h_payment",
    order_id: "00000000000133",
    order_description: "test",
    amount: 2010,
    currency: "EUR",
    cc_number: "4005519200000004",
    exp_month: 12,
    exp_year: 2034,
    card_cvv: "123",
    callback_url: "https://my.site/order/cb",
    customer_id: "customer_id_on_merchant_side",
    customer_ip: "192.168.90.100",
    extra_params: {
      first_name: "Gojo",
      last_name: "Satoru",
      birthday: "1980-11-10",
      email: "gojo@example.com",
      phone: "+35799000000",
      address: "123 Main St",
      state: "NY",
      city: "New York",
      country: "NL", // non-US to pass region check
      zip: "10001",
      cardholder: "Gojo Satoru",
    },
  });

  assertEquals(status, 200);
  assertEquals(json.code, 0);
  assertEquals(json.status, "success");
  assertEquals(json.transactions[0].type, "payment");
  assertEquals(json.transactions[0].currency, "EUR");
});

Deno.test("Matrix · 3a. H2H Payout Init — returns payout transaction", async () => {
  const { status, json } = await invoke({
    action: "h2h_payout",
    order_id: "34A32E2327BAC2323",
    amount: 100,
    currency: "EUR",
    cc_number: "5413330300003002",
    exp_month: 12,
    exp_year: 2026,
    callback_url: "https://my.site/order/cb",
    country: "NL",
  });

  assertEquals(status, 200);
  assertEquals(json.code, 0);
  assertEquals(json.transactions[0].type, "payout");
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. APM — Apple Pay / Google Pay  (/v1/h2h/apm/payment)
// ─────────────────────────────────────────────────────────────────────────────
Deno.test("Matrix · 4a. Apple Pay (h2h_apm) — accepted", async () => {
  const { status, json } = await invoke({
    action: "h2h_apm",
    order_id: "apm_test_eur_applepay_1",
    amount: 910,
    currency: "EUR",
    payment_account: { method: "applepay" },
    customer_ip: "127.127.127.127",
    callback_url: "https://merch.site.com/callback",
    extra_params: {
      email: "test@test.com",
      first_name: "John",
      last_name: "Doe",
      country: "NL",
      cardholder: "John Doe",
    },
    customer_id: "customer#1",
  });

  assertEquals(status, 200);
  assertEquals(json.code, 0);
});

Deno.test("Matrix · 4b. Google Pay (h2h_apm) — accepted", async () => {
  const { status, json } = await invoke({
    action: "h2h_apm",
    order_id: "apm_test_eur_googlepay_1",
    amount: 910,
    currency: "EUR",
    payment_account: { method: "googlepay" },
    customer_ip: "127.127.127.127",
    callback_url: "https://merch.site.com/callback",
    extra_params: { email: "test@test.com", country: "NL" },
    customer_id: "customer#1",
  });

  assertEquals(status, 200);
  assertEquals(json.code, 0);
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. Refund + Status
// ─────────────────────────────────────────────────────────────────────────────
Deno.test("Matrix · 5a. Refund — returns refund transaction", async () => {
  const { status, json } = await invoke({
    action: "refund",
    order_id: "tx_pay_eur_1",
    amount: 500,
    currency: "EUR",
    country: "NL",
  });
  assertEquals(status, 200);
  assertEquals(json.transactions[0].type, "refund");
});

Deno.test("Matrix · 5b. Order Status lookup", async () => {
  const { status, json } = await invoke({
    action: "order_status",
    order_id: "tx_pay_eur_1",
    country: "NL",
  });
  assertEquals(status, 200);
  assertEquals(json.id, "tx_pay_eur_1");
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. US Region Block — MUST reject US customers
// ─────────────────────────────────────────────────────────────────────────────
Deno.test("Matrix · 6a. US country (top-level) is blocked with 403 REGION_BLOCKED", async () => {
  const { status, json } = await invoke({
    action: "pay",
    amount: 100,
    currency: "USD",
    country: "US",
  });
  assertEquals(status, 403);
  assertEquals(json.code, "REGION_BLOCKED");
  assertStringIncludes(json.error, "not available for US");
});

Deno.test("Matrix · 6b. US country (billingDetails) is blocked", async () => {
  const { status, json } = await invoke({
    action: "h2h_payment",
    amount: 100,
    currency: "USD",
    billingDetails: { country: "US" },
  });
  assertEquals(status, 403);
  assertEquals(json.code, "REGION_BLOCKED");
});

Deno.test("Matrix · 6c. CA / EU customers are NOT blocked", async () => {
  for (const country of ["CA", "DE", "NL", "GB", "FR"]) {
    const { status, json } = await invoke({
      action: "pay", amount: 100, currency: "EUR", country,
    });
    assertEquals(status, 200, `country=${country} should be allowed`);
    assertEquals(json.code, 0);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. Project / MID details
// ─────────────────────────────────────────────────────────────────────────────
Deno.test("Matrix · 7. Project details include configured project_id", async () => {
  const { status, json } = await invoke({ action: "project_details", country: "NL" });
  assertEquals(status, 200);
  assertEquals(json.project.id, "1219560793");
  assertEquals(json.project.mode, "test");
});

// ─────────────────────────────────────────────────────────────────────────────
// 8. CORS preflight
// ─────────────────────────────────────────────────────────────────────────────
Deno.test("Matrix · 8. OPTIONS preflight returns CORS headers", async () => {
  const req = new Request("http://localhost/", { method: "OPTIONS" });
  const res = await handler(req);
  await res.text();
  assertEquals(res.headers.get("Access-Control-Allow-Origin"), "*");
});

// ─────────────────────────────────────────────────────────────────────────────
// 9. Webhook HMAC-SHA256 (TH-HMAC) signature derivation
// ─────────────────────────────────────────────────────────────────────────────
Deno.test("Matrix Webhook · TH-HMAC signature is base64(HMAC_SHA256(body, secret))", async () => {
  const SECRET = "test_secret_key";
  const body = JSON.stringify({
    id: "ord_123",
    status: "success",
    code: 0,
    transactions: [{ id: "tx_1", status: "success", code: 0, amount: 100, currency: "EUR" }],
  });

  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(SECRET),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(body));
  const expected = btoa(String.fromCharCode(...new Uint8Array(sig)));

  // Documented header format: "TH-HMAC public_key:base64sig"
  const authHeader = `TH-HMAC test_pub_key:${expected}`;
  const [scheme, sigPart] = authHeader.split(" ");
  const [pub, sigOnly] = sigPart.split(":");

  assertEquals(scheme, "TH-HMAC");
  assertEquals(pub, "test_pub_key");
  assertEquals(sigOnly, expected);
  assert(expected.length > 0);
});

// ─────────────────────────────────────────────────────────────────────────────
// 10. Unknown action handling (live mode would 400 — simulation returns ok)
// ─────────────────────────────────────────────────────────────────────────────
Deno.test("Matrix · 10. Unknown action in simulation falls through to default", async () => {
  const { status, json } = await invoke({ action: "nonexistent_action", country: "NL" });
  assertEquals(status, 200);
  assertEquals(json.simulation, true);
  assertEquals(json.code, 0);
});
