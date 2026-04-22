/**
 * Public crypto payment endpoint (no auth required) used by hosted checkout
 * and invoice payment pages. Resolves the receiving merchant from invoice/
 * checkout context, generates a deposit address via Elektropay, and records
 * the pending crypto_transactions row server-side.
 *
 * Webhook from elektropay-webhook flips status to 'complete' once confirmed.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const ELEKTROPAY_BASE = Deno.env.get('ELEKTROPAY_BASE_URL') || 'https://apiv3.elektropay.com';

interface RequestBody {
  invoice_id?: string;
  /** for hosted checkout payment links */
  merchant_id?: string;
  asset_id: string;
  amount: number;
  currency: string;
  description?: string;
  reference?: string;
}

async function callElektropay(path: string, body: any) {
  const apiKey = Deno.env.get('ELEKTROPAY_API_KEY');
  if (!apiKey) throw new Error('ELEKTROPAY_API_KEY not configured');
  const res = await fetch(`${ELEKTROPAY_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let data: any;
  try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
  if (!res.ok) throw new Error(`Elektropay ${res.status}: ${JSON.stringify(data)}`);
  return data;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const body = (await req.json()) as RequestBody;
    if (!body.asset_id || !body.amount || !body.currency) {
      return json({ success: false, error: 'asset_id, amount, currency required' }, 400);
    }

    // Resolve receiving merchant
    let merchantId = body.merchant_id || null;
    if (!merchantId && body.invoice_id) {
      const { data: inv } = await supabase
        .from('invoices')
        .select('merchant_id, status')
        .eq('id', body.invoice_id)
        .maybeSingle();
      if (!inv) return json({ success: false, error: 'Invoice not found' }, 404);
      if (inv.status === 'paid') return json({ success: false, error: 'Invoice already paid' }, 400);
      merchantId = inv.merchant_id;
    }
    if (!merchantId) return json({ success: false, error: 'merchant context required' }, 400);

    // Find/create the crypto store + wallet for this merchant + asset
    let { data: store } = await supabase
      .from('crypto_stores')
      .select('id, name')
      .eq('merchant_id', merchantId)
      .limit(1)
      .maybeSingle();

    if (!store) {
      const { data: m } = await supabase.from('merchants').select('name').eq('id', merchantId).single();
      const ins = await supabase.from('crypto_stores').insert({
        merchant_id: merchantId,
        name: m?.name || 'Default store',
        base_currency: 'USD',
        metadata: { auto_created: true, source: 'crypto-pay' },
      }).select().single();
      if (ins.error) throw ins.error;
      store = ins.data;
    }

    let { data: wallet } = await supabase
      .from('crypto_wallets')
      .select('*')
      .eq('store_id', store!.id)
      .eq('asset_id', body.asset_id)
      .maybeSingle();

    if (!wallet) {
      let address: string | null = null;
      let network: string | null = null;
      try {
        const ded = await callElektropay('/dedicate', {
          payment_asset_id: body.asset_id,
          dedicate_type: 'USES',
        });
        address = ded?.address || null;
        network = ded?.crypto_network || null;
      } catch (e) {
        console.warn('dedicate failed:', e);
      }
      const ins = await supabase.from('crypto_wallets').insert({
        store_id: store!.id, merchant_id: merchantId, asset_id: body.asset_id,
        network, address,
      }).select().single();
      if (ins.error) throw ins.error;
      wallet = ins.data;
    }

    // Create a fixed-amount payment via Elektropay
    let payment: any = {};
    try {
      payment = await callElektropay('/payment', {
        amount: String(body.amount),
        asset_id: body.asset_id,
        payment_asset_id: body.asset_id,
        payment_type: 'FIXED_AMOUNT',
        fiat_currency: body.currency,
        description: body.description,
      });
    } catch (e) {
      console.warn('payment create failed:', e);
    }

    // Record the pending crypto_transaction
    const { data: tx, error: txErr } = await supabase.from('crypto_transactions').insert({
      wallet_id: wallet.id,
      merchant_id: merchantId,
      store_id: store!.id,
      tx_type: 'deposit',
      status: 'pending',
      asset_id: body.asset_id,
      amount: body.amount,
      to_address: payment?.address || wallet.address,
      elektropay_id: payment?.payment_id,
      description: body.description,
      metadata: {
        source: 'crypto-pay',
        invoice_id: body.invoice_id || null,
        reference: body.reference || null,
        fiat_amount: body.amount,
        fiat_currency: body.currency,
        payment_url: payment?.payment_url,
        raw: payment,
      },
    }).select().single();
    if (txErr) throw txErr;

    return json({
      success: true,
      data: tx,
      address: tx.to_address,
      payment_url: payment?.payment_url || null,
    });
  } catch (e: any) {
    console.error('[crypto-pay] error:', e);
    return json({ success: false, error: e?.message || 'Unexpected error' }, 500);
  }
});

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
