import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Moneto Payment Gateway (MPG) — Server-to-Server card processing
 * Spec: Moneto_Payment_Gateway_v_1.0.4
 *
 * Actions:
 *   - tokenize_payment_method  → POST /payments/integration-api/payment-methods
 *   - charge                   → POST /payments/integration-api/payments
 *   - refund                   → POST /payments/integration-api/payments/:payment_id/refund
 *
 * Auth: Basic <base64(merchant_id:merchant_secret)>
 */

const SANDBOX_URL = 'https://demo.genwin.app';
const LIVE_URL = 'https://demo.genwin.app'; // Production TBD per spec

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { action, sandbox = true, payment_id, idempotency_key, merchant_id, ...params } = body as Record<string, any>;

    const MERCHANT_ID = Deno.env.get('MONETO_MPG_MERCHANT_ID');
    const MERCHANT_SECRET = Deno.env.get('MONETO_MPG_MERCHANT_SECRET');

    if (!MERCHANT_ID || !MERCHANT_SECRET) {
      return new Response(JSON.stringify({
        error: 'Moneto MPG credentials not configured',
        code: 'CONFIG_ERROR',
        hint: 'Set MONETO_MPG_MERCHANT_ID and MONETO_MPG_MERCHANT_SECRET secrets',
      }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Idempotency replay for charge / refund (token creation is naturally idempotent).
    const cacheable = action === 'charge' || action === 'refund';
    if (idempotency_key && merchant_id && cacheable) {
      const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2.39.3");
      const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
      const { data: cached } = await sb.from('idempotency_keys')
        .select('response').eq('key', idempotency_key).eq('merchant_id', merchant_id).maybeSingle();
      if (cached?.response) {
        return new Response(JSON.stringify({ ...(cached.response as Record<string, unknown>), idempotent_replay: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    const baseUrl = sandbox ? SANDBOX_URL : LIVE_URL;
    const auth = `Basic ${btoa(`${MERCHANT_ID}:${MERCHANT_SECRET}`)}`;

    let endpoint = '';
    const method: 'POST' = 'POST';
    let payload: any = params;

    switch (action) {
      case 'tokenize_payment_method':
        endpoint = '/payments/integration-api/payment-methods';
        if (!params.channel_id) payload = { channel_id: 'CREDIT_CARD', ...params };
        break;
      case 'charge':
        endpoint = '/payments/integration-api/payments';
        break;
      case 'refund':
        if (!payment_id) {
          return new Response(JSON.stringify({ error: 'payment_id is required for refund' }), {
            status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        endpoint = `/payments/integration-api/payments/${payment_id}/refund`;
        break;
      default:
        return new Response(JSON.stringify({
          error: `Unknown action: ${action}`,
          available_actions: ['tokenize_payment_method', 'charge', 'refund'],
        }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const url = `${baseUrl}${endpoint}`;
    console.log(`[Moneto MPG] ${action} -> ${url}`);

    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', 'Authorization': auth },
      body: JSON.stringify(payload),
    });

    const text = await response.text();
    let data: any;
    try { data = JSON.parse(text); } catch { data = { raw_response: text }; }

    const responseBody = { sandbox, moneto_status: response.status, action, ...data };

    if (idempotency_key && merchant_id && cacheable && response.status < 500) {
      try {
        const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2.39.3");
        const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
        await sb.from('idempotency_keys').upsert(
          { merchant_id, key: idempotency_key, response: responseBody },
          { onConflict: 'merchant_id,key' },
        );
      } catch (e) {
        console.error('[Moneto MPG] idempotency cache failed:', e);
      }
    }

    return new Response(JSON.stringify(responseBody), {
      status: response.ok ? 200 : response.status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[Moneto MPG] Error:', err);
    return new Response(JSON.stringify({
      error: 'Moneto MPG processing error',
      message: String(err),
    }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
