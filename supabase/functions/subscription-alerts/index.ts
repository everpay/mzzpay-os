import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AlertPayload {
  type: 'renewal_reminder' | 'payment_failed' | 'cancellation_confirmed' | 'trial_ending';
  subscription_id: string;
  customer_email: string;
  customer_name?: string;
  plan_name?: string;
  amount?: number;
  currency?: string;
  renewal_date?: string;
  retry_attempt?: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const payload: AlertPayload = await req.json();
    console.log('Alert request:', payload);

    const { type, subscription_id, customer_email, customer_name, plan_name, amount, currency, renewal_date, retry_attempt } = payload;

    // Get subscription details if not provided
    let subDetails = { customer_email, customer_name, plan_name, amount, currency, renewal_date };
    if (!plan_name) {
      const { data: sub } = await supabase
        .from('subscriptions')
        .select(`
          *,
          customer:customers(email, first_name, last_name),
          plan:subscription_plans(name, amount, currency)
        `)
        .eq('id', subscription_id)
        .single();

      if (sub) {
        subDetails = {
          customer_email: sub.customer?.email || customer_email,
          customer_name: sub.customer ? `${sub.customer.first_name || ''} ${sub.customer.last_name || ''}`.trim() : customer_name,
          plan_name: sub.plan?.name || plan_name,
          amount: sub.plan?.amount || amount,
          currency: sub.plan?.currency || currency,
          renewal_date: sub.current_period_end || renewal_date,
        };
      }
    }

    // Build email content based on event type
    const emailTemplates: Record<AlertPayload['type'], { subject: string; body: string }> = {
      renewal_reminder: {
        subject: `Your ${subDetails.plan_name} subscription renews soon`,
        body: `Hi ${subDetails.customer_name || 'there'},\n\nYour ${subDetails.plan_name} subscription will renew on ${subDetails.renewal_date ? new Date(subDetails.renewal_date).toLocaleDateString() : 'upcoming date'} for ${subDetails.currency} ${subDetails.amount}.\n\nNo action needed — we'll charge your card on file automatically.\n\nTo manage your subscription, visit your customer portal.`,
      },
      payment_failed: {
        subject: `Payment failed for your ${subDetails.plan_name} subscription`,
        body: `Hi ${subDetails.customer_name || 'there'},\n\nWe were unable to process your payment for the ${subDetails.plan_name} plan${retry_attempt ? ` (attempt ${retry_attempt})` : ''}.\n\nPlease update your payment method to avoid service interruption.\n\nAmount due: ${subDetails.currency} ${subDetails.amount}`,
      },
      cancellation_confirmed: {
        subject: `Your ${subDetails.plan_name} subscription has been canceled`,
        body: `Hi ${subDetails.customer_name || 'there'},\n\nYour ${subDetails.plan_name} subscription has been canceled. You will continue to have access until ${subDetails.renewal_date ? new Date(subDetails.renewal_date).toLocaleDateString() : 'the end of your billing period'}.\n\nWe hope to see you again!`,
      },
      trial_ending: {
        subject: `Your free trial ends soon`,
        body: `Hi ${subDetails.customer_name || 'there'},\n\nYour free trial for ${subDetails.plan_name} ends on ${subDetails.renewal_date ? new Date(subDetails.renewal_date).toLocaleDateString() : 'soon'}. After that, you'll be charged ${subDetails.currency} ${subDetails.amount}.\n\nTo prevent charges, cancel before the trial ends.`,
      },
    };

    const template = emailTemplates[type];
    console.log(`Sending ${type} alert to ${subDetails.customer_email}`);
    console.log('Subject:', template.subject);
    console.log('Body preview:', template.body.slice(0, 100));

    // Log the alert event
    const { data: customer } = await supabase
      .from('customers')
      .select('merchant_id')
      .eq('email', subDetails.customer_email)
      .single();

    if (customer) {
      await supabase.from('provider_events').insert({
        merchant_id: customer.merchant_id,
        provider: 'subscription_alerts',
        event_type: `alert.${type}`,
        payload: {
          subscription_id,
          customer_email: subDetails.customer_email,
          subject: template.subject,
          sent_at: new Date().toISOString(),
        },
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        alert_type: type,
        recipient: subDetails.customer_email,
        subject: template.subject,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Alert error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
