import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

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

    const payload = await req.json();
    const { event, transaction_id, partner_session_id, status, amount, currency, payment_method } = payload;

    console.log(`Payment link webhook received: ${event}`, { transaction_id, partner_session_id });

    // Validate required fields
    if (!event || !transaction_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: event, transaction_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log the webhook event
    const { error: eventError } = await supabase.from('provider_events').insert({
      merchant_id: payload.merchant_id || '00000000-0000-0000-0000-000000000000',
      transaction_id,
      provider: 'payment_link',
      event_type: event,
      payload,
    });

    if (eventError) {
      console.error('Error logging webhook event:', eventError);
    }

    // Handle different webhook events
    switch (event) {
      case 'payment_link.completed': {
        // Update transaction status
        if (transaction_id) {
          await supabase
            .from('transactions')
            .update({ status: 'completed' })
            .eq('id', transaction_id);
        }

        // Send notification to merchant webhook if configured
        const { data: transaction } = await supabase
          .from('transactions')
          .select('merchant_id')
          .eq('id', transaction_id)
          .single();

        if (transaction?.merchant_id) {
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
                  event: 'payment.completed',
                  transaction_id,
                  partner_session_id,
                  amount,
                  currency,
                  payment_method,
                  timestamp: new Date().toISOString(),
                }),
              });
            } catch (e) {
              console.error('Merchant webhook delivery failed:', e);
            }
          }
        }
        break;
      }

      case 'payment_link.failed': {
        if (transaction_id) {
          await supabase
            .from('transactions')
            .update({ status: 'failed' })
            .eq('id', transaction_id);
        }
        break;
      }

      case 'payment_link.expired': {
        if (transaction_id) {
          await supabase
            .from('transactions')
            .update({ status: 'expired' })
            .eq('id', transaction_id);
        }
        break;
      }

      case 'payment_link.refunded': {
        if (transaction_id) {
          await supabase
            .from('transactions')
            .update({ status: 'refunded' })
            .eq('id', transaction_id);
        }
        break;
      }

      default:
        console.log(`Unhandled payment link event: ${event}`);
    }

    return new Response(
      JSON.stringify({ received: true, event }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Payment link webhook error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
