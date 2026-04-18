import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { merchantId, days = 7 } = await req.json().catch(() => ({}));
    const since = new Date(Date.now() - days * 86400_000).toISOString();
    const q = supabase.from('transactions')
      .select('id, amount, currency, provider, status, settlement_amount, created_at')
      .gte('created_at', since).in('status', ['completed', 'refunded', 'chargeback']);
    if (merchantId) q.eq('merchant_id', merchantId);
    const { data: txs } = await q;

    const groups = new Map<string, any>();
    (txs || []).forEach(t => {
      const date = t.created_at.split('T')[0];
      const k = `${t.provider}-${date}`;
      const g = groups.get(k) || { provider: t.provider, date, gross: 0, settled: 0, count: 0, currency: t.currency };
      g.gross += Number(t.amount);
      g.settled += Number(t.settlement_amount || t.amount);
      g.count += 1;
      groups.set(k, g);
    });
    const rows = Array.from(groups.values()).map(g => ({
      ...g,
      variance: g.settled - g.gross,
      status: Math.abs(g.settled - g.gross) < 0.01 ? 'matched' : 'pending',
    }));
    return new Response(JSON.stringify({ success: true, rows }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
