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

    const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
    const start = new Date(yesterday); start.setHours(0,0,0,0);
    const end = new Date(yesterday); end.setHours(23,59,59,999);

    const { data: merchants } = await supabase.from('merchants').select('id');
    const batches: any[] = [];
    for (const m of merchants || []) {
      const { data: txs } = await supabase.from('transactions')
        .select('amount, currency, provider, surcharge_amount, settlement_amount')
        .eq('merchant_id', m.id).eq('status', 'completed')
        .gte('created_at', start.toISOString()).lte('created_at', end.toISOString());
      if (!txs?.length) continue;
      const grouped = new Map<string, { gross: number; count: number; provider: string }>();
      txs.forEach(t => {
        const k = `${t.provider}-${t.currency}`;
        const g = grouped.get(k) || { gross: 0, count: 0, provider: t.provider };
        g.gross += Number(t.amount);
        g.count += 1;
        grouped.set(k, g);
      });
      for (const [key, g] of grouped) {
        const [provider, currency] = key.split('-');
        const fee = g.gross * 0.029 + g.count * 0.30;
        const net = g.gross - fee;
        const { data: settlement } = await supabase.from('settlements').insert({
          merchant_id: m.id,
          batch_id: `BATCH-${start.toISOString().slice(0,10)}-${provider}`,
          processor: provider,
          currency,
          gross_amount: parseFloat(g.gross.toFixed(2)),
          fee: parseFloat(fee.toFixed(2)),
          net_amount: parseFloat(net.toFixed(2)),
          status: 'pending',
          scheduled_at: new Date(Date.now() + 2 * 86400_000).toISOString(),
        }).select().single();
        batches.push(settlement);
      }
    }
    return new Response(JSON.stringify({ success: true, batches: batches.length }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
