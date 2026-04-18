import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Matrix Pay Webhook
 * Auth: TH-HMAC public_key:base64(HMAC_SHA256(body, secret_key))
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.text();
    const authHeader = req.headers.get('Authorization') || '';
    console.log('[Matrix Webhook] Received');

    const MATRIX_SECRET_KEY = Deno.env.get('MATRIX_SECRET_KEY');
    if (MATRIX_SECRET_KEY && authHeader.startsWith('TH-HMAC ')) {
      const [, sigPart] = authHeader.split(' ');
      const [, signature] = sigPart.split(':');
      const enc = new TextEncoder();
      const key = await crypto.subtle.importKey(
        'raw', enc.encode(MATRIX_SECRET_KEY),
        { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
      );
      const sig = await crypto.subtle.sign('HMAC', key, enc.encode(body));
      const expectedSig = btoa(String.fromCharCode(...new Uint8Array(sig)));
      if (signature !== expectedSig) console.warn('[Matrix Webhook] HMAC mismatch');
    }

    const payload = JSON.parse(body);
    const { id, status, code, reason, transactions, card } = payload;

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const statusMap: Record<string, string> = {
      success: 'completed', error: 'failed', declined: 'failed',
      pending: 'processing', initial: 'pending', suspended: 'pending', blocked: 'failed',
    };
    const mappedStatus = statusMap[status] || 'processing';

    if (id) {
      await supabase.from('transactions').update({
        status: mappedStatus,
        updated_at: new Date().toISOString(),
      }).eq('provider_ref', id);
    }

    await supabase.from('provider_events').insert({
      provider: 'matrix',
      event_type: status || 'unknown',
      payload,
    }).then(() => {}, (e) => console.error('[Matrix Webhook] event log:', e));

    return new Response(JSON.stringify({ received: true, status: mappedStatus, code, reason }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[Matrix Webhook] Error:', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
