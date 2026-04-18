import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const { amount, currency, provider, rail } = await req.json();
    if (!amount || !currency) throw new Error('amount and currency required');
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    // Provider fee
    const { data: pf } = await supabase.from('provider_fees')
      .select('*').eq('provider', provider || 'mzzpay').eq('is_active', true)
      .maybeSingle();
    const providerPct = Number(pf?.rate_percent || 0);
    const providerFlat = Number(pf?.flat_fee || 0);

    // Platform markup
    const { data: pm } = await supabase.from('platform_markup')
      .select('*').eq('rail', rail || 'card').eq('is_active', true).maybeSingle();
    const platformPct = Number(pm?.markup_percent || 0.25);
    const platformFlat = Number(pm?.markup_flat || 0.10);

    const providerFee = (Number(amount) * providerPct) / 100 + providerFlat;
    const platformFee = (Number(amount) * platformPct) / 100 + platformFlat;
    const totalFee = providerFee + platformFee;
    const net = Number(amount) - totalFee;

    return new Response(JSON.stringify({
      amount: Number(amount), currency,
      provider_fee: parseFloat(providerFee.toFixed(2)),
      platform_fee: parseFloat(platformFee.toFixed(2)),
      total_fee: parseFloat(totalFee.toFixed(2)),
      net: parseFloat(net.toFixed(2)),
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
