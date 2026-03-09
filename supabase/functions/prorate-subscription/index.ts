import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing authorization');

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) throw new Error('Unauthorized');

    const { subscription_id, new_plan_id } = await req.json();

    if (!subscription_id || !new_plan_id) {
      throw new Error('subscription_id and new_plan_id are required');
    }

    // Get current subscription with plan details
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select(`
        *,
        plan:subscription_plans(id, name, amount, currency, interval),
        customer:customers(merchant_id, email)
      `)
      .eq('id', subscription_id)
      .single();

    if (subError || !subscription) throw new Error('Subscription not found');

    // Get new plan details
    const { data: newPlan, error: planError } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('id', new_plan_id)
      .single();

    if (planError || !newPlan) throw new Error('New plan not found');

    const now = new Date();
    const periodStart = new Date(subscription.current_period_start);
    const periodEnd = new Date(subscription.current_period_end);

    // Calculate days remaining in current period
    const totalDays = (periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24);
    const daysRemaining = (periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    const daysUsed = totalDays - daysRemaining;

    // Proration calculation
    const currentDailyRate = (subscription.plan?.amount || 0) / totalDays;
    const newDailyRate = newPlan.amount / totalDays;

    const unusedCredit = currentDailyRate * daysRemaining;
    const newCharge = newDailyRate * daysRemaining;
    const proratedAmount = newCharge - unusedCredit;

    const isUpgrade = newPlan.amount > (subscription.plan?.amount || 0);

    // Update subscription to new plan
    const { error: updateError } = await supabase
      .from('subscriptions')
      .update({
        plan_id: new_plan_id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', subscription_id);

    if (updateError) throw updateError;

    // Log proration event
    await supabase.from('provider_events').insert({
      merchant_id: subscription.customer?.merchant_id,
      provider: 'billing',
      event_type: isUpgrade ? 'subscription.upgraded' : 'subscription.downgraded',
      payload: {
        subscription_id,
        old_plan: subscription.plan?.name,
        new_plan: newPlan.name,
        prorated_amount: Math.abs(proratedAmount),
        prorated_credit: isUpgrade ? 0 : unusedCredit,
        days_remaining: Math.round(daysRemaining),
        currency: newPlan.currency,
        changed_at: now.toISOString(),
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        proration: {
          old_plan: subscription.plan?.name,
          new_plan: newPlan.name,
          days_remaining: Math.round(daysRemaining),
          unused_credit: parseFloat(unusedCredit.toFixed(2)),
          new_charge: parseFloat(newCharge.toFixed(2)),
          prorated_amount: parseFloat(proratedAmount.toFixed(2)),
          is_upgrade: isUpgrade,
          currency: newPlan.currency,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Proration error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
