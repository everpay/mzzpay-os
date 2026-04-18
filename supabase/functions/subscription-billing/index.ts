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
    const now = new Date().toISOString();
    const { data: due } = await supabase.from('subscriptions')
      .select('*, plan:subscription_plans(*), customer:customers(merchant_id, email)')
      .eq('status', 'active').lte('current_period_end', now);

    const charged: any[] = [];
    for (const sub of due || []) {
      const plan = (sub as any).plan; const customer = (sub as any).customer;
      if (!plan || !customer) continue;
      const periodEnd = new Date();
      if (plan.interval === 'day') periodEnd.setDate(periodEnd.getDate() + plan.interval_count);
      else if (plan.interval === 'week') periodEnd.setDate(periodEnd.getDate() + 7 * plan.interval_count);
      else if (plan.interval === 'year') periodEnd.setFullYear(periodEnd.getFullYear() + plan.interval_count);
      else periodEnd.setMonth(periodEnd.getMonth() + plan.interval_count);

      const { data: txn } = await supabase.from('transactions').insert({
        merchant_id: customer.merchant_id,
        amount: plan.amount, currency: plan.currency,
        provider: 'recurring', status: 'completed',
        customer_email: customer.email,
        description: `Subscription: ${plan.name}`,
      }).select().single();

      await supabase.from('subscriptions').update({
        current_period_start: now,
        current_period_end: periodEnd.toISOString(),
      }).eq('id', sub.id);

      charged.push({ subscriptionId: sub.id, transactionId: txn?.id, amount: plan.amount });
    }
    return new Response(JSON.stringify({ success: true, charged: charged.length, items: charged }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
