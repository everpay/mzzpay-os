import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-elektropay-signature',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_ANON_KEY') ?? '',
  );

  let payload: any = {};
  let eventId = '';
  let eventType = 'unknown';

  try {
    payload = await req.json();
    eventId = payload.payment_id || payload.withdraw_id || payload.transfer_id || payload.id || crypto.randomUUID();
    eventType = payload.event_type || payload.status || 'unknown';

    console.log(`[elektropay-webhook] ${eventType} ${eventId}`);

    const { data: existing } = await supabase.from('elektropay_webhook_events')
      .select('id, attempt_count').eq('event_id', eventId).maybeSingle();
    if (existing) {
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

    await supabase.from('elektropay_webhook_events').insert({
      event_id: eventId,
      event_type: eventType,
      payload,
      attempt_count: 1,
      last_attempt_at: new Date().toISOString(),
    });

    if (payload.payment_id || payload.withdraw_id || payload.transfer_id) {
      const epId = payload.payment_id || payload.withdraw_id || payload.transfer_id;
      const status = mapStatus(payload.status);
      await supabase.from('crypto_transactions')
        .update({
          status,
          tx_hash: payload.tx_hash ?? payload.txid,
          metadata: { webhook: payload, rate: payload.rate, rate_date: payload.rate_date },
        })
        .eq('elektropay_id', epId);

      if (status === 'complete' && payload.payment_id) {
        const { data: tx } = await supabase.from('crypto_transactions')
          .select('wallet_id, amount, asset_id').eq('elektropay_id', epId).maybeSingle();
        if (tx?.wallet_id) {
          const { data: w } = await supabase.from('crypto_wallets').select('balance').eq('id', tx.wallet_id).single();
          await supabase.from('crypto_wallets')
            .update({ balance: Number(w?.balance ?? 0) + Number(payload.ip_amount ?? tx.amount) })
            .eq('id', tx.wallet_id);
        }
      }
    }

    await supabase.from('elektropay_webhook_events')
      .update({ processed: true, error_message: null })
      .eq('event_id', eventId);
    return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e: any) {
    console.error('[elektropay-webhook] error', e);
    try {
      await supabase.from('elektropay_webhook_events')
        .upsert({
          event_id: eventId || crypto.randomUUID(),
          event_type: eventType,
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

function mapStatus(s?: string): string {
  if (!s) return 'pending';
  const x = s.toUpperCase();
  if (x === 'COMPLETE' || x === 'COMPLETED') return 'complete';
  if (x === 'CANCEL' || x === 'CANCELLED' || x === 'CANCELED') return 'cancelled';
  if (x === 'FAILED' || x === 'ERROR') return 'failed';
  if (x === 'PROCESSING') return 'processing';
  return 'pending';
}
