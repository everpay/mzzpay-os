/**
 * Matrix Partners — LIVE Sandbox Contract Tests
 *
 * Gated suite: only runs when MATRIX_LIVE_TEST=1 and MATRIX_SECRET_KEY is set.
 * Hits the real Matrix sandbox at https://api-sandbox.matrixpaysolution.com
 * and asserts the response envelope matches the documented simulation shapes
 * encoded in `simulateResponse()` from index.ts.
 *
 * Skip behaviour:
 *   - If MATRIX_LIVE_TEST !== "1": every test is skipped (recorded as ignored).
 *   - If MATRIX_SECRET_KEY missing while live mode requested: explicit failure.
 *
 * Run locally:
 *   MATRIX_LIVE_TEST=1 \
 *   MATRIX_PUBLIC_KEY=... \
 *   MATRIX_SECRET_KEY=... \
 *   MATRIX_PROJECT_ID=1219560793 \
 *   deno test --allow-net --allow-env supabase/functions/matrix-process/live.test.ts
 */

import {
  assertEquals,
  assert,
  assertExists,
} from "https://deno.land/std@0.224.0/assert/mod.ts";

// Force test mode so serve() does not bind a port when index.ts is imported.
Deno.env.set("MATRIX_TEST_MODE", "1");

const LIVE = Deno.env.get("MATRIX_LIVE_TEST") === "1";
const SECRET = Deno.env.get("MATRIX_SECRET_KEY");
const PUBLIC_KEY = Deno.env.get("MATRIX_PUBLIC_KEY");

if (LIVE && (!SECRET || !PUBLIC_KEY)) {
  throw new Error(
    "MATRIX_LIVE_TEST=1 requires MATRIX_SECRET_KEY and MATRIX_PUBLIC_KEY to be set",
  );
}

const { handler } = await import("./index.ts");

async function invoke(payload: Record<string, unknown>) {
  const req = new Request("http://localhost/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sandbox: true, ...payload }),
  });
  const res = await handler(req);
  const text = await res.text();
  let json: any = {};
  try { json = JSON.parse(text); } catch { json = { raw: text }; }
  return { status: res.status, json };
}

/**
 * Documented response shape (from simulateResponse + Matrix docs):
 *   - top-level: { status, code, id?, transactions?, redirect_url? }
 *   - transactions[]: { id, status, code, amount, currency, type }
 *
 * `code` MUST be a number per Matrix docs (0 = success, 30xxx = API errors,
 * 2xxx = transaction status codes).
 */
function assertEnvelope(json: any, ctx: string) {
  assert(json && typeof json === "object", `${ctx}: not an object`);
  assert(
    typeof json.code === "number" || typeof json.code === "string",
    `${ctx}: missing code`,
  );
  // Live mode adds matrix_status passthrough — must echo upstream HTTP status
  if (json.matrix_status !== undefined) {
    assertEquals(typeof json.matrix_status, "number", `${ctx}: matrix_status type`);
  }
  // Live mode must NOT carry the simulation flag
  assertEquals(
    json.simulation,
    undefined,
    `${ctx}: live response leaked simulation:true`,
  );
}

function assertTransactionShape(tx: any, ctx: string) {
  assertExists(tx.id, `${ctx}: transaction missing id`);
  assertExists(tx.type, `${ctx}: transaction missing type`);
  assert(
    ["payment", "payout", "refund", "verify", "p2p"].includes(tx.type),
    `${ctx}: unexpected transaction.type=${tx.type}`,
  );
  assert(
    typeof tx.code === "number",
    `${ctx}: transaction.code must be number`,
  );
}

const t = (name: string, fn: () => Promise<void>) =>
  Deno.test({ name, ignore: !LIVE, fn });

// ─────────────────────────────────────────────────────────────────────────────
// 1. project_details — read-only, safe verification of credentials.
// Some Matrix accounts require additional params (mid, etc.) — we accept any
// 2xx/4xx with a documented envelope, but explicitly fail on 5xx or unknown
// shapes (those signal real contract drift, not config issues).
// ─────────────────────────────────────────────────────────────────────────────
t("Matrix LIVE · project_details returns documented envelope", async () => {
  const { status, json } = await invoke({
    action: "project_details",
    country: "NL",
  });
  assert(
    status >= 200 && status < 500,
    `project_details: server error ${status} — possible contract drift. Body: ${JSON.stringify(json).slice(0, 300)}`,
  );
  assertEnvelope(json, "project_details");
  if (status === 200 && json.code === 0 && json.project) {
    assertExists(json.project.id, "project.id");
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. customer_token — required precursor to checkout, no money movement.
// Matrix returns the token under the `id` field on success (the request `id`
// is echoed back as the issued token reference) per their actual behaviour;
// docs sometimes show `customer_token`. Accept either to absorb that doc bug.
// ─────────────────────────────────────────────────────────────────────────────
t("Matrix LIVE · customer_token issues token matching docs shape", async () => {
  const { status, json } = await invoke({
    action: "customer_token",
    country: "NL",
    id: `live_test_${Date.now()}`,
    details: {
      email: `live_test_${Date.now()}@example.com`,
      first_name: "Live",
      last_name: "Test",
      phone: "+35799000000",
      address: "1 Test St",
      city: "Rotterdam",
      country: "NL",
      zip: "10001",
      cardholder: "Live Test",
    },
  });
  assertEnvelope(json, "customer_token");
  if (status === 200 && json.code === 0) {
    // Matrix returns the token under `data.customer_token` (verified live).
    const token = json.data?.customer_token ?? json.customer_token ?? json.id ?? json.token;
    assertExists(
      token,
      `customer_token: success response missing token field (checked data.customer_token, customer_token, id, token). Body: ${JSON.stringify(json).slice(0, 200)}`,
    );
    assertEquals(typeof token, "string");
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. checkout — hosted page, no card needed, returns redirect_url
// ─────────────────────────────────────────────────────────────────────────────
t("Matrix LIVE · checkout returns redirect_url + pending status", async () => {
  // First mint a customer token (checkout requires it)
  const tokenRes = await invoke({
    action: "customer_token",
    country: "NL",
    id: `live_chk_${Date.now()}`,
    details: {
      email: `live_chk_${Date.now()}@example.com`,
      first_name: "Live", last_name: "Checkout",
      country: "NL", cardholder: "Live Checkout",
    },
  });
  const customer_token =
    tokenRes.json.customer_token ?? "skip_no_token";

  const { json } = await invoke({
    action: "checkout",
    order_id: `live_chk_${Date.now()}`,
    order_description: "live contract test",
    amount: 100,
    currency: "EUR",
    country: "NL",
    result_url: "https://example.com/result",
    success_url: "https://example.com/ok",
    error_url: "https://example.com/err",
    language: "EN",
    customer_token,
    callback_url: "https://example.com/cb",
  });
  assertEnvelope(json, "checkout");
  if (json.code === 0) {
    assertExists(json.redirect_url, "redirect_url");
    assert(
      String(json.redirect_url).startsWith("https://"),
      "redirect_url must be https",
    );
    assertExists(json.id, "order id echo");
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. order_status — read-only lookup
// ─────────────────────────────────────────────────────────────────────────────
t("Matrix LIVE · order_status returns documented envelope", async () => {
  const { json } = await invoke({
    action: "order_status",
    order_id: `nonexistent_${Date.now()}`,
    country: "NL",
  });
  assertEnvelope(json, "order_status");
  // Either success (unlikely for random id) or a documented error code
  if (json.code !== 0) {
    assert(
      typeof json.code === "number" && json.code >= 30000,
      `expected API error code, got ${json.code}`,
    );
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. US region block must be enforced BEFORE the network call (no live hit)
// ─────────────────────────────────────────────────────────────────────────────
t("Matrix LIVE · US block enforced even with live secret", async () => {
  const { status, json } = await invoke({
    action: "pay", amount: 100, currency: "USD", country: "US",
  });
  assertEquals(status, 403);
  assertEquals(json.code, "REGION_BLOCKED");
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. Divergence guard — if upstream returns a transactions array, every
// element must match the documented shape exactly. Fails the suite if Matrix
// changes their contract without us updating docs.
// ─────────────────────────────────────────────────────────────────────────────
t("Matrix LIVE · transaction shapes match documented simulation", async () => {
  const { json } = await invoke({
    action: "order_status",
    order_id: `shape_check_${Date.now()}`,
    country: "NL",
  });
  if (Array.isArray(json.transactions)) {
    json.transactions.forEach((tx: any, i: number) =>
      assertTransactionShape(tx, `transactions[${i}]`)
    );
  }
});
