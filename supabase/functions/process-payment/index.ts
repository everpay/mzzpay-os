import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface PaymentRequest {
  amount: number;
  currency: string;
  paymentMethod: 'card' | 'pix' | 'boleto' | 'apple_pay' | 'open_banking' | 'openbanking' | 'crypto';
  customerEmail?: string;
  description?: string;
  idempotencyKey?: string;
  /** Force a brand-new attempt even if the idempotency key already has a cached response (used by the retry overlay after a decline). */
  retry?: boolean;
  /**
   * VGS POLICY: Card data is sent DIRECTLY to the processor (Mondo / MzzPay).
   * VGS is ONLY used to vault cards when the merchant intends to charge again
   * later (recurring billing, saved card-on-file). Set `saveCard: true` to
   * opt-in. Live one-off payments must NEVER be proxied through VGS.
   */
  saveCard?: boolean;
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
    // Normalize 'openbanking' (from web checkout) to 'open_banking' (provider value).
    if ((paymentData as any).paymentMethod === 'openbanking') {
      paymentData.paymentMethod = 'open_banking';
    }
    const { amount, currency, paymentMethod, customerEmail, description, idempotencyKey, cardDetails } = paymentData;

    // Check idempotency — but if the cached response was a decline AND the
    // client is explicitly retrying, bypass the cache and re-run the charge.
    if (idempotencyKey && !paymentData.retry) {
      const { data: existingKey } = await supabase
        .from('idempotency_keys')
        .select('response')
        .eq('key', idempotencyKey)
        .eq('merchant_id', merchant.id)
        .single();

      if (existingKey?.response) {
        const cached: any = existingKey.response;
        const cachedTxStatus = cached?.transaction?.status;
        const cachedFailed = cachedTxStatus === 'failed' || cached?.error;
        if (!cachedFailed) {
          return new Response(
            JSON.stringify(cached),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        // Otherwise fall through and reattempt under the same key.
      }
    }

    // --- Card Velocity Check (3 per day per customer) ---
    const customerIdentifier = customerEmail || cardDetails?.number?.slice(-4) || 'anonymous';
    if (paymentMethod === 'card') {
      const today = new Date().toISOString().split('T')[0];
      const { data: velocityRecord } = await supabase
        .from('card_velocity')
        .select('transaction_count')
        .eq('merchant_id', merchant.id)
        .eq('customer_identifier', customerIdentifier)
        .eq('transaction_date', today)
        .single();

      if (velocityRecord && velocityRecord.transaction_count >= 3) {
        return new Response(
          JSON.stringify({ 
            error: 'Card velocity limit exceeded: maximum 3 card transactions per day per customer',
            velocityLimit: true 
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // --- Transaction Limits Check ($5 - $1000) ---
    if (amount < 5 || amount > 1000) {
      return new Response(
        JSON.stringify({ 
          error: `Transaction amount must be between $5.00 and $1,000.00. Received: $${amount.toFixed(2)}`,
          limitError: true 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let provider = 'mzzpay';
    let providerResponse;
    let vgsVaultPromise = null;

    // VGS is for vaulting only — opt-in via `saveCard` (recurring / card-on-file).
    // One-off payments go straight to the processor; we never proxy live PAN through VGS.
    if (cardDetails && paymentData.saveCard === true) {
      vgsVaultPromise = vaultToVGS(cardDetails);
    }

    // ROUTING POLICY:
    // - CARD payments: ALWAYS routed to MzzPay USD (Mondo card path is disabled).
    // - OPEN_BANKING payments in EUR/GBP: routed to Mondo (OpenBanking endpoint stays enabled).
    // - Everything else: MzzPay USD.
    if (paymentMethod === 'open_banking' && ['EUR', 'GBP'].includes(currency)) {
      provider = 'mondo';
      providerResponse = await processMondoPayment(paymentData);
    } else if (paymentMethod === 'card') {
      // Mondo card processing is disabled — always use MzzPay USD for card transactions.
      provider = 'mzzpay';
      providerResponse = await processMzzPayPayment(paymentData);
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

    // --- Surcharging: pass merchant-defined fees to the customer ---
    let surchargeAmount = 0;
    try {
      const { data: ss } = await supabase
        .from('surcharge_settings')
        .select('*')
        .eq('merchant_id', merchant.id)
        .maybeSingle();
      if (ss?.enabled) {
        const pct = Number(ss.percentage_fee || 0);
        const flat = Number(ss.fixed_fee || 0);
        let calc = (amount * pct) / 100 + flat;
        if (ss.max_fee_cap && calc > Number(ss.max_fee_cap)) calc = Number(ss.max_fee_cap);
        surchargeAmount = parseFloat(calc.toFixed(2));
      }
    } catch (e) {
      console.error('Surcharge lookup failed:', e);
    }
    const totalAmount = parseFloat((amount + surchargeAmount).toFixed(2));

    // Map provider status to our status
    let txStatus = 'pending';
    const ps = (providerResponse.status || providerResponse.transaction_status || '').toUpperCase();
    if (['APPROVED', 'COMPLETED', 'SUCCESS'].includes(ps)) txStatus = 'completed';
    else if (['DECLINED', 'FAILED', 'REJECTED', 'ERROR'].includes(ps)) txStatus = 'failed';
    else if (['REDIRECT', 'PENDING', '3DS', 'PROCESSING', 'INITIATED'].includes(ps)) txStatus = 'processing';

    // Surface processor error code/message + raw response on the transaction row
    const procErrorMessage =
      providerResponse?.error?.message ||
      providerResponse?.gateway_message ||
      providerResponse?.message ||
      null;
    const procErrorCode =
      providerResponse?.error?.code ||
      providerResponse?.code ||
      providerResponse?.gateway_code ||
      null;

    const { data: transaction, error: txError } = await supabase
      .from('transactions')
      .insert({
        merchant_id: merchant.id,
        amount,
        surcharge_amount: surchargeAmount,
        total_amount: totalAmount,
        currency,
        provider,
        status: txStatus,
        customer_email: customerEmail,
        description,
        idempotency_key: idempotencyKey,
        provider_ref: providerResponse.id?.toString() || providerResponse.transaction_id || providerResponse.transaction_reference,
        fx_rate: fxRate,
        settlement_amount: settlementAmount,
        settlement_currency: settlementCurrency,
        billing_address: paymentData.billing || null,
        customer_phone: paymentData.customer?.phone || null,
        customer_first_name: paymentData.customer?.first || null,
        customer_last_name: paymentData.customer?.last || null,
        customer_ip: paymentData.customer?.ip || null,
        customer_country: paymentData.billing?.country || null,
        processor_error_code: txStatus === 'failed' ? procErrorCode : null,
        processor_error_message: txStatus === 'failed' ? procErrorMessage : null,
        processor_raw_response: providerResponse,
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

    // --- Rolling Reserve (10% held for 180 days) ---
    if (txStatus === 'completed' || txStatus === 'processing') {
      const reserveAmount = amount * 0.10;
      await supabase.from('rolling_reserves').insert({
        merchant_id: merchant.id,
        transaction_id: transaction.id,
        amount: reserveAmount,
        currency,
        reserve_percent: 10,
        status: 'held',
      });
      console.log(`Rolling reserve: ${reserveAmount} ${currency} held for tx ${transaction.id}`);
    }

    // --- Update Card Velocity ---
    if (paymentMethod === 'card') {
      const today = new Date().toISOString().split('T')[0];
      const cardLast4 = cardDetails?.number?.slice(-4) || null;
      
      const { data: existingVelocity } = await supabase
        .from('card_velocity')
        .select('id, transaction_count')
        .eq('merchant_id', merchant.id)
        .eq('customer_identifier', customerIdentifier)
        .eq('transaction_date', today)
        .single();

      if (existingVelocity) {
        await supabase
          .from('card_velocity')
          .update({ transaction_count: existingVelocity.transaction_count + 1 })
          .eq('id', existingVelocity.id);
      } else {
        await supabase.from('card_velocity').insert({
          merchant_id: merchant.id,
          customer_identifier: customerIdentifier,
          card_last4: cardLast4,
          provider,
          transaction_date: today,
          transaction_count: 1,
        });
      }
    }

    // Store / refresh idempotency response (upsert so retries overwrite a previous decline)
    if (idempotencyKey) {
      await supabase.from('idempotency_keys').upsert({
        merchant_id: merchant.id,
        key: idempotencyKey,
        response: { transaction, providerResponse },
      }, { onConflict: 'merchant_id,key' });
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

  // Pull processor-level acquirer config (Mexico / descriptor / 3DS / etc.)
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );
  const { data: processor } = await supabase
    .from('payment_processors')
    .select('acquirer_country, acquirer_descriptor, default_currency, flow_type, supported_brands')
    .eq('name', 'shieldhub')
    .maybeSingle();

  const descriptor = processor?.acquirer_descriptor ?? 'AXP*FER*AXP*FERES';
  const acquirerCountry = processor?.acquirer_country ?? 'MX';
  const wants3ds = (processor?.flow_type ?? '3DS').toUpperCase().includes('3DS');

  const body: any = {
    amount: amountStr,
    currency: data.currency,
    transaction_reference: transactionReference,
    redirectback_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/payment-link-webhook`,
    notification_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/payment-link-webhook`,
    // Acquirer / descriptor metadata. EVERPAY 3D PTY · MX · AXP*FER*AXP*FERES.
    descriptor,
    soft_descriptor: descriptor,
    statement_descriptor: descriptor,
    acquirer_country: acquirerCountry,
    // Request 3DS when issuer is enrolled, fall back to 2D otherwise. The
    // gateway interprets `three_ds: 'enrolled'` as "step up if enrolled".
    three_ds: wants3ds ? 'enrolled' : 'off',
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

  console.log('Shieldhub request:', {
    endpoint: 'https://pgw.shieldhubpay.com/api/transaction',
    clientId, transactionReference, three_ds: body.three_ds, descriptor,
  });

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
  console.log('Shieldhub response:', responseText);

  let parsed: any;
  try {
    parsed = JSON.parse(responseText);
  } catch {
    throw new Error(`Shieldhub API returned invalid JSON: ${responseText}`);
  }

  if (!response.ok || parsed.status === 'Declined' || parsed.status === 'Failed') {
    const msg = parsed.error?.message || parsed.message || `HTTP ${response.status}`;
    return {
      status: 'FAILED',
      error: { message: `Shieldhub: ${msg}` },
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

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;

  const body: any = {
    company_account_id: accountId,
    gateway_secret_key: gatewaySecret,
    live_or_sandbox: 'sandbox',
    transaction_amount: data.amount.toString(),
    transaction_currency_iso3: data.currency,
    cardholder_email_address: data.customerEmail || 'noreply@everpay.io',
    order_description: data.description || 'Payment',
    partner_return_url_completed: `${supabaseUrl}/functions/v1/mondo-webhook?status=completed`,
    partner_return_url_rejected: `${supabaseUrl}/functions/v1/mondo-webhook?status=rejected`,
    partner_return_url_canceled: `${supabaseUrl}/functions/v1/mondo-webhook?status=canceled`,
  };

  if (data.paymentMethod === 'card' && data.cardDetails) {
    body.payment_method = 'CARD';
    body.card_number = data.cardDetails.number.replace(/\s/g, '');
    body.card_expiration_month = data.cardDetails.expMonth.padStart(2, '0');
    body.card_expiration_year = data.cardDetails.expYear.length === 4 ? data.cardDetails.expYear : `20${data.cardDetails.expYear}`;
    body.card_security_code = data.cardDetails.cvc;
    body.cardholder_full_name = data.cardDetails.holderName || `${data.customer?.first || 'Test'} ${data.customer?.last || 'User'}`;
    body.cardholder_telephone_country_iso3 = data.billing?.country || 'USA';
    body.cardholder_telephone_number = data.customer?.phone || '0000000000';
    body.cardholder_birth_year = '1990';
    body.cardholder_birth_month = '01';
    body.cardholder_birth_day = '01';
    body.cardholder_citizenship_country_iso3 = data.billing?.country || 'USA';
  } else if (data.paymentMethod === 'apple_pay') {
    body.payment_method = 'APPLEPAY';
  } else if (data.paymentMethod === 'open_banking') {
    body.payment_method = 'OPENBANKING';
    const openbankingKey = Deno.env.get('MONDO_OPENBANKING_API_KEY');
    if (openbankingKey) body.openbanking_key = openbankingKey;
  }

  if (data.billing) {
    body.billing_address = data.billing.address || '123 Main St';
    body.billing_postal_code = data.billing.postal_code || '10001';
    body.billing_city = data.billing.city || 'New York';
    body.billing_country_iso2 = data.billing.country || 'US';
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
