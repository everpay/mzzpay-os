import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { applyLedgerCredit, ingestProviderEvent } from "../_shared/psp-ingest.ts";
import { verifyHmacSignature } from "../_shared/verify-webhook.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-moneto-signature',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const rawBody = await req.text();
    const verify = await verifyHmacSignature({
      secret: Deno.env.get('MONETO_WEBHOOK_SECRET') ?? Deno.env.get('MONETO_MPG_MERCHANT_SECRET'),
      body: rawBody,
      signature: req.headers.get('x-moneto-signature') || req.headers.get('x-signature'),
      requireSecret: true,
    });
    if (!verify.ok) {
      console.warn('[moneto-webhook] signature failure:', verify.reason);
      return new Response(JSON.stringify({ error: 'unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const payload = JSON.parse(rawBody);
    const { event, payment_request_id, status, amount, currency } = payload;
    console.log(`Moneto webhook received: ${event}`, { payment_request_id, status });

    if (!event) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: event' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Resolve transaction by provider_ref
    const { data: transaction } = await supabase
      .from('transactions')
      .select('id, merchant_id, amount, currency, status')
      .eq('provider_ref', payment_request_id)
      .eq('provider', 'moneto')
      .maybeSingle();

    const merchantId = transaction?.merchant_id || payload.merchant_id || null;

    // Map event → mapped status
    const mapped: Record<string, 'completed' | 'failed' | 'processing' | 'pending'> = {
      'payment.succeeded': 'completed',
      'pay_request.succeeded': 'completed',
      'payment.failed': 'failed',
      'pay_request.failed': 'failed',
    };
    const mappedStatus = mapped[event] ?? 'processing';
    const eventId = payload.event_id || payload.id ||
      (payment_request_id ? `${payment_request_id}:${event}` : null);

    // Idempotent ingest — duplicate webhooks are a no-op AND we never double-credit.
    if (merchantId) {
      const ingest = await ingestProviderEvent(supabase, {
        provider: 'moneto',
        eventId,
        eventType: event,
        payload,
        transactionId: transaction?.id ?? null,
        merchantId,
        mappedStatus,
      });

      if (!ingest.duplicate && transaction) {
        if (mappedStatus === 'completed' && transaction.status !== 'completed') {
          await supabase.from('transactions')
            .update({ status: 'completed', updated_at: new Date().toISOString() })
            .eq('id', transaction.id);
          // Idempotent credit (handles ledger + balance via shared helper)
          await applyLedgerCredit(supabase, transaction.id);
          await forwardToMerchantWebhook(supabase, transaction.merchant_id, {
            event: 'moneto.payment.succeeded',
            transaction_id: transaction.id,
            payment_request_id,
            amount: transaction.amount,
            currency: transaction.currency,
            timestamp: new Date().toISOString(),
          });
        } else if (mappedStatus === 'failed' && transaction.status !== 'failed') {
          await supabase.from('transactions')
            .update({ status: 'failed', updated_at: new Date().toISOString() })
            .eq('id', transaction.id);
          await forwardToMerchantWebhook(supabase, transaction.merchant_id, {
            event: 'moneto.payment.failed',
            transaction_id: transaction.id,
            payment_request_id,
            timestamp: new Date().toISOString(),
          });
        }
      }
    }

    // Payouts — kept on a separate path; non-idempotent balance arithmetic is
    // intentionally NOT performed here. Forward only.
    if (merchantId && (event === 'payout.completed' || event === 'payout.failed')) {
      await forwardToMerchantWebhook(supabase, merchantId, {
        event: `moneto.${event}`,
        payout_id: payload.payout_id,
        amount,
        currency,
        reason: payload.failure_reason,
        timestamp: new Date().toISOString(),
      });
    }

    return new Response(
      JSON.stringify({ received: true, event }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('Moneto webhook error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});

async function forwardToMerchantWebhook(supabase: any, merchantId: string, payload: any) {
  try {
    const { data: merchant } = await supabase
      .from('merchants')
      .select('webhook_url')
      .eq('id', merchantId)
      .single();
    if (merchant?.webhook_url) {
      await fetch(merchant.webhook_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    }
  } catch (e) {
    console.error('Merchant webhook delivery failed:', e);
  }
}
