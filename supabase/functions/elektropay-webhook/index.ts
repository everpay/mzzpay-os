import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-elektropay-signature, x-signature',
};

// ─────────────────────────────────────────────────────────────────────────────
// Signature validation (HMAC-SHA256 of raw body using ELEKTROPAY_WEBHOOK_SECRET)
// ─────────────────────────────────────────────────────────────────────────────
async function verifySignature(rawBody: string, signatureHeader: string | null): Promise<{ ok: boolean; reason?: string }> {
  const secret = Deno.env.get('ELEKTROPAY_WEBHOOK_SECRET');
  if (!secret) return { ok: false, reason: 'ELEKTROPAY_WEBHOOK_SECRET not configured' };
  if (!signatureHeader) return { ok: false, reason: 'missing signature header' };

  const provided = signatureHeader.replace(/^sha256=/i, '').trim().toLowerCase();
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sigBuf = await crypto.subtle.sign('HMAC', key, enc.encode(rawBody));
  const expected = Array.from(new Uint8Array(sigBuf)).map(b => b.toString(16).padStart(2, '0')).join('');

  // constant-time compare
  if (provided.length !== expected.length) return { ok: false, reason: 'signature length mismatch' };
  let mismatch = 0;
  for (let i = 0; i < expected.length; i++) mismatch |= provided.charCodeAt(i) ^ expected.charCodeAt(i);
  return mismatch === 0 ? { ok: true } : { ok: false, reason: 'signature mismatch' };
}

// ─────────────────────────────────────────────────────────────────────────────
// Provider abstraction: normalize Elektropay payload → common event schema
// ─────────────────────────────────────────────────────────────────────────────
type NormalizedEvent = {
  provider: 'elektropay';
  event_type: string;            // e.g. payment.succeeded, withdrawal.failed, transfer.completed
  external_id: string;           // payment_id / withdraw_id / transfer_id
  status: 'pending' | 'processing' | 'complete' | 'cancelled' | 'failed';
  amount: number;
  asset_id: string | null;
  tx_hash: string | null;
  metadata: Record<string, any>;
};

function mapStatus(s?: string): NormalizedEvent['status'] {
  if (!s) return 'pending';
  const x = s.toUpperCase();
  if (x === 'COMPLETE' || x === 'COMPLETED' || x === 'SUCCESS' || x === 'SUCCEEDED') return 'complete';
  if (x === 'CANCEL' || x === 'CANCELLED' || x === 'CANCELED') return 'cancelled';
  if (x === 'FAILED' || x === 'ERROR' || x === 'DECLINED') return 'failed';
  if (x === 'PROCESSING' || x === 'PENDING_CONFIRMATION') return 'processing';
  return 'pending';
}

function normalize(payload: any): NormalizedEvent {
  const status = mapStatus(payload.status);
  let kind = 'payment';
  let externalId = payload.payment_id;
  if (!externalId && payload.withdraw_id) { kind = 'withdrawal'; externalId = payload.withdraw_id; }
  else if (!externalId && payload.transfer_id) { kind = 'transfer'; externalId = payload.transfer_id; }
  externalId = externalId || payload.id || crypto.randomUUID();

  const explicit = (payload.event_type as string | undefined)?.toLowerCase();
  const event_type = explicit || `${kind}.${status}`;

  return {
    provider: 'elektropay',
    event_type,
    external_id: String(externalId),
    status,
    amount: Number(payload.ip_amount ?? payload.amount ?? 0),
    asset_id: payload.asset_id ?? payload.payment_asset_id ?? null,
    tx_hash: payload.tx_hash ?? payload.txid ?? null,
    metadata: { raw: payload, rate: payload.rate, rate_date: payload.rate_date },
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_ANON_KEY') ?? '',
  );

  // 1. Read raw body once for signature verification + JSON parsing
  const rawBody = await req.text();
  const signatureHeader = req.headers.get('x-elektropay-signature') || req.headers.get('x-signature');

  // 2. Verify signature (skip in test mode if explicitly allowed)
  const allowUnsigned = Deno.env.get('ELEKTROPAY_ALLOW_UNSIGNED') === 'true';
  const sig = await verifySignature(rawBody, signatureHeader);
  if (!sig.ok && !allowUnsigned) {
    console.warn('[elektropay-webhook] signature rejected:', sig.reason);
    return new Response(JSON.stringify({ ok: false, error: 'invalid signature', reason: sig.reason }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let payload: any = {};
  let normalized: NormalizedEvent | null = null;

  try {
    payload = rawBody ? JSON.parse(rawBody) : {};
    normalized = normalize(payload);
    console.log(`[elektropay-webhook] ${normalized.event_type} ${normalized.external_id} status=${normalized.status}`);

    // 3. Idempotency check via raw webhook log
    const { data: existing } = await supabase.from('elektropay_webhook_events')
      .select('id, attempt_count, processed').eq('event_id', normalized.external_id).maybeSingle();
    if (existing?.processed) {
      await supabase.from('elektropay_webhook_events')
        .update({
          attempt_count: (existing.attempt_count ?? 1) + 1,
          last_attempt_at: new Date().toISOString(),
        })
        .eq('id', existing.id);
      return new Response(JSON.stringify({ ok: true, deduped: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!existing) {
      await supabase.from('elektropay_webhook_events').insert({
        event_id: normalized.external_id,
        event_type: normalized.event_type,
        payload,
        attempt_count: 1,
        last_attempt_at: new Date().toISOString(),
      });
    }

    // 4. Sync underlying crypto_transactions + wallet balance, capture merchant_id
    let merchantId: string | null = null;
    let txRowId: string | null = null;
    if (normalized.external_id) {
      const { data: tx } = await supabase.from('crypto_transactions')
        .select('id, wallet_id, amount, asset_id, merchant_id')
        .eq('elektropay_id', normalized.external_id).maybeSingle();
      merchantId = tx?.merchant_id ?? null;
      txRowId = tx?.id ?? null;

      await supabase.from('crypto_transactions')
        .update({
          status: normalized.status,
          tx_hash: normalized.tx_hash,
          metadata: { webhook: payload, normalized },
        })
        .eq('elektropay_id', normalized.external_id);

      if (normalized.status === 'complete' && payload.payment_id && tx?.wallet_id) {
        const { data: w } = await supabase.from('crypto_wallets').select('balance').eq('id', tx.wallet_id).single();
        await supabase.from('crypto_wallets')
          .update({ balance: Number(w?.balance ?? 0) + (normalized.amount || Number(tx.amount)) })
          .eq('id', tx.wallet_id);
      }
    }

    // 5. Insert normalized event into provider_events (common dashboard schema)
    if (merchantId) {
      await supabase.from('provider_events').insert({
        provider: 'elektropay',
        event_type: normalized.event_type,
        merchant_id: merchantId,
        payload: { ...normalized, raw: payload },
      });
    } else {
      console.log('[elektropay-webhook] no merchant_id resolved — skipping provider_events insert');
    }

    await supabase.from('elektropay_webhook_events')
      .update({ processed: true, error_message: null })
      .eq('event_id', normalized.external_id);

    return new Response(JSON.stringify({ ok: true, normalized }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    console.error('[elektropay-webhook] error', e);
    try {
      await supabase.from('elektropay_webhook_events').upsert({
        event_id: normalized?.external_id || crypto.randomUUID(),
        event_type: normalized?.event_type || 'unknown',
        payload,
        processed: false,
        error_message: String(e?.message || e),
        last_attempt_at: new Date().toISOString(),
      }, { onConflict: 'event_id' });
    } catch (_) { /* swallow */ }
    return new Response(JSON.stringify({ ok: false, error: e.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
