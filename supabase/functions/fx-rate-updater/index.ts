import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PAIRS = [
  ['USD', 'EUR'], ['USD', 'GBP'], ['USD', 'CAD'], ['USD', 'BRL'],
  ['USD', 'MXN'], ['USD', 'COP'], ['EUR', 'USD'], ['EUR', 'GBP'],
  ['GBP', 'USD'], ['GBP', 'EUR'], ['CAD', 'USD'],
];

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const updates: any[] = [];
    for (const [base, quote] of PAIRS) {
      try {
        const r = await fetch(`https://api.exchangerate.host/convert?from=${base}&to=${quote}`);
        const j = await r.json();
        const rate = j?.result || j?.info?.rate;
        if (rate) {
          await supabase.from('fx_rates').insert({
            base_currency: base, quote_currency: quote, rate, source: 'exchangerate.host',
          });
          updates.push({ base, quote, rate });
        }
      } catch (e) {
        console.error(`Failed ${base}/${quote}:`, e);
      }
    }
    return new Response(JSON.stringify({ success: true, updated: updates.length, updates }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
