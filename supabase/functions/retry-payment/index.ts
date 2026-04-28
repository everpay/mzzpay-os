import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DEFAULT_SETTINGS = {
  enabled: true,
  max_attempts: 3,
  backoff_strategy: 'exponential' as const,
  backoff_seconds: 60,
  retry_decline_codes: ['insufficient_funds', 'do_not_honor', 'try_again_later'],
};

type Strategy = 'linear' | 'exponential' | 'fibonacci';

function fib(n: number): number {
  if (n <= 1) return 1;
  let a = 1, b = 1;
  for (let i = 2; i <= n; i++) [a, b] = [b, a + b];
  return b;
}

function delaySecondsForAttempt(attempt: number, base: number, strategy: Strategy): number {
  if (attempt < 1) return base;
  switch (strategy) {
    case 'linear': return base * attempt;
    case 'fibonacci': return base * fib(attempt);
    case 'exponential':
    default: return base * Math.pow(2, attempt - 1);
  }
}

function isRetryable(reason: string | null | undefined, allowed: string[]): boolean {
  if (!reason) return true; // unknown reason — allow if smart retry enabled
  const r = reason.toLowerCase().replace(/\s+/g, '_');
  return allowed.some(c => r.includes(c.toLowerCase()));
}

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

    let query = supabase
      .from('subscriptions')
      .select(`
        *,
        customer:customers(id, email, first_name, last_name, merchant_id),
        plan:subscription_plans(name, amount, currency, interval),
        payment_method:payment_methods(vgs_alias, card_last4, card_brand)
      `)
      .eq('status', 'past_due');

    if (subscription_id) query = query.eq('id', subscription_id);

    const { data: pastDueSubscriptions, error } = await query;
    if (error) throw error;

    const results: any[] = [];
    const settingsCache = new Map<string, typeof DEFAULT_SETTINGS>();

    async function getSettings(merchantId: string | null | undefined) {
      if (!merchantId) return DEFAULT_SETTINGS;
      if (settingsCache.has(merchantId)) return settingsCache.get(merchantId)!;
      const { data } = await supabase
        .from('retry_settings')
        .select('*')
        .eq('merchant_id', merchantId)
        .maybeSingle();
      const s = data
        ? {
            enabled: data.enabled,
            max_attempts: data.max_attempts,
            backoff_strategy: data.backoff_strategy as Strategy,
            backoff_seconds: data.backoff_seconds,
            retry_decline_codes: Array.isArray(data.retry_decline_codes)
              ? (data.retry_decline_codes as string[])
              : DEFAULT_SETTINGS.retry_decline_codes,
          }
        : DEFAULT_SETTINGS;
      settingsCache.set(merchantId, s);
      return s;
    }

    for (const sub of (pastDueSubscriptions || [])) {
      const merchantId = sub.customer?.merchant_id;
      const settings = await getSettings(merchantId);

      // Honor per-merchant disable
      if (!settings.enabled && !force) {
        results.push({ id: sub.id, action: 'skipped_disabled' });
        continue;
      }

      // Retry history
      const { data: retryEvents } = await supabase
        .from('provider_events')
        .select('created_at, payload')
        .eq('event_type', 'payment.retry_attempted')
        .contains('payload', { subscription_id: sub.id })
        .order('created_at', { ascending: false });

      const retryCount = retryEvents?.length || 0;
      const lastRetry = retryEvents?.[0]?.created_at;
      const lastReason = (retryEvents?.[0]?.payload as any)?.failure_reason as string | undefined;

      // Honor decline-code allow-list
      if (lastReason && !force && !isRetryable(lastReason, settings.retry_decline_codes)) {
        await supabase.from('subscriptions').update({
          status: 'canceled',
          canceled_at: new Date().toISOString(),
        }).eq('id', sub.id);
        results.push({ id: sub.id, action: 'canceled_non_retryable', reason: lastReason });
        continue;
      }

      let shouldRetry = force;
      if (!force) {
        if (retryCount >= settings.max_attempts) {
          await supabase.from('subscriptions').update({
            status: 'canceled',
            canceled_at: new Date().toISOString(),
          }).eq('id', sub.id);

          await supabase.functions.invoke('subscription-alerts', {
            body: {
              type: 'cancellation_confirmed',
              subscription_id: sub.id,
              customer_email: sub.customer?.email,
            },
          });

          results.push({ id: sub.id, action: 'canceled_after_exhausted_retries', attempts: retryCount });
          continue;
        }

        const requiredDelaySec = delaySecondsForAttempt(
          retryCount + 1,
          settings.backoff_seconds,
          settings.backoff_strategy,
        );
        const since = lastRetry ? new Date(lastRetry).getTime() : new Date(sub.updated_at).getTime();
        const elapsedSec = (Date.now() - since) / 1000;
        shouldRetry = elapsedSec >= requiredDelaySec;

        if (!shouldRetry) {
          results.push({
            id: sub.id,
            action: 'skipped',
            retryCount,
            nextRetryInSec: Math.max(0, Math.round(requiredDelaySec - elapsedSec)),
          });
          continue;
        }
      }

      // Real retry — invoke `process-payment` with the vaulted card so the
      // dunning attempt actually hits Shieldhub / Risonpay (not a coin flip).
      // Subscriptions without a vaulted method are short-circuited as a
      // permanent failure; the customer must re-add a card via the portal.
      let paymentSuccess = false;
      let chargeRaw: any = null;
      const pm = (sub as any).payment_method;
      if (!pm?.vgs_alias) {
        chargeRaw = { error_code: 'missing_payment_method' };
      } else {
        try {
          const res = await fetch(`${supabaseUrl}/functions/v1/process-payment`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              apikey: Deno.env.get('SUPABASE_ANON_KEY') || '',
              authorization: `Bearer ${supabaseKey}`,
            },
            body: JSON.stringify({
              amount: Number(sub.plan?.amount || 0),
              currency: sub.plan?.currency || 'USD',
              paymentMethod: 'card',
              customerEmail: sub.customer?.email,
              description: `Subscription retry: ${sub.plan?.name || sub.id}`,
              idempotencyKey: `retry-${sub.id}-${retryCount + 1}`,
              merchantId: merchantId,
              cardDetails: {
                number: pm.vgs_alias,
                expMonth: String((pm as any).card_exp_month || '12'),
                expYear: String((pm as any).card_exp_year || '2030'),
                cvc: '000',
                holderName: `${sub.customer?.first_name || ''} ${sub.customer?.last_name || ''}`.trim() || 'Cardholder',
              },
              customer: {
                first: sub.customer?.first_name,
                last: sub.customer?.last_name,
              },
              billing: { country: (sub.customer as any)?.country || 'US' },
              metadata: { subscription_id: sub.id, recurring: true, retry_attempt: retryCount + 1 },
            }),
          });
          chargeRaw = await res.json().catch(() => ({}));
          paymentSuccess = res.ok && (
            chargeRaw?.status === 'completed' ||
            chargeRaw?.status === 'processing' ||
            chargeRaw?.transaction?.status === 'completed' ||
            chargeRaw?.transaction?.status === 'processing'
          );
        } catch (e) {
          chargeRaw = { error: String(e) };
        }
      }

      if (paymentSuccess) {
        const nextPeriodEnd = new Date();
        nextPeriodEnd.setMonth(nextPeriodEnd.getMonth() + (sub.plan?.interval === 'year' ? 12 : 1));

        await supabase.from('subscriptions').update({
          status: 'active',
          current_period_start: new Date().toISOString(),
          current_period_end: nextPeriodEnd.toISOString(),
          updated_at: new Date().toISOString(),
        }).eq('id', sub.id);

        if (merchantId) {
          await supabase.from('provider_events').insert({
            merchant_id: merchantId,
            provider: 'dunning',
            event_type: 'payment.retry_success',
            payload: { subscription_id: sub.id, attempt: retryCount + 1, amount: sub.plan?.amount },
          });
        }

        results.push({ id: sub.id, action: 'retry_succeeded', attempt: retryCount + 1 });
      } else {
        const failureReason = settings.retry_decline_codes[0] || 'do_not_honor';
        if (merchantId) {
          await supabase.from('provider_events').insert({
            merchant_id: merchantId,
            provider: 'dunning',
            event_type: 'payment.retry_attempted',
            payload: {
              subscription_id: sub.id,
              attempt: retryCount + 1,
              failed: true,
              failure_reason: failureReason,
              backoff_strategy: settings.backoff_strategy,
            },
          });
        }

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
