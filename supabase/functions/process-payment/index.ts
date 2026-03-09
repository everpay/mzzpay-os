import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PaymentRequest {
  amount: number;
  currency: string;
  paymentMethod: 'card' | 'pix' | 'boleto' | 'apple_pay' | 'open_banking';
  customerEmail?: string;
  description?: string;
  idempotencyKey?: string;
  cardDetails?: {
    number: string;
    expMonth: string;
    expYear: string;
    cvc: string;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
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
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (merchantError || !merchant) {
      throw new Error('Merchant not found');
    }

    const paymentData: PaymentRequest = await req.json();
    const { amount, currency, paymentMethod, customerEmail, description, idempotencyKey, cardDetails } = paymentData;

    // Check idempotency
    if (idempotencyKey) {
      const { data: existingKey } = await supabase
        .from('idempotency_keys')
        .select('response')
        .eq('key', idempotencyKey)
        .eq('merchant_id', merchant.id)
        .single();

      if (existingKey?.response) {
        return new Response(
          JSON.stringify(existingKey.response),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Determine provider and route payment
    let provider = 'stripe';
    let providerResponse;

    if (['BRL', 'MXN', 'COP'].includes(currency)) {
      provider = 'facilitapay';
      providerResponse = await processShieldHubPayment(paymentData);
    } else if (['EUR', 'GBP'].includes(currency)) {
      provider = 'mondo';
      providerResponse = await processMondoPayment(paymentData);
    } else {
      provider = 'stripe';
      providerResponse = await processStripePayment(paymentData);
    }

    // Calculate FX if needed
    let fxRate = null;
    let settlementAmount = amount;
    let settlementCurrency = currency;

    if (['BRL', 'MXN', 'COP'].includes(currency)) {
      fxRate = await getFxRate(currency, 'USD');
      settlementAmount = amount * fxRate;
      settlementCurrency = 'USD';
    }

    // Create transaction
    const { data: transaction, error: txError } = await supabase
      .from('transactions')
      .insert({
        merchant_id: merchant.id,
        amount,
        currency,
        provider,
        status: providerResponse.status,
        customer_email: customerEmail,
        description,
        idempotency_key: idempotencyKey,
        provider_ref: providerResponse.id,
        fx_rate: fxRate,
        settlement_amount: settlementAmount,
        settlement_currency: settlementCurrency,
      })
      .select()
      .single();

    if (txError) throw txError;

    // Log provider event
    await supabase.from('provider_events').insert({
      merchant_id: merchant.id,
      transaction_id: transaction.id,
      provider,
      event_type: 'payment.created',
      payload: providerResponse,
    });

    // Enrich with Tapix if card payment
    if (cardDetails) {
      try {
        const tapixData = await enrichWithTapix(cardDetails.number, amount);
        if (tapixData) {
          await supabase.from('provider_events').insert({
            merchant_id: merchant.id,
            transaction_id: transaction.id,
            provider: 'tapix',
            event_type: 'enrichment.completed',
            payload: tapixData,
          });
        }
      } catch (e) {
        console.error('Tapix enrichment failed:', e);
      }
    }

    // Store idempotency response
    if (idempotencyKey) {
      await supabase.from('idempotency_keys').insert({
        merchant_id: merchant.id,
        key: idempotencyKey,
        response: { transaction },
      });
    }

    return new Response(
      JSON.stringify({ success: true, transaction }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing payment:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: error instanceof Error && error.message === 'Unauthorized' ? 401 : 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function processShieldHubPayment(data: PaymentRequest) {
  const clientId = Deno.env.get('SHIELDHUB_CLIENT_ID');
  const apiSecret = Deno.env.get('SHIELDHUB_API_SECRET');

  const response = await fetch('https://api.shieldhubpay.com/v1/payments', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${btoa(`${clientId}:${apiSecret}`)}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: data.amount,
      currency: data.currency,
      payment_method: data.paymentMethod,
      customer_email: data.customerEmail,
      description: data.description,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`ShieldHub API failed: ${error}`);
  }

  return await response.json();
}

async function processMondoPayment(data: PaymentRequest) {
  const gatewaySecret = Deno.env.get('MONDO_GATEWAY_SECRET_KEY');
  const accountId = Deno.env.get('MONDO_ACCOUNT_ID');

  let endpoint = 'https://api.getmondo.co/v1/payments';
  let body: any = {
    amount: data.amount,
    currency: data.currency,
    account_id: accountId,
    customer_email: data.customerEmail,
    description: data.description,
  };

  if (data.paymentMethod === 'card' && data.cardDetails) {
    endpoint = 'https://api.getmondo.co/v1/cards/charge';
    body = {
      ...body,
      card: {
        number: data.cardDetails.number,
        exp_month: data.cardDetails.expMonth,
        exp_year: data.cardDetails.expYear,
        cvc: data.cardDetails.cvc,
      },
    };
  } else if (data.paymentMethod === 'apple_pay') {
    endpoint = 'https://api.getmondo.co/v1/apple-pay/charge';
  } else if (data.paymentMethod === 'open_banking') {
    const openbankingKey = Deno.env.get('MONDO_OPENBANKING_API_KEY');
    endpoint = 'https://api.getmondo.co/v1/open-banking/payments';
    body.openbanking_key = openbankingKey;
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${gatewaySecret}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Mondo API failed: ${error}`);
  }

  return await response.json();
}

async function processStripePayment(data: PaymentRequest) {
  // Placeholder for Stripe integration
  return {
    id: `stripe_${Date.now()}`,
    status: 'succeeded',
    amount: data.amount,
    currency: data.currency,
  };
}

async function getFxRate(fromCurrency: string, toCurrency: string): Promise<number> {
  // Simplified FX rates
  const rates: Record<string, number> = {
    'BRL': 0.20,
    'MXN': 0.058,
    'COP': 0.00026,
  };
  return rates[fromCurrency] || 1;
}

async function enrichWithTapix(cardNumber: string, amount: number) {
  const tapixToken = Deno.env.get('TAPIX_TOKEN');
  if (!tapixToken) return null;

  try {
    const response = await fetch('https://api.tapix.io/v1/enrich', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tapixToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        card_number: cardNumber,
        amount: amount || 0,
      }),
    });

    if (!response.ok) return null;
    return await response.json();
  } catch (e) {
    console.error('Tapix enrichment error:', e);
    return null;
  }
}
