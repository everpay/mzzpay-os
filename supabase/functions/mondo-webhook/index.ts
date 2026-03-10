import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

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

    // Try to parse body if present
    let payload: any = {};
    try {
      const text = await req.text();
      if (text) payload = JSON.parse(text);
    } catch { /* no body */ }

    console.log('Mondo webhook received:', { status, transactionId, payload });

    const mondoTxId = payload.transaction_id || payload.id || transactionId;
    const mondoStatus = (payload.transaction_status || payload.status || status || '').toUpperCase();

    // Map Mondo status to internal status
    let newStatus = 'processing';
    if (['APPROVED', 'COMPLETED', 'SUCCESS'].includes(mondoStatus)) {
      newStatus = 'completed';
    } else if (['DECLINED', 'FAILED', 'REJECTED', 'ERROR', 'CANCELED'].includes(mondoStatus)) {
      newStatus = 'failed';
    }

    // Find the transaction by provider_ref
    if (mondoTxId) {
      const { data: transaction, error: findError } = await supabase
        .from('transactions')
        .select('id, merchant_id, status')
        .eq('provider_ref', mondoTxId.toString())
        .single();

      if (findError) {
        console.error('Transaction lookup error:', findError);
      }

      if (transaction && transaction.status === 'processing') {
        const { error: updateError } = await supabase
          .from('transactions')
          .update({ status: newStatus })
          .eq('id', transaction.id);

        if (updateError) {
          console.error('Transaction update error:', updateError);
        } else {
          console.log(`Transaction ${transaction.id} updated to ${newStatus}`);
        }

        // Log the webhook event
        await supabase.from('provider_events').insert({
          merchant_id: transaction.merchant_id,
          transaction_id: transaction.id,
          provider: 'mondo',
          event_type: `3ds.${newStatus}`,
          payload,
        });

        // Forward to merchant webhook if configured
        const { data: merchant } = await supabase
          .from('merchants')
          .select('webhook_url')
          .eq('id', transaction.merchant_id)
          .single();

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
          } catch (e) {
            console.error('Merchant webhook delivery failed:', e);
          }
        }
      }
    }

    // If this came as a redirect (GET with query params), redirect to a success/failure page
    if (req.method === 'GET' && status) {
      const redirectBase = Deno.env.get('SUPABASE_URL')?.replace('.supabase.co', '.supabase.co') || '';
      // Redirect to the frontend
      const frontendUrl = Deno.env.get('FRONTEND_URL') || 'https://mzzpay.io';
      const redirectTo = `${frontendUrl}/checkout?status=${status === 'completed' ? 'success' : 'failed'}`;
      return new Response(null, {
        status: 302,
        headers: { ...corsHeaders, 'Location': redirectTo },
      });
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
