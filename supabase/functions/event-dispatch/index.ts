import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const { merchant_id, event_type, payload, transaction_id } = await req.json();
    if (!merchant_id || !event_type) throw new Error('merchant_id and event_type required');
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    await supabase.from('provider_events').insert({
      merchant_id, transaction_id: transaction_id || null,
      event_type, payload: payload || {}, provider: payload?.provider || 'system',
    });

    const url = `${Deno.env.get('SUPABASE_URL')}/functions/v1/webhook-dispatch`;
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}` },
      body: JSON.stringify({ merchant_id, event_type, payload }),
    });
    const dispatch = await r.json();
    return new Response(JSON.stringify({ success: true, dispatch }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
