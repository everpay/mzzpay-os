import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Resolve the authenticated user
    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (userErr || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Resolve merchant
    const { data: merchant } = await supabase
      .from("merchants")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!merchant) {
      return new Response(
        JSON.stringify({ error: "No merchant found for this user" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Call the reconciliation RPC
    const { data: rows, error: rpcErr } = await supabase.rpc(
      "merchant_reconciliation_rows",
      { _merchant_id: merchant.id },
    );

    if (rpcErr) {
      console.error("Reconciliation RPC error:", rpcErr);
      return new Response(
        JSON.stringify({ error: "RECONCILIATION_SERVICE_ERROR", fallback: true, details: rpcErr.message }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const reconciliationRows = (rows || []).map((r: any) => ({
      account_id: r.account_id,
      currency: r.currency,
      stored_balance: Number(r.stored_balance),
      ledger_total: Number(r.ledger_total),
      discrepancy: Number(r.discrepancy),
      entry_count: Number(r.entry_count),
      status: r.status,
    }));

    const matched = reconciliationRows.filter((r: any) => r.status === "matched").length;
    const flagged = reconciliationRows.filter((r: any) => r.status === "discrepancy").length;
    const totalDrift = reconciliationRows.reduce(
      (s: number, r: any) => s + Math.abs(r.discrepancy),
      0,
    );

    return new Response(
      JSON.stringify({
        merchant_id: merchant.id,
        summary: {
          total_accounts: reconciliationRows.length,
          matched,
          flagged,
          total_drift: Math.round(totalDrift * 100) / 100,
        },
        rows: reconciliationRows,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("Reconciliation endpoint error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: String(err) }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
