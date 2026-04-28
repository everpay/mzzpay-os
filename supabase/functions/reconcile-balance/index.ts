// reconcile-balance — merchant-scoped account balance reconciliation.
//
// GET  ?action=drift            → returns per-account drift report for the
//                                 caller's merchant (or any merchant when
//                                 invoked by a super_admin with merchantId).
// POST { account_id, reason }   → atomically resets accounts.balance and
//                                 accounts.available_balance to the signed
//                                 sum of ledger_entries for that account,
//                                 then writes a single audit_logs row
//                                 documenting the before/after delta.
//
// Authorization:
//   - Merchants may only reconcile accounts belonging to their own merchant.
//   - super_admins may reconcile any account by passing merchantId in body.
//
// All decline / "no drift" responses return HTTP 200 with structured JSON
// per project convention; only catastrophic errors return 500.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { z } from "https://esm.sh/zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const ReconcileBody = z.object({
  account_id: z.string().uuid(),
  reason: z.string().min(3).max(500).optional(),
});

const TOLERANCE = 0.005; // ½ cent — anything tighter is float noise

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

interface DriftRow {
  account_id: string;
  merchant_id: string;
  currency: string;
  current_balance: number;
  current_available: number;
  ledger_sum: number;
  drift: number;
  has_drift: boolean;
  entry_count: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceKey);

  // --- Resolve caller → user + merchant + role ---
  const auth = req.headers.get("Authorization") || "";
  if (!auth.startsWith("Bearer ")) return json({ error: "unauthorized" }, 200);
  const token = auth.replace(/^Bearer\s+/i, "");
  const { data: userRes } = await admin.auth.getUser(token);
  const user = userRes?.user;
  if (!user) return json({ error: "unauthorized" }, 200);

  const [{ data: merchantRow }, { data: rolesRows }] = await Promise.all([
    admin.from("merchants").select("id").eq("user_id", user.id).maybeSingle(),
    admin.from("user_roles").select("role").eq("user_id", user.id),
  ]);
  const roles = (rolesRows ?? []).map((r: any) => r.role);
  const isSuperAdmin = roles.includes("super_admin");
  const callerMerchantId = merchantRow?.id ?? null;

  const url = new URL(req.url);
  const action = url.searchParams.get("action") || (req.method === "POST" ? "reconcile" : "drift");

  // --- Drift report ----------------------------------------------------
  if (action === "drift") {
    const targetMerchantId = url.searchParams.get("merchantId") || callerMerchantId;
    if (!targetMerchantId) return json({ error: "no_merchant" }, 200);
    if (targetMerchantId !== callerMerchantId && !isSuperAdmin) {
      return json({ error: "forbidden" }, 200);
    }

    const { data: accounts, error: accErr } = await admin
      .from("accounts")
      .select("id, merchant_id, currency, balance, available_balance")
      .eq("merchant_id", targetMerchantId);
    if (accErr) return json({ error: accErr.message }, 200);
    if (!accounts || accounts.length === 0) {
      return json({ accounts: [], drift_count: 0 });
    }

    const ids = accounts.map((a) => a.id);
    const { data: entries } = await admin
      .from("ledger_entries")
      .select("account_id, entry_type, amount")
      .in("account_id", ids);

    const sums = new Map<string, { sum: number; n: number }>();
    for (const e of entries ?? []) {
      const cur = sums.get(e.account_id as string) || { sum: 0, n: 0 };
      const sign = e.entry_type === "credit" ? 1 : -1;
      cur.sum += sign * Number(e.amount);
      cur.n += 1;
      sums.set(e.account_id as string, cur);
    }

    const report: DriftRow[] = accounts.map((a) => {
      const s = sums.get(a.id as string) || { sum: 0, n: 0 };
      const drift = Number(a.balance) - s.sum;
      return {
        account_id: a.id as string,
        merchant_id: a.merchant_id as string,
        currency: a.currency as string,
        current_balance: Number(a.balance),
        current_available: Number(a.available_balance),
        ledger_sum: s.sum,
        drift,
        has_drift: Math.abs(drift) > TOLERANCE,
        entry_count: s.n,
      };
    });

    return json({
      accounts: report,
      drift_count: report.filter((r) => r.has_drift).length,
      checked_at: new Date().toISOString(),
    });
  }

  // --- Reconcile a single account -------------------------------------
  if (action === "reconcile") {
    const parsed = ReconcileBody.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return json({ error: "invalid_body", details: parsed.error.flatten() }, 200);
    }
    const { account_id, reason } = parsed.data;

    const { data: account, error: aErr } = await admin
      .from("accounts")
      .select("id, merchant_id, currency, balance, available_balance")
      .eq("id", account_id)
      .maybeSingle();
    if (aErr) return json({ error: aErr.message }, 200);
    if (!account) return json({ error: "account_not_found" }, 200);

    if (account.merchant_id !== callerMerchantId && !isSuperAdmin) {
      return json({ error: "forbidden" }, 200);
    }

    const { data: entries } = await admin
      .from("ledger_entries")
      .select("entry_type, amount")
      .eq("account_id", account_id);
    const ledgerSum = (entries ?? []).reduce(
      (s, e) => s + (e.entry_type === "credit" ? 1 : -1) * Number(e.amount),
      0,
    );

    const before = {
      balance: Number(account.balance),
      available_balance: Number(account.available_balance),
    };
    const drift = before.balance - ledgerSum;

    if (Math.abs(drift) <= TOLERANCE) {
      return json({
        ok: true,
        already_reconciled: true,
        account_id,
        balance: before.balance,
        ledger_sum: ledgerSum,
        drift,
      });
    }

    // Pin available_balance proportionally — never let available exceed total.
    const newBalance = ledgerSum;
    const reservedDelta = before.balance - before.available_balance;
    const newAvailable = Math.max(0, newBalance - Math.max(0, reservedDelta));

    const { error: uErr } = await admin
      .from("accounts")
      .update({
        balance: newBalance,
        available_balance: newAvailable,
        updated_at: new Date().toISOString(),
      })
      .eq("id", account_id);
    if (uErr) return json({ error: uErr.message }, 200);

    await admin.from("audit_logs").insert({
      action: "balance_reconciled",
      entity_type: "account",
      entity_id: account_id,
      user_id: user.id,
      merchant_id: account.merchant_id,
      metadata: {
        currency: account.currency,
        before,
        after: { balance: newBalance, available_balance: newAvailable },
        ledger_sum: ledgerSum,
        drift,
        reason: reason ?? null,
        triggered_by: isSuperAdmin && account.merchant_id !== callerMerchantId
          ? "super_admin_override"
          : "merchant_self_serve",
      },
    });

    return json({
      ok: true,
      account_id,
      currency: account.currency,
      before,
      after: { balance: newBalance, available_balance: newAvailable },
      ledger_sum: ledgerSum,
      drift,
    });
  }

  return json({ error: "unknown_action" }, 200);
});
