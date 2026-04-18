import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const { amount, from, to } = await req.json();
    if (!amount || !from || !to) throw new Error('amount, from, to required');

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    if (from === to) {
      return new Response(JSON.stringify({ amount, converted: amount, rate: 1, from, to }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const { data } = await supabase.from('fx_rates')
      .select('rate').eq('base_currency', from).eq('quote_currency', to)
      .order('fetched_at', { ascending: false }).limit(1).maybeSingle();
    const rate = data?.rate ? Number(data.rate) : 1;
    return new Response(JSON.stringify({ amount, converted: Number(amount) * rate, rate, from, to }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
