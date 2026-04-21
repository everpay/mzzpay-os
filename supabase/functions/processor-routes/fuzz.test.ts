// Fuzz tests for /processor-routes — verifies cross-merchant isolation under
// many JWT/x-api-key permutations: malformed JWTs, foreign API keys, swapped
// headers, junk header values, etc. NOT ONE response should leak rows whose
// merchant_id differs from the authenticated merchant's id.
import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL") ?? Deno.env.get("SUPABASE_URL")!;
const ANON = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!;
const FN_URL = `${SUPABASE_URL}/functions/v1/processor-routes`;

const rand = () => crypto.randomUUID();
const junk = [
  "", " ", "Bearer ", "Bearer null", "Bearer undefined",
  "Bearer " + "a".repeat(2000),
  "Basic Zm9vOmJhcg==",
  "Bearer " + rand(),
  "Bearer ../../etc/passwd",
  "Bearer <script>alert(1)</script>",
];

Deno.test("fuzz: 50 random invalid auth combos all return 401 with no body leakage", async () => {
  for (let i = 0; i < 50; i++) {
    const headers: Record<string, string> = { apikey: ANON };
    const pick = Math.floor(Math.random() * 4);
    if (pick === 0) headers["x-api-key"] = rand();
    else if (pick === 1) headers["Authorization"] = junk[Math.floor(Math.random() * junk.length)];
    else if (pick === 2) {
      headers["x-api-key"] = rand();
      headers["Authorization"] = junk[Math.floor(Math.random() * junk.length)];
    } // else: send only apikey

    const res = await fetch(FN_URL, { method: "GET", headers });
    const body = await res.json().catch(() => ({}));
    assertEquals(res.status, 401, `iter ${i} expected 401, got ${res.status}`);
    // The body must NEVER include routing data on an unauthorized response.
    assert(!("routing_rules" in body), `iter ${i} leaked routing_rules`);
    assert(!("fee_profiles" in body), `iter ${i} leaked fee_profiles`);
    assert(!("merchant_id" in body), `iter ${i} leaked merchant_id`);
  }
});

Deno.test("fuzz: header injection attempts do not bypass auth", async () => {
  const attempts: HeadersInit[] = [
    { apikey: ANON, "X-Api-Key": rand(), "x-api-key": rand() },
    { apikey: ANON, "x-api-key": "", Authorization: "" },
    { apikey: ANON, "x-api-key": "null" },
    { apikey: ANON, "x-api-key": "undefined" },
    { apikey: ANON, "x-api-key": "0" },
    { apikey: ANON, "x-api-key": "true" },
    { apikey: ANON, Authorization: "Bearer " },
  ];
  for (const headers of attempts) {
    const res = await fetch(FN_URL, { method: "GET", headers });
    await res.text();
    assertEquals(res.status, 401);
  }
});

// Cross-merchant leak test: only runs when both keys are provided.
// Asserts: merchant A's key NEVER returns merchant B's rows, and vice-versa.
Deno.test({
  name: "no cross-merchant leak between two valid api keys",
  ignore: !(Deno.env.get("TEST_MERCHANT_API_KEY_A") && Deno.env.get("TEST_MERCHANT_API_KEY_B")),
  async fn() {
    const keyA = Deno.env.get("TEST_MERCHANT_API_KEY_A")!;
    const keyB = Deno.env.get("TEST_MERCHANT_API_KEY_B")!;
    const fetchAs = async (k: string) => {
      const r = await fetch(FN_URL, { method: "GET", headers: { apikey: ANON, "x-api-key": k } });
      return await r.json();
    };
    const a = await fetchAs(keyA);
    const b = await fetchAs(keyB);
    assert(a.merchant_id !== b.merchant_id, "two test merchants must have different ids");
    for (const arr of [a.routing_rules, a.fee_profiles, a.acquirers]) {
      for (const row of arr) assertEquals(row.merchant_id, a.merchant_id);
    }
    for (const arr of [b.routing_rules, b.fee_profiles, b.acquirers]) {
      for (const row of arr) assertEquals(row.merchant_id, b.merchant_id);
    }
  },
});
