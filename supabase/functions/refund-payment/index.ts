import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing authorization');
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) throw new Error('Unauthorized');

    const { transactionId, amount, reason } = await req.json();
    if (!transactionId || !amount) throw new Error('transactionId and amount required');

    const { data: merchant } = await supabase.from('merchants').select('id').eq('user_id', user.id).single();
    if (!merchant) throw new Error('Merchant not found');

    const { data: txn, error: txErr } = await supabase
      .from('transactions').select('*').eq('id', transactionId).eq('merchant_id', merchant.id).single();
    if (txErr || !txn) throw new Error('Transaction not found');
    if (txn.status !== 'completed') throw new Error('Only completed transactions can be refunded');
    if (Number(amount) > Number(txn.amount)) throw new Error('Refund exceeds transaction amount');

    const { data: refund, error: rErr } = await supabase.from('refunds').insert({
      merchant_id: merchant.id,
      transaction_id: transactionId,
      amount: Number(amount),
      currency: txn.currency,
      reason: reason || null,
      provider: txn.provider,
      status: 'completed',
    }).select().single();
    if (rErr) throw rErr;

    if (Number(amount) === Number(txn.amount)) {
      await supabase.from('transactions').update({ status: 'refunded' }).eq('id', transactionId);
    }

    await supabase.from('audit_logs').insert({
      merchant_id: merchant.id,
      user_id: user.id,
      action: 'refund.created',
      entity_type: 'refund',
      entity_id: refund.id,
      metadata: { transactionId, amount, reason },
    });

    return new Response(JSON.stringify({ success: true, refund }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: msg }), {
      status: msg === 'Unauthorized' ? 401 : 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
