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
    const { event, payment_request_id, status, amount, currency, metadata } = payload;

    console.log(`Moneto webhook received: ${event}`, { payment_request_id, status });

    // Validate required fields
    if (!event) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: event' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find the transaction by provider_ref
    const { data: transaction } = await supabase
      .from('transactions')
      .select('id, merchant_id, amount, currency')
      .eq('provider_ref', payment_request_id)
      .eq('provider', 'moneto')
      .single();

    const merchantId = transaction?.merchant_id || payload.merchant_id;

    // Log the webhook event
    if (merchantId) {
      await supabase.from('provider_events').insert({
        merchant_id: merchantId,
        transaction_id: transaction?.id,
        provider: 'moneto',
        event_type: event,
        payload,
      });
    }

    // Handle different webhook events
    switch (event) {
      case 'payment.succeeded':
      case 'pay_request.succeeded': {
        if (transaction) {
          // Update transaction status
          await supabase
            .from('transactions')
            .update({ status: 'completed' })
            .eq('id', transaction.id);

          // Credit the merchant's account
          const { data: account } = await supabase
            .from('accounts')
            .select('id, balance, available_balance')
            .eq('merchant_id', transaction.merchant_id)
            .eq('currency', transaction.currency)
            .single();

          if (account) {
            await supabase
              .from('accounts')
              .update({
                balance: account.balance + transaction.amount,
                available_balance: account.available_balance + transaction.amount,
              })
              .eq('id', account.id);

            // Create ledger entry
            await supabase.from('ledger_entries').insert({
              transaction_id: transaction.id,
              account_id: account.id,
              entry_type: 'credit',
              amount: transaction.amount,
              currency: transaction.currency,
            });
          } else {
            // Create new account for this currency
            const { data: newAccount } = await supabase
              .from('accounts')
              .insert({
                merchant_id: transaction.merchant_id,
                currency: transaction.currency,
                balance: transaction.amount,
                available_balance: transaction.amount,
              })
              .select()
              .single();

            if (newAccount) {
              await supabase.from('ledger_entries').insert({
                transaction_id: transaction.id,
                account_id: newAccount.id,
                entry_type: 'credit',
                amount: transaction.amount,
                currency: transaction.currency,
              });
            }
          }

          // Forward to merchant webhook
          await forwardToMerchantWebhook(supabase, transaction.merchant_id, {
            event: 'moneto.payment.succeeded',
            transaction_id: transaction.id,
            payment_request_id,
            amount: transaction.amount,
            currency: transaction.currency,
            timestamp: new Date().toISOString(),
          });
        }
        break;
      }

      case 'payment.failed':
      case 'pay_request.failed': {
        if (transaction) {
          await supabase
            .from('transactions')
            .update({ status: 'failed' })
            .eq('id', transaction.id);

          await forwardToMerchantWebhook(supabase, transaction.merchant_id, {
            event: 'moneto.payment.failed',
            transaction_id: transaction.id,
            payment_request_id,
            timestamp: new Date().toISOString(),
          });
        }
        break;
      }

      case 'payout.completed': {
        // Update account balances for payout completion
        if (merchantId) {
          const { data: account } = await supabase
            .from('accounts')
            .select('id, pending_balance')
            .eq('merchant_id', merchantId)
            .eq('currency', currency || 'CAD')
            .single();

          if (account && amount) {
            await supabase
              .from('accounts')
              .update({
                pending_balance: Math.max(0, account.pending_balance - amount),
              })
              .eq('id', account.id);
          }

          await forwardToMerchantWebhook(supabase, merchantId, {
            event: 'moneto.payout.completed',
            payout_id: payload.payout_id,
            amount,
            currency,
            timestamp: new Date().toISOString(),
          });
        }
        break;
      }

      case 'payout.failed': {
        // Reverse the payout - move from pending back to available
        if (merchantId) {
          const { data: account } = await supabase
            .from('accounts')
            .select('id, available_balance, pending_balance')
            .eq('merchant_id', merchantId)
            .eq('currency', currency || 'CAD')
            .single();

          if (account && amount) {
            await supabase
              .from('accounts')
              .update({
                available_balance: account.available_balance + amount,
                pending_balance: Math.max(0, account.pending_balance - amount),
              })
              .eq('id', account.id);
          }

          await forwardToMerchantWebhook(supabase, merchantId, {
            event: 'moneto.payout.failed',
            payout_id: payload.payout_id,
            amount,
            currency,
            reason: payload.failure_reason,
            timestamp: new Date().toISOString(),
          });
        }
        break;
      }

      default:
        console.log(`Unhandled Moneto event: ${event}`);
    }

    return new Response(
      JSON.stringify({ received: true, event }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Moneto webhook error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
      console.log(`Webhook forwarded to ${merchant.webhook_url}`);
    }
  } catch (e) {
    console.error('Merchant webhook delivery failed:', e);
  }
}
