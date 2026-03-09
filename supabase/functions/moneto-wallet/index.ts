import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Moneto API Configuration
const MONETO_BASE_URL = Deno.env.get('MONETO_BASE_URL') || 'https://demo.genwin.app';
const MONETO_PAYMENT_URL = Deno.env.get('MONETO_PAYMENT_URL') || 'https://pay-demo.genwin.net';
const MONETO_MERCHANT_ID = Deno.env.get('MONETO_MERCHANT_ID') || '8d40edb9-0a8e-5496-aa57-3d4672bf0cba';
const MONETO_MERCHANT_SECRET = Deno.env.get('MONETO_MERCHANT_SECRET') || 'sk_sandbox_ebQbSqK300GiCUxr5aPbC4LWDZ8Q096eTHhdQKzMRS5Z4pOx5jIY8HG2sby7N4ECpFiqYlxYBiNe073rUwSLf6HbJnOrkKNI';

interface PaymentRequest {
  amount: number;
  currency_code: string;
  country_code: string;
  success_url: string;
  cancel_url: string;
  first_name: string;
  last_name: string;
  email?: string;
}

interface PayoutRequest {
  amount: number;
  currency_code: string;
  country_code: string;
  bank_account: {
    institution_number: string;
    transit_number: string;
    account_number: string;
    account_holder_name: string;
  };
  description?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Get merchant
    const { data: merchant, error: merchantError } = await supabase
      .from('merchants')
      .select('id, webhook_url')
      .eq('user_id', user.id)
      .single();

    if (merchantError || !merchant) {
      throw new Error('Merchant not found');
    }

    const url = new URL(req.url);
    const action = url.searchParams.get('action');

    const basicAuth = btoa(`${MONETO_MERCHANT_ID}:${MONETO_MERCHANT_SECRET}`);

    switch (action) {
      case 'create-payment': {
        const data: PaymentRequest = await req.json();
        
        const response = await fetch(`${MONETO_BASE_URL}/wallet/integration-api/pay-requests`, {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${basicAuth}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount: data.amount,
            currency_code: data.currency_code,
            country_code: data.country_code,
            callback: {
              success_url: data.success_url,
              cancel_url: data.cancel_url,
            },
            metadata: {
              first_name: data.first_name,
              last_name: data.last_name,
              email: data.email,
            },
          }),
        });

        if (!response.ok) {
          const error = await response.text();
          throw new Error(`Moneto API failed: ${error}`);
        }

        const result = await response.json();
        const paymentRequestId = result._id;

        // Store transaction record
        await supabase.from('transactions').insert({
          merchant_id: merchant.id,
          amount: data.amount,
          currency: data.currency_code,
          provider: 'moneto',
          status: 'pending',
          provider_ref: paymentRequestId,
          customer_email: data.email,
          description: `Moneto Wallet Payment`,
        });

        // Log provider event
        await supabase.from('provider_events').insert({
          merchant_id: merchant.id,
          provider: 'moneto',
          event_type: 'payment.created',
          payload: result,
        });

        return new Response(
          JSON.stringify({
            success: true,
            payment_request_id: paymentRequestId,
            payment_url: `${MONETO_PAYMENT_URL}/pay-merchant?payment_request_id=${paymentRequestId}`,
            raw: result,
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'validate-payment': {
        const { payment_request_id } = await req.json();

        const response = await fetch(
          `${MONETO_BASE_URL}/wallet/integration-api/pay-requests/${payment_request_id}`,
          {
            method: 'GET',
            headers: {
              'Authorization': `Basic ${basicAuth}`,
            },
          }
        );

        if (!response.ok) {
          const error = await response.text();
          throw new Error(`Moneto API failed: ${error}`);
        }

        const result = await response.json();

        // Update transaction status
        const status = result.status === 'succeeded' ? 'completed' : 
                       result.status === 'failed' ? 'failed' : 'pending';

        await supabase
          .from('transactions')
          .update({ status })
          .eq('provider_ref', payment_request_id)
          .eq('provider', 'moneto');

        // Log provider event
        await supabase.from('provider_events').insert({
          merchant_id: merchant.id,
          provider: 'moneto',
          event_type: `payment.${status}`,
          payload: result,
        });

        return new Response(
          JSON.stringify({
            success: true,
            status: result.status,
            raw: result,
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'create-payout': {
        const data: PayoutRequest = await req.json();

        // Note: Moneto payout API endpoint - using simulated response for now
        // In production, this would hit the actual Moneto payout endpoint
        const payoutId = `payout_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // Store payout record (we'd need a payouts table for this)
        await supabase.from('provider_events').insert({
          merchant_id: merchant.id,
          provider: 'moneto',
          event_type: 'payout.created',
          payload: {
            payout_id: payoutId,
            amount: data.amount,
            currency: data.currency_code,
            bank_account: {
              ...data.bank_account,
              account_number: `****${data.bank_account.account_number.slice(-4)}`,
            },
            status: 'processing',
          },
        });

        // Update account balance (deduct from available)
        const { data: accounts } = await supabase
          .from('accounts')
          .select('*')
          .eq('merchant_id', merchant.id)
          .eq('currency', data.currency_code)
          .single();

        if (accounts && accounts.available_balance >= data.amount) {
          await supabase
            .from('accounts')
            .update({
              available_balance: accounts.available_balance - data.amount,
              pending_balance: accounts.pending_balance + data.amount,
            })
            .eq('id', accounts.id);
        }

        return new Response(
          JSON.stringify({
            success: true,
            payout_id: payoutId,
            status: 'processing',
            message: 'Payout initiated successfully',
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'get-wallets': {
        // Fetch merchant accounts/wallets
        const { data: accounts, error } = await supabase
          .from('accounts')
          .select('*')
          .eq('merchant_id', merchant.id);

        if (error) throw error;

        return new Response(
          JSON.stringify({
            success: true,
            wallets: accounts || [],
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error) {
    console.error('Moneto wallet error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: error instanceof Error && error.message === 'Unauthorized' ? 401 : 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
