// One-time backfill: normalize historical elektropay_webhook_events → provider_events.
// Admin-only. Idempotent (skips events already represented in provider_events).
// Loudly logs and reports any event whose merchant_id cannot be uniquely resolved.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type Status = 'pending' | 'processing' | 'complete' | 'cancelled' | 'failed';

function mapStatus(s?: string): Status {
  if (!s) return 'pending';
  const x = s.toUpperCase();
  if (['COMPLETE','COMPLETED','SUCCESS','SUCCEEDED'].includes(x)) return 'complete';
  if (['CANCEL','CANCELLED','CANCELED'].includes(x)) return 'cancelled';
  if (['FAILED','ERROR','DECLINED'].includes(x)) return 'failed';
  if (['PROCESSING','PENDING_CONFIRMATION'].includes(x)) return 'processing';
  return 'pending';
}

function normalize(payload: any) {
  const status = mapStatus(payload.status);
  let kind = 'payment';
  let externalId: string | undefined = payload.payment_id;
  if (!externalId && payload.withdraw_id) { kind = 'withdrawal'; externalId = payload.withdraw_id; }
  else if (!externalId && payload.transfer_id) { kind = 'transfer'; externalId = payload.transfer_id; }
  externalId = externalId || payload.id || crypto.randomUUID();
  const event_type = (payload.event_type as string | undefined)?.toLowerCase() || `${kind}.${status}`;
  return {
    provider: 'elektropay' as const,
    event_type,
    external_id: String(externalId),
    status,
    amount: Number(payload.ip_amount ?? payload.amount ?? 0),
    asset_id: payload.asset_id ?? payload.payment_asset_id ?? null,
    tx_hash: payload.tx_hash ?? payload.txid ?? null,
    metadata: { raw: payload, rate: payload.rate, rate_date: payload.rate_date },
  };
}

// Multi-tier merchant resolution. Returns { merchant_id, source } or throws on ambiguity.
async function resolveMerchant(supabase: any, ev: any, payload: any): Promise<{ merchant_id: string | null; source: string }> {
  const externalId = ev.event_id;

  // Tier 1: crypto_transactions.elektropay_id (most reliable)
  if (externalId) {
    const { data: txs } = await supabase.from('crypto_transactions')
      .select('merchant_id').eq('elektropay_id', externalId);
    if (txs && txs.length > 0) {
      const unique = [...new Set(txs.map((t: any) => t.merchant_id).filter(Boolean))];
      if (unique.length > 1) throw new Error(`AMBIGUOUS: ${externalId} maps to ${unique.length} merchants via crypto_transactions: ${unique.join(', ')}`);
      if (unique.length === 1) return { merchant_id: unique[0] as string, source: 'crypto_transactions.elektropay_id' };
    }
  }

  // Tier 2: crypto_stores.elektropay_store_id from payload
  const storeId = payload?.store_id || payload?.elektropay_store_id;
  if (storeId) {
    const { data: stores } = await supabase.from('crypto_stores')
      .select('merchant_id').eq('elektropay_store_id', storeId);
    if (stores && stores.length > 0) {
      const unique = [...new Set(stores.map((s: any) => s.merchant_id).filter(Boolean))];
      if (unique.length > 1) throw new Error(`AMBIGUOUS: store_id=${storeId} maps to ${unique.length} merchants`);
      if (unique.length === 1) return { merchant_id: unique[0] as string, source: 'crypto_stores.elektropay_store_id' };
    }
  }

  // Tier 3: crypto_wallets.address from payload (for deposits credited to a known address)
  const address = payload?.address || payload?.to_address;
  if (address) {
    const { data: wallets } = await supabase.from('crypto_wallets')
      .select('merchant_id').eq('address', address);
    if (wallets && wallets.length > 0) {
      const unique = [...new Set(wallets.map((w: any) => w.merchant_id).filter(Boolean))];
      if (unique.length > 1) throw new Error(`AMBIGUOUS: address=${address} maps to ${unique.length} merchants`);
      if (unique.length === 1) return { merchant_id: unique[0] as string, source: 'crypto_wallets.address' };
    }
  }

  // Tier 4: explicit merchant_id in payload metadata
  const explicit = payload?.merchant_id || payload?.metadata?.merchant_id;
  if (explicit) {
    const { data: m } = await supabase.from('merchants').select('id').eq('id', explicit).maybeSingle();
    if (m?.id) return { merchant_id: m.id, source: 'payload.merchant_id' };
  }

  return { merchant_id: null, source: 'unresolved' };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ success: false, error: 'auth required' }, 401);

    const userClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ success: false, error: 'invalid auth' }, 401);

    const { data: roles } = await userClient.from('user_roles').select('role').eq('user_id', user.id);
    const isAdmin = roles?.some((r: any) => r.role === 'super_admin' || r.role === 'admin');
    if (!isAdmin) return json({ success: false, error: 'admin only' }, 403);

    const { dryRun = true, limit = 1000 } = await req.json().catch(() => ({}));
    const admin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    console.log(`[backfill] start dryRun=${dryRun} limit=${limit} actor=${user.id}`);

    const { data: events, error } = await admin
      .from('elektropay_webhook_events')
      .select('id, event_id, event_type, payload, created_at, processed')
      .order('created_at', { ascending: true })
      .limit(limit);
    if (error) throw error;

    const stats = { scanned: 0, alreadyExists: 0, inserted: 0, unresolved: 0, ambiguous: 0, errors: 0 };
    const unresolvedDetails: any[] = [];
    const ambiguousDetails: any[] = [];

    for (const ev of events || []) {
      stats.scanned++;
      const payload = ev.payload || {};
      const normalized = normalize(payload);

      // Skip if already in provider_events (idempotent: dedupe by external_id in metadata)
      const { data: existing } = await admin
        .from('provider_events')
        .select('id')
        .eq('provider', 'elektropay')
        .contains('payload', { external_id: normalized.external_id })
        .limit(1)
        .maybeSingle();
      if (existing) { stats.alreadyExists++; continue; }

      let resolved: { merchant_id: string | null; source: string };
      try {
        resolved = await resolveMerchant(admin, ev, payload);
      } catch (e: any) {
        stats.ambiguous++;
        ambiguousDetails.push({ event_id: ev.event_id, error: e.message });
        console.error(`[backfill] AMBIGUOUS event=${ev.event_id}: ${e.message}`);
        continue;
      }

      if (!resolved.merchant_id) {
        stats.unresolved++;
        unresolvedDetails.push({
          event_id: ev.event_id,
          event_type: ev.event_type,
          payment_id: payload.payment_id,
          withdraw_id: payload.withdraw_id,
          transfer_id: payload.transfer_id,
          store_id: payload.store_id,
          address: payload.address || payload.to_address,
        });
        console.warn(`[backfill] UNRESOLVED event=${ev.event_id} type=${ev.event_type}`);
        continue;
      }

      console.log(`[backfill] event=${ev.event_id} merchant=${resolved.merchant_id} via ${resolved.source}`);

      if (!dryRun) {
        const { error: insErr } = await admin.from('provider_events').insert({
          provider: 'elektropay',
          event_type: normalized.event_type,
          merchant_id: resolved.merchant_id,
          payload: { ...normalized, raw: payload, _backfill: { source: resolved.source, at: new Date().toISOString() } },
          created_at: ev.created_at,
        });
        if (insErr) {
          stats.errors++;
          console.error(`[backfill] insert failed event=${ev.event_id}: ${insErr.message}`);
        } else {
          stats.inserted++;
        }
      } else {
        stats.inserted++; // would-insert count in dry run
      }
    }

    console.log(`[backfill] done`, stats);
    return json({
      success: true,
      dryRun,
      stats,
      unresolved: unresolvedDetails.slice(0, 50),
      ambiguous: ambiguousDetails.slice(0, 50),
    });
  } catch (e: any) {
    console.error('[backfill] fatal', e);
    return json({ success: false, error: e?.message || 'unexpected' }, 500);
  }
});

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
