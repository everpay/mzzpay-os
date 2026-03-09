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
    const { type, data } = payload;

    console.log(`Chargeflow webhook received: ${type}`, { id: data?.id });

    switch (type) {
      case 'dispute.created':
      case 'dispute.ingested': {
        // Find merchant by matching transaction
        let merchantId: string | null = null;

        if (data?.transaction_id) {
          const { data: transaction } = await supabase
            .from('transactions')
            .select('merchant_id')
            .eq('provider_ref', data.transaction_id)
            .single();
          merchantId = transaction?.merchant_id || null;
        }

        if (!merchantId) {
          // Try to find by Chargeflow account mapping or use first merchant as fallback
          console.log('Could not find merchant for dispute, skipping');
          break;
        }

        // Upsert dispute
        await supabase.from('disputes').upsert({
          merchant_id: merchantId,
          chargeflow_id: data.id,
          amount: data.amount || 0,
          currency: data.currency || 'USD',
          status: data.status || 'open',
          reason: data.reason || data.dispute_reason,
          evidence_due_date: data.evidence_due_date,
          provider: data.provider,
          customer_email: data.customer_email,
          description: data.description,
          outcome: data.outcome,
          chargeflow_payload: data,
        }, { onConflict: 'chargeflow_id' });

        // Log event
        await supabase.from('provider_events').insert({
          merchant_id: merchantId,
          provider: 'chargeflow',
          event_type: type,
          payload,
        });

        // Forward to merchant webhook
        const { data: merchant } = await supabase
          .from('merchants')
          .select('webhook_url')
          .eq('id', merchantId)
          .single();

        if (merchant?.webhook_url) {
          try {
            await fetch(merchant.webhook_url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                event: 'chargeflow.dispute.created',
                dispute_id: data.id,
                amount: data.amount,
                currency: data.currency,
                reason: data.reason,
                timestamp: new Date().toISOString(),
              }),
            });
          } catch (e) {
            console.error('Merchant webhook delivery failed:', e);
          }
        }
        break;
      }

      case 'evidence.pdf.created': {
        console.log('Evidence PDF created for dispute:', data?.dispute_id);
        // Update dispute with evidence info
        if (data?.dispute_id) {
          await supabase.from('disputes')
            .update({
              status: 'evidence_submitted',
              chargeflow_payload: data,
            })
            .eq('chargeflow_id', data.dispute_id);
        }
        break;
      }

      case 'webhook.test': {
        console.log('Chargeflow test webhook received');
        break;
      }

      default:
        console.log(`Unhandled Chargeflow event: ${type}`);
    }

    return new Response(
      JSON.stringify({ received: true, type }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Chargeflow webhook error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
