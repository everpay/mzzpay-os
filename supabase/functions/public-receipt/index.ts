// Public, unauthenticated receipt lookup. Returns a sanitized snapshot of a
// completed transaction so the public /receipts/:id page and the email
// receipt links can render without exposing merchant-internal fields.
//
// We deliberately omit raw processor responses, internal IDs, IP addresses,
// idempotency keys, and any field that's only meaningful to the merchant.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface ReceiptPayload {
  id: string;
  amount: string;
  currency: string;
  status: string;
  provider: string;
  type: string;
  method: string;
  description: string | null;
  date: string;
  orderId: string | null;
  customerEmail: string | null;
  cardLast4: string | null;
  cardBrand: string | null;
  merchant: { name: string; supportEmail: string | null; logoUrl: string | null; primaryColor: string | null };
  descriptor: string | null;
}

export async function loadReceipt(transactionId: string): Promise<ReceiptPayload | null> {
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
  const { data: tx, error } = await admin
    .from('transactions')
    .select(
      'id, amount, currency, status, provider, payment_method_type, description, created_at, customer_email, card_last4, card_brand, merchant_id'
    )
    .eq('id', transactionId)
    .maybeSingle();

  if (error || !tx) return null;
  // Only show completed payments publicly. Pending/failed receipts leak
  // information about declined attempts and are never shared via email.
  if (tx.status !== 'completed') return null;

  const [{ data: merchant }, { data: processor }] = await Promise.all([
    admin
      .from('merchants')
      .select('name, receipt_support_email, receipt_logo_url, receipt_primary_color')
      .eq('id', tx.merchant_id)
      .maybeSingle(),
    (admin.from as any)('payment_processors')
      .select('acquirer_descriptor')
      .eq('name', tx.provider)
      .maybeSingle(),
  ]);

  return {
    id: tx.id,
    amount: Number(tx.amount).toFixed(2),
    currency: tx.currency,
    status: 'Approved',
    provider: tx.provider,
    type: tx.payment_method_type === 'open_banking' ? 'Open Banking' : 'Card payment',
    method: tx.card_brand
      ? `${tx.card_brand.toUpperCase()} •••• ${tx.card_last4 ?? ''}`
      : tx.payment_method_type === 'open_banking'
      ? 'Open Banking'
      : 'Card',
    description: tx.description ?? null,
    date: new Date(tx.created_at).toISOString().replace('T', ' ').slice(0, 19),
    orderId: null,
    customerEmail: tx.customer_email ?? null,
    cardLast4: tx.card_last4 ?? null,
    cardBrand: tx.card_brand ?? null,
    merchant: {
      name: merchant?.name ?? 'MZZPay Merchant',
      supportEmail: merchant?.receipt_support_email ?? null,
      logoUrl: merchant?.receipt_logo_url ?? null,
      primaryColor: merchant?.receipt_primary_color ?? null,
    },
    descriptor: processor?.acquirer_descriptor ?? null,
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'GET') {
    return json({ error: 'Method not allowed' }, 405);
  }

  const url = new URL(req.url);
  const id =
    url.searchParams.get('id') ||
    url.pathname.split('/').filter(Boolean).pop() ||
    '';

  // UUID v4 sanity check — block enumeration / SQL probing.
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return json({ error: 'Invalid receipt id' }, 400);
  }

  try {
    const receipt = await loadReceipt(id);
    if (!receipt) return json({ error: 'Receipt not found' }, 404);
    return json(receipt);
  } catch (e) {
    console.error('public-receipt error:', e);
    return json({ error: 'Internal error' }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
