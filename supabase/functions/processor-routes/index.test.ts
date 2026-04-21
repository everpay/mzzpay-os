// Tests for /processor-routes — verify JWT and x-api-key auth paths return
// merchant-scoped routing_rules and processor_fee_profiles only.
import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL") ?? Deno.env.get("SUPABASE_URL")!;
const ANON = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!;
const FN_URL = `${SUPABASE_URL}/functions/v1/processor-routes`;

Deno.test("rejects unauthenticated requests with 401", async () => {
  const res = await fetch(FN_URL, {
    method: "GET",
    headers: { apikey: ANON },
  });
  const body = await res.json();
  assertEquals(res.status, 401);
  assertEquals(body.error, "Unauthorized");
});

Deno.test("rejects non-GET methods with 405", async () => {
  const res = await fetch(FN_URL, {
    method: "POST",
    headers: { apikey: ANON, "Content-Type": "application/json" },
    body: "{}",
  });
  await res.text();
  assertEquals(res.status, 405);
});

Deno.test("CORS preflight returns ok", async () => {
  const res = await fetch(FN_URL, { method: "OPTIONS", headers: { apikey: ANON } });
  await res.text();
  assertEquals(res.status, 200);
  assert(res.headers.get("access-control-allow-origin"));
});

Deno.test("invalid x-api-key is treated as unauthorized", async () => {
  const res = await fetch(FN_URL, {
    method: "GET",
    headers: { apikey: ANON, "x-api-key": "definitely-not-a-real-key-" + crypto.randomUUID() },
  });
  const body = await res.json();
  assertEquals(res.status, 401);
  assertEquals(body.error, "Unauthorized");
});

Deno.test("invalid Bearer JWT is treated as unauthorized", async () => {
  const res = await fetch(FN_URL, {
    method: "GET",
    headers: { apikey: ANON, Authorization: "Bearer not.a.jwt" },
  });
  const body = await res.json();
  assertEquals(res.status, 401);
  assertEquals(body.error, "Unauthorized");
});

// Shape contract: when a real merchant key is provided via env, the response
// must contain merchant_id + scoped arrays. Skipped automatically if the
// optional TEST_MERCHANT_API_KEY is not set.
Deno.test({
  name: "valid x-api-key returns merchant-scoped payload",
  ignore: !Deno.env.get("TEST_MERCHANT_API_KEY"),
  async fn() {
    const apiKey = Deno.env.get("TEST_MERCHANT_API_KEY")!;
    const res = await fetch(FN_URL, {
      method: "GET",
      headers: { apikey: ANON, "x-api-key": apiKey },
    });
    const body = await res.json();
    assertEquals(res.status, 200);
    assert(typeof body.merchant_id === "string");
    assert(Array.isArray(body.routing_rules));
    assert(Array.isArray(body.fee_profiles));
    assert(Array.isArray(body.acquirers));
    // Every returned row must belong to the same merchant.
    for (const r of body.routing_rules) assertEquals(r.merchant_id, body.merchant_id);
    for (const f of body.fee_profiles) assertEquals(f.merchant_id, body.merchant_id);
    for (const m of body.acquirers) assertEquals(m.merchant_id, body.merchant_id);
  },
});
