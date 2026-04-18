import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const { bin } = await req.json();
    if (!bin || typeof bin !== 'string' || bin.length < 6) throw new Error('Valid 6+ digit BIN required');
    const cleanBin = bin.slice(0, 8);
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    const { data: cached } = await supabase.from('bin_cache').select('*').eq('bin', cleanBin).maybeSingle();
    if (cached) {
      return new Response(JSON.stringify({ source: 'cache', ...cached }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    try {
      const r = await fetch(`https://lookup.binlist.net/${cleanBin}`, {
        headers: { 'Accept-Version': '3' },
      });
      if (r.ok) {
        const j = await r.json();
        const record = {
          bin: cleanBin,
          brand: j.scheme,
          card_type: j.type,
          card_category: j.brand,
          issuer: j.bank?.name,
          country: j.country?.alpha2,
          raw_response: j,
        };
        await supabase.from('bin_cache').insert(record);
        return new Response(JSON.stringify({ source: 'binlist', ...record }), {
          status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    } catch (e) {
      console.error('BIN lookup failed:', e);
    }
    return new Response(JSON.stringify({ source: 'none', bin: cleanBin }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
