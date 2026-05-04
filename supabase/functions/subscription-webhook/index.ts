import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { verifyHmacSignature } from '../_shared/verify-webhook.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-signature',
};

interface WebhookPayload {
  event: string;
  subscription_id: string;
  customer_id?: string;
  status?: string;
  current_period_end?: string;
  canceled_at?: string;
  payment_failed?: boolean;
  failure_reason?: string;
  amount?: number;
  currency?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const rawBody = await req.text();
    const verify = await verifyHmacSignature({
      secret: Deno.env.get('SUBSCRIPTION_WEBHOOK_SECRET') ?? Deno.env.get('INTERNAL_WEBHOOK_SECRET'),
      body: rawBody,
      signature: req.headers.get('x-webhook-signature'),
      requireSecret: true,
    });
    if (!verify.ok) {
      console.warn('[subscription-webhook] signature failure:', verify.reason);
      return new Response(JSON.stringify({ error: 'unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const payload: WebhookPayload = JSON.parse(rawBody);
    console.log('Webhook received:', payload);

    // Resolve merchant for event logging and alerts
    let merchantId: string | null = null;
    let customerEmail: string | null = null;
    if (payload.customer_id) {
      const { data: customer } = await supabase
        .from('customers')
        .select('merchant_id, email')
        .eq('id', payload.customer_id)
        .single();
      merchantId = customer?.merchant_id ?? null;
      customerEmail = customer?.email ?? null;
    }

    // Handle different subscription events
    switch (payload.event) {
      case 'subscription.created': {
        console.log('New subscription created:', payload.subscription_id);
        // Send welcome email
        if (customerEmail) {
          await supabase.functions.invoke('send-transactional-email', {
            body: {
              templateName: 'subscription-created',
              recipientEmail: customerEmail,
              idempotencyKey: `sub-created-${payload.subscription_id}`,
              templateData: { subscription_id: payload.subscription_id },
            },
          }).catch((e: Error) => console.error('Email send failed:', e));
        }
        break;
      }

      case 'subscription.updated':
      case 'subscription.renewed': {
        const periodEnd = payload.current_period_end || new Date(
          Date.now() + 30 * 24 * 60 * 60 * 1000
        ).toISOString();

        const { error } = await supabase
          .from('subscriptions')
          .update({
            status: payload.status || 'active',
            current_period_start: new Date().toISOString(),
            current_period_end: periodEnd,
            updated_at: new Date().toISOString(),
          })
          .eq('id', payload.subscription_id);

        if (error) {
          console.error('Error updating subscription:', error);
          throw error;
        }

        // Send renewal confirmation email
        if (customerEmail) {
          await supabase.functions.invoke('send-transactional-email', {
            body: {
              templateName: 'subscription-renewed',
              recipientEmail: customerEmail,
              idempotencyKey: `sub-renewed-${payload.subscription_id}-${periodEnd}`,
              templateData: {
                subscription_id: payload.subscription_id,
                next_billing_date: periodEnd,
              },
            },
          }).catch((e: Error) => console.error('Email send failed:', e));
        }

        console.log('Subscription renewed:', payload.subscription_id);
        break;
      }

      case 'subscription.canceled': {
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

        // Notify customer of cancellation
        if (customerEmail) {
          await supabase.functions.invoke('send-transactional-email', {
            body: {
              templateName: 'subscription-canceled',
              recipientEmail: customerEmail,
              idempotencyKey: `sub-canceled-${payload.subscription_id}`,
              templateData: { subscription_id: payload.subscription_id },
            },
          }).catch((e: Error) => console.error('Email send failed:', e));
        }

        console.log('Subscription canceled:', payload.subscription_id);
        break;
      }

      case 'subscription.payment_failed': {
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

        // Trigger dunning: invoke retry-payment to schedule automatic retries
        // based on the merchant's retry_settings. This is fire-and-forget; the
        // retry function handles backoff timing and max-attempt enforcement.
        await supabase.functions.invoke('retry-payment', {
          body: { subscription_id: payload.subscription_id },
        }).catch((e: Error) => console.error('Dunning trigger failed:', e));

        // Send payment-failed alert to customer
        if (customerEmail) {
          await supabase.functions.invoke('subscription-alerts', {
            body: {
              type: 'payment_failed',
              subscription_id: payload.subscription_id,
              customer_email: customerEmail,
              failure_reason: payload.failure_reason,
            },
          }).catch((e: Error) => console.error('Alert send failed:', e));
        }

        console.log('Payment failed for subscription:', payload.subscription_id);
        break;
      }

      case 'subscription.trial_ending': {
        // Send trial ending reminder (typically 3 days before)
        if (customerEmail) {
          await supabase.functions.invoke('subscription-alerts', {
            body: {
              type: 'trial_ending',
              subscription_id: payload.subscription_id,
              customer_email: customerEmail,
            },
          }).catch((e: Error) => console.error('Alert send failed:', e));
        }
        console.log('Trial ending for subscription:', payload.subscription_id);
        break;
      }

      default:
        console.log('Unhandled event type:', payload.event);
    }

    // Log the event for audit trail
    if (merchantId) {
      await supabase.from('provider_events').insert({
        merchant_id: merchantId,
        provider: 'subscription_service',
        event_type: payload.event,
        payload: payload as any,
      });
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Webhook processed' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
