import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
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
    holderName?: string;
  };
  customer?: {
    first?: string;
    last?: string;
    phone?: string;
    ip?: string;
  };
  billing?: {
    address?: string;
    postal_code?: string;
    city?: string;
    state?: string;
    country?: string;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

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

    let provider = 'mzzpay';
    let providerResponse;
    let vgsVaultPromise = null;

    if (cardDetails) {
      vgsVaultPromise = vaultToVGS(cardDetails);
    }

    if (['EUR', 'GBP'].includes(currency)) {
      provider = 'mondo';
      providerResponse = await processMondoPayment(paymentData);
    } else {
      provider = 'mzzpay';
      providerResponse = await processMzzPayPayment(paymentData);
    }

    let vgsVaultResult = null;
    if (vgsVaultPromise) {
      try {
        vgsVaultResult = await vgsVaultPromise;
      } catch (e) {
        console.error('VGS vaulting failed:', e);
      }
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

    // Map provider status to our status
    let txStatus = 'pending';
    const ps = (providerResponse.status || providerResponse.transaction_status || '').toUpperCase();
    if (['APPROVED', 'COMPLETED', 'SUCCESS'].includes(ps)) txStatus = 'completed';
    else if (['DECLINED', 'FAILED', 'REJECTED', 'ERROR'].includes(ps)) txStatus = 'failed';
    else if (['REDIRECT', 'PENDING', '3DS', 'PROCESSING'].includes(ps)) txStatus = 'processing';

    const { data: transaction, error: txError } = await supabase
      .from('transactions')
      .insert({
        merchant_id: merchant.id,
        amount,
        currency,
        provider,
        status: txStatus,
        customer_email: customerEmail,
        description,
        idempotency_key: idempotencyKey,
        provider_ref: providerResponse.id?.toString() || providerResponse.transaction_reference,
        fx_rate: fxRate,
        settlement_amount: settlementAmount,
        settlement_currency: settlementCurrency,
      })
      .select()
      .single();

    if (txError) throw txError;

    await supabase.from('provider_events').insert({
      merchant_id: merchant.id,
      transaction_id: transaction.id,
      provider,
      event_type: 'payment.created',
      payload: providerResponse,
    });

    // Store idempotency response
    if (idempotencyKey) {
      await supabase.from('idempotency_keys').insert({
        merchant_id: merchant.id,
        key: idempotencyKey,
        response: { transaction },
      });
    }

    return new Response(
      JSON.stringify({ success: true, transaction, providerResponse }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing payment:', error);
    const message = error instanceof Error ? error.message 
      : (typeof error === 'object' && error !== null) ? JSON.stringify(error)
      : String(error);
    const status = message === 'Unauthorized' ? 401 : 500;
    return new Response(
      JSON.stringify({ error: message }),
      { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function processMzzPayPayment(data: PaymentRequest) {
  const clientId = Deno.env.get('SHIELDHUB_CLIENT_ID')!;
  const apiSecret = Deno.env.get('SHIELDHUB_API_SECRET')!;

  const transactionReference = crypto.randomUUID();
  const amountStr = data.amount.toString();

  // Hash = SHA256(clientId + amount + transaction_reference + apiSecret)
  const hashInput = clientId + amountStr + transactionReference + apiSecret;
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(hashInput));
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const clientHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  const body: any = {
    amount: amountStr,
    currency: data.currency,
    transaction_reference: transactionReference,
    redirectback_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/payment-link-webhook`,
    notification_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/payment-link-webhook`,
    customer: {
      first: data.customer?.first || data.customerEmail?.split('@')[0] || 'Customer',
      last: data.customer?.last || 'N/A',
      email: data.customerEmail || 'noreply@everpay.io',
      phone: data.customer?.phone || '0000000000',
      ip: data.customer?.ip || '0.0.0.0',
    },
    billing: {
      address: data.billing?.address || '123 Main St',
      postal_code: data.billing?.postal_code || '10001',
      city: data.billing?.city || 'New York',
      state: data.billing?.state || 'NY',
      country: data.billing?.country || 'US',
    },
  };

  if (data.cardDetails) {
    body.card = {
      holder: data.cardDetails.holderName || `${body.customer.first} ${body.customer.last}`,
      number: data.cardDetails.number.replace(/\s/g, ''),
      cvv: data.cardDetails.cvc,
      expiry_month: data.cardDetails.expMonth.padStart(2, '0'),
      expiry_year: data.cardDetails.expYear.length === 4 ? data.cardDetails.expYear.slice(-2) : data.cardDetails.expYear,
    };
  }

  console.log('MzzPay request:', { endpoint: 'https://pgw.shieldhubpay.com/api/transaction', clientId, transactionReference });

  const response = await fetch('https://pgw.shieldhubpay.com/api/transaction', {
    method: 'POST',
    headers: {
      'client-id': clientId,
      'client-hash': clientHash,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const responseText = await response.text();
  console.log('MzzPay response:', responseText);

  let parsed: any;
  try {
    parsed = JSON.parse(responseText);
  } catch {
    throw new Error(`MzzPay USD API returned invalid JSON: ${responseText}`);
  }

  if (!response.ok || parsed.status === 'Declined' || parsed.status === 'Failed') {
    const msg = parsed.error?.message || parsed.message || `HTTP ${response.status}`;
    return {
      status: 'FAILED',
      error: { message: `MzzPay USD: ${msg}` },
      ...parsed,
    };
  }

  return parsed;
}

async function processMondoPayment(data: PaymentRequest) {
  const gatewaySecret = Deno.env.get('MONDO_GATEWAY_SECRET_KEY');
  const accountId = Deno.env.get('MONDO_ACCOUNT_ID');

  if (!gatewaySecret || !accountId) {
    throw new Error('Mondo credentials not configured (MONDO_GATEWAY_SECRET_KEY, MONDO_ACCOUNT_ID)');
  }

  const endpoint = 'https://server-to-server.getmondo.co/payment/';

  const body: any = {
    company_account_id: accountId,
    gateway_secret_key: gatewaySecret,
    transaction_amount: data.amount.toString(),
    transaction_currency_iso3: data.currency,
    cardholder_email_address: data.customerEmail || 'noreply@everpay.io',
    order_description: data.description || 'Payment',
    url_redirect: `${Deno.env.get('SUPABASE_URL')}/functions/v1/payment-link-webhook`,
    url_callback: `${Deno.env.get('SUPABASE_URL')}/functions/v1/payment-link-webhook`,
  };

  if (data.paymentMethod === 'card' && data.cardDetails) {
    body.payment_method = 'CARD';
    body.card_number = data.cardDetails.number.replace(/\s/g, '');
    body.card_exp_month = data.cardDetails.expMonth.padStart(2, '0');
    body.card_exp_year = data.cardDetails.expYear.length === 4 ? data.cardDetails.expYear : `20${data.cardDetails.expYear}`;
    body.card_cvv2 = data.cardDetails.cvc;
    body.cardholder_name = data.cardDetails.holderName || 'Test User';
  } else if (data.paymentMethod === 'apple_pay') {
    body.payment_method = 'APPLEPAY';
  } else if (data.paymentMethod === 'open_banking') {
    body.payment_method = 'OPENBANKING';
    const openbankingKey = Deno.env.get('MONDO_OPENBANKING_API_KEY');
    if (openbankingKey) body.openbanking_key = openbankingKey;
  }

  if (data.billing) {
    body.billing_address = data.billing.address || '';
    body.billing_postal_code = data.billing.postal_code || '';
    body.billing_city = data.billing.city || '';
    body.billing_country_iso2 = data.billing.country || '';
  }

  console.log('Mondo request:', { endpoint, accountId, payment_method: body.payment_method, currency: body.transaction_currency_iso3 });

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const responseText = await response.text();
  console.log('Mondo response:', responseText);

  let parsed: any;
  try {
    parsed = JSON.parse(responseText);
  } catch {
    throw new Error(`Mondo API returned invalid JSON: ${responseText}`);
  }

  // Mondo returns 200 even on declines; also handle HTTP errors gracefully
  if (!response.ok || parsed.transaction_status === 'FAILED') {
    const msg = parsed.gateway_message || parsed.error || `HTTP ${response.status}`;
    // Return a structured decline instead of throwing
    return {
      status: 'FAILED',
      transaction_status: 'FAILED',
      error: { message: `MzzPay EUR: ${msg}` },
      gateway_message: msg,
      ...parsed,
    };
  }

  return parsed;
}

async function vaultToVGS(cardDetails: { number: string; expMonth: string; expYear: string; cvc: string }) {
  const vgsVaultId = Deno.env.get('VGS_VAULT_ID');
  const vgsUsername = Deno.env.get('VGS_USERNAME');
  const vgsPassword = Deno.env.get('VGS_PASSWORD');
  const vgsEnvironment = Deno.env.get('VGS_ENVIRONMENT') || 'sandbox';

  if (!vgsVaultId || !vgsUsername || !vgsPassword) {
    console.log('VGS credentials not configured, skipping vaulting');
    return null;
  }

  try {
    const response = await fetch(`https://${vgsVaultId}.${vgsEnvironment}.verygoodproxy.com/post`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`${vgsUsername}:${vgsPassword}`)}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        card_number: cardDetails.number,
        card_cvc: cardDetails.cvc,
        card_exp: `${cardDetails.expMonth}/${cardDetails.expYear}`,
      }),
    });

    if (!response.ok) {
      console.error('VGS vault response not ok:', response.status);
      return null;
    }

    return await response.json();
  } catch (e) {
    console.error('VGS vault error:', e);
    return null;
  }
}

async function getFxRate(fromCurrency: string, _toCurrency: string): Promise<number> {
  const rates: Record<string, number> = {
    'BRL': 0.20,
    'MXN': 0.058,
    'COP': 0.00026,
  };
  return rates[fromCurrency] || 1;
}
