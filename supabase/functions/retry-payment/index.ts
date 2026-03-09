import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Dunning schedule: retry after these many days
const RETRY_SCHEDULE = [1, 3, 7]; // days after initial failure

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json().catch(() => ({}));
    const { subscription_id, force = false } = body;

    // Get past_due subscriptions
    let query = supabase
      .from('subscriptions')
      .select(`
        *,
        customer:customers(id, email, first_name, last_name, merchant_id),
        plan:subscription_plans(name, amount, currency),
        payment_method:payment_methods(vgs_alias, card_last4, card_brand)
      `)
      .eq('status', 'past_due');

    if (subscription_id) {
      query = query.eq('id', subscription_id);
    }

    const { data: pastDueSubscriptions, error } = await query;

    if (error) throw error;

    const results = [];

    for (const sub of (pastDueSubscriptions || [])) {
      // Check retry history from provider_events
      const { data: retryEvents } = await supabase
        .from('provider_events')
        .select('created_at, payload')
        .eq('event_type', 'payment.retry_attempted')
        .contains('payload', { subscription_id: sub.id })
        .order('created_at', { ascending: false });

      const retryCount = retryEvents?.length || 0;
      const lastRetry = retryEvents?.[0]?.created_at;

      // Determine if we should retry now
      let shouldRetry = force;
      if (!force) {
        if (retryCount >= RETRY_SCHEDULE.length) {
          // Exhausted all retries — mark as canceled
          await supabase.from('subscriptions').update({ status: 'canceled', canceled_at: new Date().toISOString() }).eq('id', sub.id);

          // Fire cancellation alert
          await supabase.functions.invoke('subscription-alerts', {
            body: {
              type: 'cancellation_confirmed',
              subscription_id: sub.id,
              customer_email: sub.customer?.email,
            },
          });

          results.push({ id: sub.id, action: 'canceled_after_exhausted_retries' });
          continue;
        }

        if (lastRetry) {
          const daysSinceLastRetry = (Date.now() - new Date(lastRetry).getTime()) / (1000 * 60 * 60 * 24);
          shouldRetry = daysSinceLastRetry >= RETRY_SCHEDULE[retryCount];
        } else {
          // First retry attempt
          const daysSincePastDue = (Date.now() - new Date(sub.updated_at).getTime()) / (1000 * 60 * 60 * 24);
          shouldRetry = daysSincePastDue >= RETRY_SCHEDULE[0];
        }
      }

      if (!shouldRetry) {
        results.push({ id: sub.id, action: 'skipped', retryCount, nextRetryDay: RETRY_SCHEDULE[retryCount] });
        continue;
      }

      // Simulate payment retry (in production would call actual payment processor)
      const paymentSuccess = Math.random() > 0.3; // 70% success rate for simulation

      if (paymentSuccess) {
        // Update subscription back to active
        const nextPeriodEnd = new Date();
        nextPeriodEnd.setMonth(nextPeriodEnd.getMonth() + (sub.plan?.interval === 'year' ? 12 : 1));

        await supabase.from('subscriptions').update({
          status: 'active',
          current_period_start: new Date().toISOString(),
          current_period_end: nextPeriodEnd.toISOString(),
          updated_at: new Date().toISOString(),
        }).eq('id', sub.id);

        // Log event
        await supabase.from('provider_events').insert({
          merchant_id: sub.customer?.merchant_id,
          provider: 'dunning',
          event_type: 'payment.retry_success',
          payload: { subscription_id: sub.id, attempt: retryCount + 1, amount: sub.plan?.amount },
        });

        results.push({ id: sub.id, action: 'retry_succeeded', attempt: retryCount + 1 });
      } else {
        // Log failed retry
        if (sub.customer?.merchant_id) {
          await supabase.from('provider_events').insert({
            merchant_id: sub.customer.merchant_id,
            provider: 'dunning',
            event_type: 'payment.retry_attempted',
            payload: { subscription_id: sub.id, attempt: retryCount + 1, failed: true },
          });
        }

        // Send payment failed alert
        await supabase.functions.invoke('subscription-alerts', {
          body: {
            type: 'payment_failed',
            subscription_id: sub.id,
            customer_email: sub.customer?.email,
            retry_attempt: retryCount + 1,
          },
        });

        results.push({ id: sub.id, action: 'retry_failed', attempt: retryCount + 1 });
      }
    }

    return new Response(
      JSON.stringify({ success: true, processed: results.length, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Retry payment error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
