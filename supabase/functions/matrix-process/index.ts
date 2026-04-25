import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Matrix Pay Solution — Full API Integration
 * Gaming, Online Casinos, Lottery merchant types.
 * NOT available for US-based customers/cards/wallets.
 * Auth: Basic HTTP Auth — public_key:secret_key
 * Without secret_key → simulation mode.
 */

const SANDBOX_URL = 'https://api-sandbox.matrixpaysolution.com';
const LIVE_URL = 'https://api.matrixpaysolution.com';

const STATUS_CODE_MAP: Record<number, string> = {
  0: 'Successful transaction',
  1003: 'No payment routes found',
  1020: 'Transaction is suspended',
  1030: 'Transaction is blocked',
  1500: 'Internal error',
  2010: 'Cancelled by customer',
  2020: 'Declined by Antifraud',
  2022: 'Declined by 3-D Secure',
  2025: 'Declined by Bank',
  2026: 'Declined by Bank: No Requisites',
  2030: 'Limit reached',
  2031: 'Customer limit reached',
  2035: 'Card limit reached',
  2040: 'Insufficient funds',
  2050: 'Incorrect card data',
  2099: 'Pending cascading after 3DS',
};

const API_RESPONSE_CODES: Record<number, string> = {
  0: 'Successful operation',
  30003: 'No payment routes found',
  30005: 'Unknown merchant account',
  30010: 'Invalid order data',
  30011: 'Invalid parent transaction',
  30012: 'Order already exists',
  30020: 'Unknown payment provider',
  30022: 'Unknown payment route',
  30030: 'Blocked by antifraud',
  30031: 'Blocked manually',
  30401: 'Unauthorized request',
  30404: 'Transaction is not found',
  30500: 'Internal server error',
  30600: 'Foreign error',
  30700: 'Request timed out',
};

const ENDPOINT_MAP: Record<string, string> = {
  customer_token: '/v1/customer/token',
  pay: '/v1/transaction/pay',
  checkout: '/v1/checkout/pay',
  refund: '/v1/transaction/refund',
  status: '/v1/transaction/status',
  order_status: '/v1/order/status',
  payout: '/v1/transaction/payout/init',
  cascade: '/v1/transaction/cascade',
  cascade_reject: '/v1/transaction/cascade/reject',
  h2h_payment: '/v1/h2h/payment',
  h2h_payout: '/v1/h2h/payout/init',
  h2h_p2p_init: '/v1/h2h/payment/p2p/init',
  h2h_apm: '/v1/h2h/apm/payment',
  plan_create: '/v1/subscription/plan/create',
  plan_update: '/v1/subscription/plan/update',
  plan_deactivate: '/v1/subscription/plan/deactivate',
  plan_details: '/v1/subscription/plan/details',
  subscription_init: '/v1/subscription/init',
  subscription_hpp: '/v1/checkout/subscription/init',
  subscription_details: '/v1/subscription/details',
  subscription_list: '/v1/subscription/list',
  subscription_cancel: '/v1/subscription/cancel',
  subscription_token_pay: '/v1/subscription/transaction/pay',
  oneclick_create: '/v1/checkout/oneclick/init',
  oneclick_pay: '/v1/oneclick/transaction/pay',
  checkout_oneclick_pay: '/v1/checkout/oneclick/pay',
  project_details: '/v1/project/details',
  mid_details: '/v1/mid/details',
  external_mid_details: '/v1/external_mid/details',
  mid_balance: '/v1/balance/mid',
  external_mid_balance: '/v1/balance/external_mid',
  aggregated_mid_balance: '/v1/balance/aggregated_mid',
};

function simulateResponse(action: string, params: any) {
  const txId = `mtx_sim_${Date.now().toString(36)}`;
  const orderId = params.order_id || `ord_${Date.now().toString(36)}`;
  const now = Math.floor(Date.now() / 1000);

  switch (action) {
    case 'customer_token':
      // Matrix actually nests the token under `data.customer_token` (verified
      // against live sandbox 2026-04-24). Mirror the real shape exactly.
      return {
        code: 0,
        reason: 'ok',
        data: { customer_token: `ct_sim_${Date.now().toString(36)}` },
        // Back-compat: keep the flat field too so existing callers don't break.
        customer_token: `ct_sim_${Date.now().toString(36)}`,
      };
    case 'pay':
    case 'h2h_payment':
    case 'h2h_p2p_init':
      return {
        status: 'success', code: 0, id: orderId, timestamp: now,
        transactions: [{ id: txId, status: 'success', code: 0, amount: params.amount || 100, currency: params.currency || 'EUR', type: 'payment' }],
        card: { mask: '424242******4242', brand: 'visa' },
      };
    case 'checkout':
      return { status: 'pending', code: 0, redirect_url: `https://checkout-sandbox.matrixpaysolution.com/pay/${txId}`, id: orderId };
    case 'refund':
      return {
        status: 'success', code: 0, id: orderId, timestamp: now,
        transactions: [{ id: txId, status: 'success', code: 0, amount: params.amount || 100, type: 'refund' }],
      };
    case 'payout':
    case 'h2h_payout':
      return {
        status: 'success', code: 0, id: orderId, timestamp: now,
        transactions: [{ id: txId, status: 'success', code: 0, amount: params.amount || 100, currency: params.currency || 'EUR', type: 'payout' }],
      };
    case 'status':
    case 'order_status':
      return {
        status: 'success', code: 0, id: params.order_id || params.transaction_id || orderId, timestamp: now,
        transactions: [{ id: txId, status: 'success', code: 0, amount: 100, currency: 'EUR', type: 'payment' }],
      };
    case 'project_details':
      return {
        status: 'success', code: 0,
        project: { id: '1219560793', name: 'MzzPay Matrix Project', status: 'active', mode: 'test' },
      };
    default:
      return { status: 'ok', code: 0 };
  }
}

export const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { action, sandbox = true, idempotency_key, merchant_id, ...params } = body;

    const customerCountry = params.country || params.billingDetails?.country || '';
    if (customerCountry === 'US') {
      return new Response(JSON.stringify({
        error: 'Matrix Pay is not available for US-based customers',
        code: 'REGION_BLOCKED',
      }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Idempotency: replay cached response if the same key+merchant has been
    // seen for any "create" action (pay/checkout/payout/refund/h2h_*).
    const isCreateAction = /^(pay|checkout|refund|payout|h2h_)/.test(action || '');
    if (idempotency_key && merchant_id && isCreateAction) {
      const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2.39.3");
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      );
      const { data: cached } = await supabase
        .from('idempotency_keys')
        .select('response')
        .eq('key', idempotency_key)
        .eq('merchant_id', merchant_id)
        .maybeSingle();
      if (cached?.response) {
        return new Response(JSON.stringify({ ...(cached.response as Record<string, unknown>), idempotent_replay: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    const MATRIX_PUBLIC_KEY = Deno.env.get('MATRIX_PUBLIC_KEY');
    const MATRIX_SECRET_KEY = Deno.env.get('MATRIX_SECRET_KEY');
    const MATRIX_PROJECT_ID = Deno.env.get('MATRIX_PROJECT_ID') || '1219560793';

    if (!MATRIX_PUBLIC_KEY) {
      return new Response(JSON.stringify({
        error: 'Matrix public key not configured', code: 'CONFIG_ERROR',
      }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    let responseBody: Record<string, unknown>;
    let httpStatus = 200;

    if (!MATRIX_SECRET_KEY) {
      console.log(`[Matrix] Simulation mode — action: ${action}`);
      responseBody = {
        simulation: true, public_key_configured: true, project_id: MATRIX_PROJECT_ID,
        ...simulateResponse(action, params),
      };
    } else {
      const baseUrl = sandbox ? SANDBOX_URL : LIVE_URL;
      const endpoint = ENDPOINT_MAP[action];
      if (!endpoint) {
        return new Response(JSON.stringify({
          error: `Unknown action: ${action}`, available_actions: Object.keys(ENDPOINT_MAP),
        }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // Match Everpay Platform OS auth construction exactly — encode UTF-8
      // bytes first, then base64. Plain `btoa(string)` can mis-encode keys
      // that contain extended characters and produces a 401 / code 30401.
      const encoder = new TextEncoder();
      const credentialBytes = encoder.encode(`${MATRIX_PUBLIC_KEY}:${MATRIX_SECRET_KEY}`);
      const authHeader = `Basic ${btoa(String.fromCharCode(...credentialBytes))}`;
      // Matrix's protobuf `GetProjectRequest.ApiKey` is the 35-rune public key,
      // sent in the request body as `api_key` (NOT the project_id). The error
      // `invalid GetProjectRequest.ApiKey: value length must be 35 runes`
      // means the body's api_key field is missing/wrong length.
      const enrichedParams = {
        ...params,
        project_id: MATRIX_PROJECT_ID,
        api_key: MATRIX_PUBLIC_KEY,
      };

      console.log(`[Matrix] ${action} -> ${baseUrl}${endpoint}`);
      const response = await fetch(`${baseUrl}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': authHeader },
        body: JSON.stringify(enrichedParams),
      });

      const responseText = await response.text();
      let data: any;
      try { data = JSON.parse(responseText); } catch { data = { raw_response: responseText }; }

      if (data.code !== undefined) {
        data.status_description = STATUS_CODE_MAP[data.code] || API_RESPONSE_CODES[data.code] || `Code ${data.code}`;
      }
      if (data.transactions) {
        for (const tx of data.transactions) {
          if (tx.code !== undefined) tx.status_description = STATUS_CODE_MAP[tx.code] || `Code ${tx.code}`;
        }
      }

      responseBody = { sandbox, matrix_status: response.status, ...data };
      httpStatus = response.ok ? 200 : response.status;
    }

    // Persist idempotent response so replays return the same body.
    if (idempotency_key && merchant_id && isCreateAction && httpStatus < 500) {
      try {
        const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2.39.3");
        const supabase = createClient(
          Deno.env.get('SUPABASE_URL')!,
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
        );
        await supabase.from('idempotency_keys').upsert({
          merchant_id, key: idempotency_key, response: responseBody,
        }, { onConflict: 'merchant_id,key' });
      } catch (e) {
        console.error('[Matrix] idempotency cache failed:', e);
      }
    }

    return new Response(JSON.stringify(responseBody), {
      status: httpStatus,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[Matrix] Error:', err);
    return new Response(JSON.stringify({ error: 'Matrix processing error', message: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
};

// Only bind a port when running as an edge function (not under Deno test).
if (!Deno.env.get('MATRIX_TEST_MODE')) {
  serve(handler);
}
