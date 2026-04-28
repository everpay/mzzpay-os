import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * subscription-billing — runs on cron. For every active subscription whose
 * current_period_end has passed, it attempts to charge the customer's vaulted
 * card via the live `process-payment` pipeline (which routes to Shieldhub for
 * USD/global volume and Risonpay for EUR/GBP/EU). Successful charges advance
 * the period; failures mark the sub `past_due` so the dunning worker
 * (`retry-payment`) can pick it up.
 *
 * Recurring charges REQUIRE a vaulted payment method. If none is on file the
 * subscription is marked `past_due` with a `missing_payment_method` reason
 * instead of silently fake-completing.
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabase = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const now = new Date().toISOString();

    const { data: due } = await supabase
      .from('subscriptions')
      .select(`
        *,
        plan:subscription_plans(*),
        customer:customers(merchant_id, email, first_name, last_name, country),
        payment_method:payment_methods(vgs_alias, card_last4, card_brand, card_exp_month, card_exp_year)
      `)
      .eq('status', 'active')
      .lte('current_period_end', now);

    const charged: any[] = [];
    const failed: any[] = [];

    for (const sub of due || []) {
      const plan = (sub as any).plan;
      const customer = (sub as any).customer;
      const pm = (sub as any).payment_method;
      if (!plan || !customer) continue;

      // No vaulted card → past_due with explicit reason. Dunning worker
      // (`retry-payment`) will email the customer + skip retries until they
      // re-add a payment method.
      if (!pm?.vgs_alias) {
        await supabase.from('subscriptions').update({
          status: 'past_due',
          updated_at: now,
        }).eq('id', sub.id);
        await supabase.from('provider_events').insert({
          merchant_id: customer.merchant_id,
          provider: 'recurring',
          event_type: 'subscription.charge_skipped',
          payload: {
            subscription_id: sub.id,
            reason: 'missing_payment_method',
            amount: plan.amount,
            currency: plan.currency,
          },
        });
        failed.push({ subscriptionId: sub.id, reason: 'missing_payment_method' });
        continue;
      }

      // Charge the vaulted card via process-payment so Shieldhub/Risonpay
      // routing, validation, and ledger postings stay consistent with one-off
      // charges from the merchant portal.
      const idempotencyKey = `sub-${sub.id}-${new Date().toISOString().slice(0, 10)}`;
      let chargeOk = false;
      let chargeRaw: any = null;
      try {
        const res = await fetch(`${supabaseUrl}/functions/v1/process-payment`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: Deno.env.get('SUPABASE_ANON_KEY') || '',
            authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
          },
          body: JSON.stringify({
            amount: Number(plan.amount),
            currency: plan.currency,
            paymentMethod: 'card',
            customerEmail: customer.email,
            description: `Subscription: ${plan.name}`,
            idempotencyKey,
            merchantId: customer.merchant_id,
            // Vaulted card — process-payment knows to detokenize via VGS.
            cardDetails: {
              number: pm.vgs_alias,
              expMonth: String(pm.card_exp_month || '12'),
              expYear: String(pm.card_exp_year || '2030'),
              cvc: '000',
              holderName: `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 'Cardholder',
            },
            customer: {
              first: customer.first_name,
              last: customer.last_name,
            },
            billing: { country: customer.country || 'US' },
            // Mark the source so analytics / receipts can distinguish.
            metadata: { subscription_id: sub.id, recurring: true },
          }),
        });
        chargeRaw = await res.json().catch(() => ({}));
        chargeOk = res.ok && (chargeRaw?.status === 'completed' || chargeRaw?.status === 'processing' || chargeRaw?.transaction?.status === 'completed' || chargeRaw?.transaction?.status === 'processing');
      } catch (e) {
        chargeRaw = { error: String(e) };
      }

      if (chargeOk) {
        const periodEnd = new Date();
        if (plan.interval === 'day') periodEnd.setDate(periodEnd.getDate() + plan.interval_count);
        else if (plan.interval === 'week') periodEnd.setDate(periodEnd.getDate() + 7 * plan.interval_count);
        else if (plan.interval === 'year') periodEnd.setFullYear(periodEnd.getFullYear() + plan.interval_count);
        else periodEnd.setMonth(periodEnd.getMonth() + plan.interval_count);

        await supabase.from('subscriptions').update({
          current_period_start: now,
          current_period_end: periodEnd.toISOString(),
          updated_at: now,
        }).eq('id', sub.id);

        charged.push({
          subscriptionId: sub.id,
          transactionId: chargeRaw?.transaction?.id || chargeRaw?.transactionId,
          amount: plan.amount,
        });
      } else {
        await supabase.from('subscriptions').update({
          status: 'past_due',
          updated_at: now,
        }).eq('id', sub.id);
        await supabase.from('provider_events').insert({
          merchant_id: customer.merchant_id,
          provider: 'recurring',
          event_type: 'subscription.charge_failed',
          payload: {
            subscription_id: sub.id,
            amount: plan.amount,
            currency: plan.currency,
            response: chargeRaw,
          },
        });
        failed.push({ subscriptionId: sub.id, reason: chargeRaw?.error || chargeRaw?.error_code || 'charge_failed' });
      }
    }

    return new Response(JSON.stringify({
      success: true,
      charged: charged.length,
      failed: failed.length,
      items: charged,
      failures: failed,
    }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
