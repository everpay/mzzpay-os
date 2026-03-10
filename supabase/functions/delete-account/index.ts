import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // User client to get the authenticated user
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) throw new Error("Not authenticated");

    // Admin client for deletion operations
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Delete profile (cascade will not touch transactions due to no FK from transactions->auth.users)
    await adminClient.from("profiles").delete().eq("user_id", user.id);

    // Delete merchant record (but transactions, invoices etc. remain as merchant_id FK is preserved)
    // We nullify the user_id link instead of deleting so payment data stays intact
    await adminClient.from("merchants").update({ 
      user_id: "00000000-0000-0000-0000-000000000000",
      name: "[Deleted Account]",
      contact_email: null,
      contact_name: null,
      phone_number: null,
      webhook_url: null,
      api_key_hash: null,
    }).eq("user_id", user.id);

    // Delete the auth user last
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(user.id);
    if (deleteError) throw deleteError;

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
