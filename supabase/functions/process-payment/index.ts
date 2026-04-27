import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { z } from "https://esm.sh/zod@3.23.8";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Strict Zod schema for /api/payments. Validation runs BEFORE we touch any
// processor row or call out to Shieldhub/Mondo so a typed
// `processor_validation_error` is returned with field-level details.
const PaymentMethodEnum = z.enum([
  'card', 'pix', 'boleto', 'apple_pay', 'open_banking', 'openbanking', 'crypto',
]);

const CardDetailsSchema = z.object({
  number: z.string().regex(/^\d{12,19}$/, 'card number must be 12–19 digits'),
  expMonth: z.string().regex(/^(0?[1-9]|1[0-2])$/, 'expMonth must be 1–12'),
  expYear: z.string().regex(/^\d{2,4}$/, 'expYear must be 2 or 4 digits'),
  cvc: z.string().regex(/^\d{3,4}$/, 'cvc must be 3–4 digits'),
  holderName: z.string().min(1).max(120).optional(),
});

const PaymentRequestSchema = z.object({
  amount: z.number().positive().max(1_000_000),
  currency: z.string().length(3).regex(/^[A-Z]{3}$/i, 'currency must be ISO-4217'),
  paymentMethod: PaymentMethodEnum,
  customerEmail: z.string().email().max(255).optional(),
  description: z.string().max(500).optional(),
  idempotencyKey: z.string().min(8).max(120).optional(),
  retry: z.boolean().optional(),
  saveCard: z.boolean().optional(),
  cardDetails: CardDetailsSchema.optional(),
  customer: z.object({
    first: z.string().max(80).optional(),
    last: z.string().max(80).optional(),
    phone: z.string().max(40).optional(),
    ip: z.string().max(64).optional(),
  }).optional(),
  billing: z.object({
    address: z.string().max(255).optional(),
    postal_code: z.string().max(20).optional(),
    city: z.string().max(80).optional(),
    state: z.string().max(80).optional(),
    country: z.string().length(2).optional(),
  }).optional(),
  merchantId: z.string().uuid().optional(),
  orderId: z.string().max(120).optional(),
  successUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional(),
}).refine(
  (v) => v.paymentMethod !== 'card' || !!v.cardDetails,
  { message: 'cardDetails required when paymentMethod is "card"', path: ['cardDetails'] },
);

function validationErrorResponse(zerr: z.ZodError) {
  const fieldErrors = zerr.flatten().fieldErrors;
  const formErrors = zerr.flatten().formErrors;
  const summary = [
    ...formErrors,
    ...Object.entries(fieldErrors).map(([k, v]) => `${k}: ${(v ?? []).join(', ')}`),
  ].join('; ');
  return new Response(
    JSON.stringify({
      error: summary || 'Invalid payment payload',
      error_code: 'processor_validation_error',
      code: 'processor_validation_error',
      validation: { fieldErrors, formErrors },
    }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
}

/**
 * Per-processor field validation. Returns a list of field-level errors so the
 * caller can short-circuit BEFORE we ever reach the network. Each rule mirrors
 * what the upstream processor would otherwise reject (Matrix's 35-rune api_key,
 * Mondo's required IBAN/return URLs, Shieldhub's MID config, etc).
 */
type ProcessorErr = { field: string; message: string };
function validateForProcessor(
  provider: string,
  paymentData: any,
): ProcessorErr[] {
  const errs: ProcessorErr[] = [];
  const orderId: string | undefined = paymentData.orderId || paymentData.idempotencyKey;
  const refOk = (s?: string) => !!s && /^[A-Za-z0-9_\-]{6,64}$/.test(s);

  switch (provider) {
    case 'matrix': {
      // Matrix requires reference + customer_token chaining + ASCII order_id
      if (!refOk(paymentData.reference)) {
        errs.push({ field: 'reference', message: 'Matrix requires `reference` (6–64 chars, [A-Za-z0-9_-])' });
      }
      if (paymentData.paymentMethod === 'card' && !paymentData.customer_token && !paymentData.cardDetails) {
        errs.push({ field: 'customer_token', message: 'Matrix card payments require a prior `customer_token` (call /v1/customer/token first) or inline cardDetails' });
      }
      if (orderId && !/^[A-Za-z0-9_\-]{6,64}$/.test(orderId)) {
        errs.push({ field: 'orderId', message: 'Matrix `order_id` must be 6–64 chars [A-Za-z0-9_-]' });
      }
      if (paymentData.billing?.country === 'US') {
        errs.push({ field: 'billing.country', message: 'Matrix is not available for US customers' });
      }
      break;
    }
    case 'mondo': {
      if (paymentData.paymentMethod === 'open_banking') {
        if (!paymentData.customerEmail) errs.push({ field: 'customerEmail', message: 'Mondo open-banking requires `customerEmail`' });
        if (!paymentData.customer?.first || !paymentData.customer?.last) {
          errs.push({ field: 'customer', message: 'Mondo requires customer.first and customer.last' });
        }
        if (!['EUR', 'GBP'].includes(paymentData.currency)) {
          errs.push({ field: 'currency', message: 'Mondo open-banking only supports EUR or GBP' });
        }
      }
      break;
    }
    case 'mzzpay': {
      if (paymentData.paymentMethod === 'card') {
        if (!paymentData.cardDetails) {
          errs.push({ field: 'cardDetails', message: 'MzzPay card flow requires cardDetails' });
        }
        if (!paymentData.customerEmail) {
          errs.push({ field: 'customerEmail', message: 'MzzPay requires `customerEmail` for client-hash signing' });
        }
      }
      break;
    }
    case 'shieldhub': {
      // Shieldhub supports Visa/MC only, USD MX MID
      if (paymentData.paymentMethod !== 'card') {
        errs.push({ field: 'paymentMethod', message: 'Shieldhub only supports card payments' });
      }
      if (paymentData.currency !== 'USD') {
        errs.push({ field: 'currency', message: 'Shieldhub MID settles in USD only' });
      }
      if (!paymentData.customerEmail) {
        errs.push({ field: 'customerEmail', message: 'Shieldhub requires `customerEmail`' });
      }
      if (!paymentData.billing?.country) {
        errs.push({ field: 'billing.country', message: 'Shieldhub requires billing.country (ISO-2)' });
      }
      break;
    }
    case 'moneto':
    case 'moneto_mpg': {
      if (!paymentData.customerEmail) {
        errs.push({ field: 'customerEmail', message: 'Moneto requires `customerEmail`' });
      }
      if (paymentData.paymentMethod === 'card' && !paymentData.cardDetails) {
        errs.push({ field: 'cardDetails', message: 'Moneto card flow requires cardDetails' });
      }
      break;
    }
    case 'risonpay': {
      // RisonPay (CDN) — EU/EEA primary + non-OFAC global fallback
      if (!paymentData.customerEmail) {
        errs.push({ field: 'customerEmail', message: 'RisonPay requires `customerEmail`' });
      }
      if (Number(paymentData.amount) < 10) {
        errs.push({ field: 'amount', message: 'RisonPay minimum amount is 10.00 (EUR/GBP/USD)' });
      }
      if (!['EUR', 'GBP', 'USD'].includes(paymentData.currency)) {
        errs.push({ field: 'currency', message: 'RisonPay supports EUR, GBP, USD only' });
      }
      if (paymentData.paymentMethod === 'card' && !paymentData.cardDetails) {
        errs.push({ field: 'cardDetails', message: 'RisonPay server-side card capture requires cardDetails (number, cvv, expire, holder)' });
      }
      // Block OFAC at validation time as well as routing time.
      const c = (paymentData.billing?.country || '').toUpperCase();
      if (['CU','IR','KP','SY','RU','BY','VE','MM'].includes(c)) {
        errs.push({ field: 'billing.country', message: `RisonPay cannot process payments from sanctioned jurisdiction ${c}` });
      }
      break;
    }
    default:
      break;
  }
  return errs;
}

function processorValidationResponse(provider: string, errs: ProcessorErr[]) {
  return new Response(
    JSON.stringify({
      error: `${provider}: ${errs.map((e) => `${e.field} — ${e.message}`).join('; ')}`,
      error_code: 'processor_validation_error',
      code: 'processor_validation_error',
      provider,
      validation: { fieldErrors: errs },
    }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
}

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

    const rawBody = await req.json().catch(() => ({}));
    // Normalize 'openbanking' (from web checkout) to 'open_banking' (provider value)
    if ((rawBody as any).paymentMethod === 'openbanking') {
      (rawBody as any).paymentMethod = 'open_banking';
    }

    // Strict input validation — fail fast with `processor_validation_error`
    // BEFORE any provider call so the UI can render the field-level errors.
    const parsed = PaymentRequestSchema.safeParse(rawBody);
    if (!parsed.success) {
      console.warn('[process-payment] validation failed', parsed.error.flatten());
      return validationErrorResponse(parsed.error);
    }
    const paymentData: PaymentRequest = parsed.data as PaymentRequest;
    const { amount, currency, paymentMethod, customerEmail, description, idempotencyKey, cardDetails } = paymentData;

    // Check idempotency — if a prior response exists for this key we return
    // it WITH a `duplicate: true` flag so the UI can show the "Duplicate
    // request" toast instead of treating it as a fresh charge.
    if (idempotencyKey && !paymentData.retry) {
      const { data: existingKey } = await supabase
        .from('idempotency_keys')
        .select('response, created_at')
        .eq('key', idempotencyKey)
        .eq('merchant_id', merchant.id)
        .single();

      if (existingKey?.response) {
        const cached: any = existingKey.response;
        const cachedTxStatus = cached?.transaction?.status;
        const cachedFailed = cachedTxStatus === 'failed' || cached?.error;
        if (!cachedFailed) {
          return new Response(
            JSON.stringify({
              ...cached,
              duplicate: true,
              idempotency_replayed: true,
              idempotency_key: idempotencyKey,
              error_code: 'idempotency_conflict',
              code: 'idempotency_conflict',
              first_seen_at: existingKey.created_at,
            }),
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

    // ROUTING POLICY (2026-04 update — RisonPay onboarded):
    //  - OFAC jurisdictions are HARD BLOCKED before routing.
    //  - OPEN_BANKING (EUR/GBP) → Mondo.
    //  - EU/EEA + EU-adjacent customers OR EUR/GBP currency → RisonPay (primary).
    //  - All other regions → Shieldhub (USD MX MID), with RisonPay as fallback.
    const EU_EEA = new Set([
      'AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU','IE',
      'IT','LV','LT','LU','MT','NL','PL','PT','RO','SK','SI','ES','SE',
      'IS','LI','NO','GB','CH','MC','SM','VA','AD',
    ]);
    const OFAC = new Set(['CU','IR','KP','SY','RU','BY','VE','MM']);
    const billingCountry = (paymentData.billing?.country || '').toUpperCase();

    if (OFAC.has(billingCountry)) {
      return new Response(JSON.stringify({
        error: `Payments from ${billingCountry} are blocked due to sanctions compliance`,
        error_code: 'ofac_blocked',
        code: 'ofac_blocked',
      }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (paymentMethod === 'open_banking' && ['EUR', 'GBP'].includes(currency)) {
      provider = 'mondo';
    } else if (EU_EEA.has(billingCountry) || ['EUR', 'GBP'].includes(currency)) {
      provider = 'risonpay';
    } else if (paymentMethod === 'card') {
      provider = 'shieldhub';
    } else {
      provider = 'shieldhub';
    }
    // Allow explicit override (e.g. matrix/shieldhub/moneto/risonpay) from the caller.
    if ((paymentData as any).provider) provider = (paymentData as any).provider;

    // Per-processor field validation — runs BEFORE network call so the UI
    // gets a typed `processor_validation_error` with field-level details.
    const procErrs = validateForProcessor(provider, paymentData);
    if (procErrs.length) {
      // Audit the rejection so it shows in the PSP activity feed.
      try {
        await supabase.from('provider_events').insert({
          merchant_id: merchant.id,
          provider,
          event_type: 'request.validation_failed',
          payload: { errors: procErrs, payment_method: paymentMethod, currency, amount },
        });
      } catch (_) { /* best-effort */ }
      return processorValidationResponse(provider, procErrs);
    }

    // Step event: request submitted to processor
    try {
      await supabase.from('provider_events').insert({
        merchant_id: merchant.id,
        provider,
        event_type: 'request.submitted',
        payload: { payment_method: paymentMethod, currency, amount, order_id: paymentData.orderId ?? null },
      });
    } catch (_) { /* best-effort */ }

    if (provider === 'mondo') {
      providerResponse = await processMondoPayment(paymentData);
    } else {
      providerResponse = await processMzzPayPayment(paymentData);
    }


    // Fail fast on processor misconfiguration BEFORE we write a transaction
    // row. This guarantees the merchant sees the real cause (missing acquirer
    // setup) instead of a generic "provider failure" decline.
    if (providerResponse?.code === 'processor_misconfigured') {
      return new Response(
        JSON.stringify({
          error: providerResponse.error?.message ?? 'Processor not configured',
          error_code: 'processor_misconfigured',
          processorMisconfigured: true,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
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

    // Matrix-specific: derive internal status from the canonical Matrix status
    // (which is itself derived from the numeric `code` field). This guarantees
    // suspended (1020), blocked (1030), and the various decline codes
    // (2010/2020/2022/2025/2026/2030/2031/2035/2040/2050) all land on the
    // correct internal txStatus regardless of what `status` string Matrix
    // returned at the envelope level.
    if (provider === 'matrix') {
      const mxs = (providerResponse as any).matrix_status_canonical as string | undefined;
      if (mxs) {
        switch (mxs) {
          case 'success':   txStatus = 'completed'; break;
          case 'pending':   txStatus = 'processing'; break;
          case 'initial':   txStatus = 'pending'; break;
          case 'suspended': txStatus = 'processing'; break;
          case 'declined':
          case 'blocked':
          case 'error':     txStatus = 'failed'; break;
        }
      }
    }

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

    // Step event: normalized terminal/intermediate status from the processor.
    const stepType =
      txStatus === 'completed' ? 'payment.approved'
      : txStatus === 'failed' ? 'payment.declined'
      : txStatus === 'processing' ? 'payment.processing'
      : 'payment.pending';
    try {
      await supabase.from('provider_events').insert({
        merchant_id: merchant.id,
        transaction_id: transaction.id,
        provider,
        event_type: stepType,
        payload: {
          status: txStatus,
          provider_ref: providerResponse?.id ?? providerResponse?.transaction_id ?? null,
          error_code: procErrorCode,
          error_message: procErrorMessage,
          settlement_amount: settlementAmount,
          settlement_currency: settlementCurrency,
        },
      });
    } catch (_) { /* best-effort */ }

    // 3DS lifecycle event — record whether the issuer was enrolled, the
    // step-up was required, or we fell back to a 2D charge. Surfaces in the
    // payment timeline UI so support can confirm the flow per transaction.
    const threeDsStatus = providerResponse?.__three_ds_status as string | undefined;
    if (provider === 'mzzpay' && threeDsStatus && threeDsStatus !== 'off') {
      const eventType =
        threeDsStatus === 'step_up_required'
          ? 'three_ds.step_up_required'
          : threeDsStatus === 'fallback_2d'
            ? 'three_ds.fallback_2d'
            : 'three_ds.requested';
      await supabase.from('provider_events').insert({
        merchant_id: merchant.id,
        transaction_id: transaction.id,
        provider,
        event_type: eventType,
        payload: {
          three_ds_status: threeDsStatus,
          requested: 'enrolled',
          acs_url:
            providerResponse.three_ds_redirect_url ||
            providerResponse['3d_secure_redirect_url'] ||
            providerResponse.acs_url ||
            null,
        },
      });
    }

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
  const clientId = Deno.env.get('SHIELDHUB_CLIENT_ID');
  const apiSecret = Deno.env.get('SHIELDHUB_API_SECRET');
  if (!clientId || !apiSecret) {
    return {
      status: 'FAILED',
      code: 'processor_misconfigured',
      error: {
        code: 'processor_misconfigured',
        message:
          'Shieldhub credentials missing (SHIELDHUB_CLIENT_ID / SHIELDHUB_API_SECRET).',
      },
    };
  }

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

  // Hard validation: refuse to call Shieldhub if the processor row is missing
  // the acquirer settings we promised the gateway. This protects against
  // half-provisioned environments where the row was never seeded.
  const missing: string[] = [];
  if (!processor) {
    missing.push('payment_processors row (name=shieldhub)');
  } else {
    if (!processor.acquirer_country) missing.push('acquirer_country');
    if (!processor.acquirer_descriptor) missing.push('acquirer_descriptor');
    if (!processor.flow_type) missing.push('flow_type');
  }
  if (missing.length > 0) {
    const msg = `Shieldhub processor row is misconfigured — missing: ${missing.join(', ')}`;
    console.error('[process-payment]', msg);
    return {
      status: 'FAILED',
      code: 'processor_misconfigured',
      error: { code: 'processor_misconfigured', message: msg },
    };
  }

  // Hard fallback — descriptor MUST be populated on every charge. The MID
  // (EVERPAY 3D PTY) requires the soft descriptor "AXP*FER*AXP*FERES" or the
  // gateway will reject with a generic decline. If the row was edited to a
  // blank string we fall back to the canonical value rather than send empty.
  const SHIELDHUB_DESCRIPTOR_FALLBACK = 'AXP*FER*AXP*FERES';
  const descriptor =
    (processor!.acquirer_descriptor && String(processor!.acquirer_descriptor).trim())
      ? String(processor!.acquirer_descriptor).trim()
      : SHIELDHUB_DESCRIPTOR_FALLBACK;
  const acquirerCountry = processor!.acquirer_country || 'MX';
  const wants3ds = String(processor!.flow_type ?? '3DS').toUpperCase().includes('3DS');

  const body: any = {
    amount: amountStr,
    currency: data.currency,
    transaction_reference: transactionReference,
    redirectback_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/payment-link-webhook`,
    notification_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/payment-link-webhook`,
    // Acquirer / descriptor metadata. EVERPAY 3D PTY · MX · AXP*FER*AXP*FERES.
    // Send under every alias the gateway accepts so the soft descriptor is
    // honoured on the cardholder statement regardless of which field the
    // upstream acquirer reads.
    descriptor,
    descriptor_text: descriptor,
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

  let response: Response;
  try {
    response = await fetch('https://pgw.shieldhubpay.com/api/transaction', {
      method: 'POST',
      headers: {
        'client-id': clientId,
        'client-hash': clientHash,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('Shieldhub network error:', msg);
    return {
      status: 'FAILED',
      code: 'network',
      error: { code: 'network', message: `Shieldhub network error: ${msg}` },
    };
  }

  const responseText = await response.text();
  console.log('Shieldhub response:', responseText);

  let parsed: any;
  try {
    parsed = JSON.parse(responseText);
  } catch {
    return {
      status: 'FAILED',
      code: 'provider_failure',
      error: {
        code: 'provider_failure',
        message: `Shieldhub returned invalid JSON (HTTP ${response.status})`,
      },
      raw_text: responseText,
    };
  }

  // Determine 3DS resolution. The gateway reports either an ACS redirect URL
  // (issuer enrolled → step-up required) or it processes the charge as 2D.
  // Surface a normalized field so the caller can persist a fallback event.
  const acsUrl =
    parsed.three_ds_redirect_url ||
    parsed['3d_secure_redirect_url'] ||
    parsed.acs_url ||
    null;
  const enrolledFlag =
    parsed.three_ds_enrolled ?? parsed.threeDSEnrolled ?? parsed.enrolled ?? null;

  let three_ds_status: 'requested_enrolled' | 'step_up_required' | 'fallback_2d' | 'off' =
    'off';
  if (wants3ds) {
    if (acsUrl) three_ds_status = 'step_up_required';
    else if (enrolledFlag === false || /not.?enrolled|fallback/i.test(responseText)) three_ds_status = 'fallback_2d';
    else three_ds_status = 'requested_enrolled';
  }

  if (!response.ok || parsed.status === 'Declined' || parsed.status === 'Failed') {
    const msg = parsed.error?.message || parsed.message || `HTTP ${response.status}`;
    return {
      status: 'FAILED',
      error: { message: `Shieldhub: ${msg}` },
      __three_ds_status: three_ds_status,
      ...parsed,
    };
  }

  return { ...parsed, __three_ds_status: three_ds_status };
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
