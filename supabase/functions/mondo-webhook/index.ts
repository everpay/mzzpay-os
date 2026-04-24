import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { applyLedgerCredit, ingestProviderEvent } from "../_shared/psp-ingest.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const url = new URL(req.url);
    const status = url.searchParams.get('status');
    const transactionId = url.searchParams.get('transaction_id');

    let payload: any = {};
    try {
      const text = await req.text();
      if (text) payload = JSON.parse(text);
    } catch { /* no body */ }

    console.log('Mondo webhook received:', { status, transactionId });

    const mondoTxId = payload.transaction_id || payload.id || transactionId;
    const mondoStatus = (payload.transaction_status || payload.status || status || '').toUpperCase();
    // Mondo doesn't always supply a stable event id; fall back to tx+status hash.
    const eventId = payload.event_id || payload.notification_id ||
      (mondoTxId ? `${mondoTxId}:${mondoStatus}` : null);

    let newStatus: 'completed' | 'failed' | 'processing' = 'processing';
    if (['APPROVED', 'COMPLETED', 'SUCCESS'].includes(mondoStatus)) newStatus = 'completed';
    else if (['DECLINED', 'FAILED', 'REJECTED', 'ERROR', 'CANCELED'].includes(mondoStatus)) newStatus = 'failed';

    if (mondoTxId) {
      const { data: transaction } = await supabase
        .from('transactions')
        .select('id, merchant_id, status')
        .eq('provider_ref', mondoTxId.toString())
        .maybeSingle();

      if (transaction) {
        // Idempotent ingest — duplicate webhooks are a no-op.
        const ingest = await ingestProviderEvent(supabase, {
          provider: 'mondo',
          eventId,
          eventType: `payment.${newStatus}`,
          payload,
          transactionId: transaction.id,
          merchantId: transaction.merchant_id,
          mappedStatus: newStatus,
        });

        if (!ingest.duplicate && transaction.status !== newStatus) {
          await supabase.from('transactions').update({ status: newStatus }).eq('id', transaction.id);
          if (newStatus === 'completed') await applyLedgerCredit(supabase, transaction.id);

          // Forward to merchant webhook only on first ingest of this event.
          const { data: merchant } = await supabase
            .from('merchants').select('webhook_url').eq('id', transaction.merchant_id).single();
          if (merchant?.webhook_url) {
            try {
              await fetch(merchant.webhook_url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  event: `payment.${newStatus}`,
                  transaction_id: transaction.id,
                  provider_ref: mondoTxId,
                  status: newStatus,
                  timestamp: new Date().toISOString(),
                }),
              });
            } catch (e) { console.error('Merchant webhook delivery failed:', e); }
          }
        }
      }
    }

    if (req.method === 'GET' && status) {
      const frontendUrl = Deno.env.get('FRONTEND_URL') || 'https://mzzpay.io';
      const redirectTo = `${frontendUrl}/checkout?status=${status === 'completed' ? 'success' : 'failed'}`;
      return new Response(null, { status: 302, headers: { ...corsHeaders, 'Location': redirectTo } });
    }

    return new Response(
      JSON.stringify({ received: true, status: newStatus }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Mondo webhook error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
