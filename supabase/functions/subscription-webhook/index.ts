import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WebhookPayload {
  event: string;
  subscription_id: string;
  customer_id?: string;
  status?: string;
  current_period_end?: string;
  canceled_at?: string;
  payment_failed?: boolean;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const payload: WebhookPayload = await req.json();
    console.log('Webhook received:', payload);

    // Handle different subscription events
    switch (payload.event) {
      case 'subscription.created':
        console.log('New subscription created:', payload.subscription_id);
        break;

      case 'subscription.updated':
      case 'subscription.renewed':
        if (payload.current_period_end) {
          const { error } = await supabase
            .from('subscriptions')
            .update({
              status: payload.status || 'active',
              current_period_start: new Date().toISOString(),
              current_period_end: payload.current_period_end,
              updated_at: new Date().toISOString(),
            })
            .eq('id', payload.subscription_id);

          if (error) {
            console.error('Error updating subscription:', error);
            throw error;
          }
          console.log('Subscription renewed:', payload.subscription_id);
        }
        break;

      case 'subscription.canceled':
        const { error: cancelError } = await supabase
          .from('subscriptions')
          .update({
            status: 'canceled',
            canceled_at: payload.canceled_at || new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', payload.subscription_id);

        if (cancelError) {
          console.error('Error canceling subscription:', cancelError);
          throw cancelError;
        }
        console.log('Subscription canceled:', payload.subscription_id);
        break;

      case 'subscription.payment_failed':
        const { error: failError } = await supabase
          .from('subscriptions')
          .update({
            status: 'past_due',
            updated_at: new Date().toISOString(),
          })
          .eq('id', payload.subscription_id);

        if (failError) {
          console.error('Error updating payment failed status:', failError);
          throw failError;
        }
        console.log('Payment failed for subscription:', payload.subscription_id);
        break;

      default:
        console.log('Unhandled event type:', payload.event);
    }

    // Log the event
    if (payload.customer_id) {
      const { data: customer } = await supabase
        .from('customers')
        .select('merchant_id')
        .eq('id', payload.customer_id)
        .single();

      if (customer) {
        await supabase.from('provider_events').insert({
          merchant_id: customer.merchant_id,
          provider: 'subscription_service',
          event_type: payload.event,
          payload: payload as any,
        });
      }
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Webhook processed' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
