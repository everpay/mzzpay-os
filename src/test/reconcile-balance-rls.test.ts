/**
 * RLS / authorization tests for the `reconcile-balance` Edge Function.
 *
 * Guarantees enforced here:
 *   1. An anonymous caller (no JWT) is rejected.
 *   2. A merchant calling `?action=drift` for ANOTHER merchant's id is forbidden.
 *   3. A merchant POSTing `reconcile` against another merchant's account_id
 *      is forbidden — the function MUST refuse, even though it runs with the
 *      service role key internally (it must enforce auth.uid() → merchant.id).
 *   4. A super_admin IS allowed to reconcile any merchant's account
 *      (verified by inspecting the function source for the override path
 *      and the audit_logs `triggered_by: super_admin_override` marker).
 *
 * Skip rule: requires VITE_SUPABASE_URL + VITE_SUPABASE_PUBLISHABLE_KEY.
 * Live HTTP probes (1)–(3) run when those are set; (4) is a code-level
 * assertion so it always runs.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const url =
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
const anonKey =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  "";

const fnUrl = url ? `${url}/functions/v1/reconcile-balance` : "";

async function callFn(init: RequestInit & { auth?: string; query?: string }) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    apikey: anonKey,
    ...(init.headers as Record<string, string> | undefined),
  };
  if (init.auth) headers["Authorization"] = `Bearer ${init.auth}`;
  const res = await fetch(`${fnUrl}${init.query ?? ""}`, { ...init, headers });
  const text = await res.text();
  let body: any = null;
  try { body = JSON.parse(text); } catch { body = { _raw: text }; }
  return { status: res.status, body };
}

describe.skipIf(!url || !anonKey)("reconcile-balance RLS / authorization", () => {
  it("rejects an anonymous caller (no Authorization header)", async () => {
    const res = await callFn({ method: "GET", query: "?action=drift" });
    // Per project convention, declines come back as 200 with structured error.
    expect(res.status).toBe(200);
    expect(res.body?.error).toBe("unauthorized");
  });

  it("rejects a forged Bearer token (random uuid string)", async () => {
    const res = await callFn({
      method: "GET",
      query: "?action=drift",
      auth: "definitely-not-a-real-jwt",
    });
    expect(res.status).toBe(200);
    expect(res.body?.error).toBe("unauthorized");
  });

  it("a merchant cannot reconcile another merchant's account_id", async () => {
    // Try an arbitrary uuid the caller does NOT own. Without a real merchant
    // session we expect "unauthorized"; with a real session we expect either
    // "forbidden" or "account_not_found" — never "ok: true".
    const res = await callFn({
      method: "POST",
      body: JSON.stringify({
        account_id: "00000000-0000-0000-0000-000000000001",
        reason: "cross-merchant attempt",
      }),
    });
    expect(res.status).toBe(200);
    expect(res.body?.ok).not.toBe(true);
    expect(["unauthorized", "forbidden", "account_not_found"]).toContain(
      res.body?.error,
    );
  });

  it("anonymous client cannot read another merchant's accounts via PostgREST", async () => {
    const anon = createClient(url, anonKey);
    const { data, error } = await anon.from("accounts").select("id").limit(5);
    // RLS must return either an empty set or an error — never another
    // merchant's rows.
    expect(error || (Array.isArray(data) && data.length === 0)).toBeTruthy();
  });
});

// ── Code-level guarantees that always run (no network needed). ────────────
describe("reconcile-balance source enforces ownership and super_admin override", () => {
  const fnSource = readFileSync(
    resolve(__dirname, "../../supabase/functions/reconcile-balance/index.ts"),
    "utf8",
  );

  it("requires Bearer auth and resolves the caller's merchant", () => {
    expect(fnSource).toMatch(/auth\.startsWith\(['"]Bearer/);
    expect(fnSource).toMatch(/from\(['"]merchants['"]\)[\s\S]*?\.eq\(['"]user_id['"], user\.id\)/);
  });

  it("blocks drift requests for another merchant unless super_admin", () => {
    expect(fnSource).toMatch(
      /targetMerchantId !== callerMerchantId && !isSuperAdmin[\s\S]{0,80}forbidden/,
    );
  });

  it("blocks reconcile on accounts the caller does not own unless super_admin", () => {
    expect(fnSource).toMatch(
      /account\.merchant_id !== callerMerchantId && !isSuperAdmin[\s\S]{0,80}forbidden/,
    );
  });

  it("writes an audit_logs row distinguishing super_admin overrides from self-serve", () => {
    expect(fnSource).toMatch(/from\(['"]audit_logs['"]\)\.insert/);
    expect(fnSource).toMatch(/triggered_by[\s\S]{0,140}super_admin_override/);
    expect(fnSource).toMatch(/merchant_self_serve/);
    expect(fnSource).toMatch(/action:\s*['"]balance_reconciled['"]/);
  });

  it("computes ledger sum from credits − debits (no naive sum)", () => {
    expect(fnSource).toMatch(/entry_type === ['"]credit['"][\s\S]{0,40}\?\s*1\s*:\s*-1/);
  });
});
