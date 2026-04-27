import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { applyLedgerCredit, ingestProviderEvent } from "../_shared/psp-ingest.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Matrix Pay Webhook
 * Auth: TH-HMAC public_key:base64(HMAC_SHA256(body, secret_key))
 * Ingestion is idempotent on (provider, payload.id|transactions[0].id).
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.text();
    const authHeader = req.headers.get('Authorization') || '';

    const MATRIX_SECRET_KEY = Deno.env.get('MATRIX_SECRET_KEY');
    if (!MATRIX_SECRET_KEY) {
      console.error('[Matrix Webhook] MATRIX_SECRET_KEY not configured — rejecting');
      return new Response(JSON.stringify({ error: 'webhook not configured' }), {
        status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!authHeader.startsWith('TH-HMAC ')) {
      return new Response(JSON.stringify({ error: 'missing signature' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    {
      const [, sigPart] = authHeader.split(' ');
      const [, signature] = (sigPart || '').split(':');
      const enc = new TextEncoder();
      const key = await crypto.subtle.importKey(
        'raw', enc.encode(MATRIX_SECRET_KEY),
        { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
      );
      const sig = await crypto.subtle.sign('HMAC', key, enc.encode(body));
      const expectedSig = btoa(String.fromCharCode(...new Uint8Array(sig)));
      // constant-time compare
      const a = signature || '';
      const b = expectedSig;
      let mismatch = a.length ^ b.length;
      for (let i = 0; i < Math.min(a.length, b.length); i++) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
      if (mismatch !== 0) {
        console.warn('[Matrix Webhook] HMAC mismatch');
        return new Response(JSON.stringify({ error: 'invalid signature' }), {
          status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    const payload = JSON.parse(body);
    const { id, status, code, reason, transactions } = payload as any;
    const eventId = payload.event_id || transactions?.[0]?.id || id || null;

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const statusMap: Record<string, 'completed' | 'failed' | 'processing' | 'pending'> = {
      success: 'completed', error: 'failed', declined: 'failed',
      pending: 'processing', initial: 'pending', suspended: 'pending', blocked: 'failed',
    };
    const mappedStatus = statusMap[status] || 'processing';

    let transactionId: string | null = null;
    let merchantId: string | null = null;
    if (id) {
      const { data: tx } = await supabase
        .from('transactions')
        .select('id, merchant_id, status')
        .eq('provider_ref', id)
        .maybeSingle();
      if (tx) { transactionId = tx.id; merchantId = tx.merchant_id; }
    }

    if (merchantId) {
      const ingest = await ingestProviderEvent(supabase, {
        provider: 'matrix',
        eventId,
        eventType: status || 'unknown',
        payload,
        transactionId,
        merchantId,
        mappedStatus,
      });

      if (!ingest.duplicate && transactionId) {
        await supabase.from('transactions').update({
          status: mappedStatus, updated_at: new Date().toISOString(),
        }).eq('id', transactionId);
        if (mappedStatus === 'completed') await applyLedgerCredit(supabase, transactionId);
      }
    }

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
