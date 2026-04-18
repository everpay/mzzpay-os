import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TRANSITIONS: Record<string, string[]> = {
  pending: ['processing', 'completed', 'failed', 'cancelled'],
  processing: ['completed', 'failed', 'cancelled'],
  completed: ['refunded', 'chargeback'],
  failed: ['pending'],
  refunded: [],
  chargeback: ['won', 'lost'],
  won: [],
  lost: [],
  cancelled: [],
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const { transactionId, newStatus, metadata } = await req.json();
    if (!transactionId || !newStatus) throw new Error('transactionId and newStatus required');
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    const { data: tx } = await supabase.from('transactions').select('*').eq('id', transactionId).single();
    if (!tx) throw new Error('Transaction not found');
    const allowed = TRANSITIONS[tx.status] || [];
    if (!allowed.includes(newStatus)) {
      throw new Error(`Invalid transition: ${tx.status} → ${newStatus}`);
    }
    const { error } = await supabase.from('transactions').update({ status: newStatus }).eq('id', transactionId);
    if (error) throw error;

    await supabase.from('audit_logs').insert({
      merchant_id: tx.merchant_id,
      action: `transaction.${newStatus}`,
      entity_type: 'transaction',
      entity_id: transactionId,
      metadata: { from: tx.status, to: newStatus, ...metadata },
    });

    return new Response(JSON.stringify({ success: true, from: tx.status, to: newStatus }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
