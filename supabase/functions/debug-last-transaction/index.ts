import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Verify caller is admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check admin role
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    const roles = roleData?.map((r: any) => r.role) || [];
    const isAdmin = roles.includes("admin") || roles.includes("super_admin");
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden — admin only" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get optional transaction_id from query params
    const url = new URL(req.url);
    const txId = url.searchParams.get("transaction_id");

    let query = supabase
      .from("transactions")
      .select("id, amount, currency, status, provider, provider_ref, processor_raw_response, processor_error_code, processor_error_message, card_brand, card_last4, card_bin, created_at")
      .order("created_at", { ascending: false })
      .limit(1);

    if (txId) {
      query = query.eq("id", txId);
    }

    const { data, error } = await query.single();
    if (error || !data) {
      return new Response(JSON.stringify({ error: "Transaction not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      transaction_id: data.id,
      amount: data.amount,
      currency: data.currency,
      status: data.status,
      provider: data.provider,
      provider_ref: data.provider_ref,
      card_brand: data.card_brand,
      card_last4: data.card_last4,
      card_bin: data.card_bin,
      processor_error_code: data.processor_error_code,
      processor_error_message: data.processor_error_message,
      processor_raw_response: data.processor_raw_response,
      descriptor: (data.processor_raw_response as any)?.descriptor || (data.processor_raw_response as any)?.descriptor_text || null,
      shieldhub_client_id: (data.processor_raw_response as any)?.shieldhub_client_id || null,
      created_at: data.created_at,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
