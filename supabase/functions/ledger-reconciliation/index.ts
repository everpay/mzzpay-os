// Nightly Ledger Reconciliation Worker
//
// Schedule: invoke daily (e.g. 02:00 UTC) via cron.
// For each completed transaction in the window:
//   1. Sum ledger_entries credits → expected merchant credit
//   2. Compare against transaction.amount and provider_events payload amounts
//   3. For FX transactions, validate fx_rate * amount ≈ settlement_amount (±0.5%)
//   4. Flag any mismatch into reconciliation_mismatches for human review
//
// Writes a single reconciliation_runs row summarising the pass.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const FX_TOLERANCE = 0.005;     // 0.5% drift allowed
const AMOUNT_TOLERANCE = 0.01;  // 1 cent

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { hours = 24, merchantId = null } = await req.json().catch(() => ({}));
    const windowEnd = new Date();
    const windowStart = new Date(windowEnd.getTime() - hours * 3600_000);

    let q = supabase.from('transactions')
      .select('id, merchant_id, amount, currency, fx_rate, settlement_amount, settlement_currency, provider, provider_ref, status')
      .gte('created_at', windowStart.toISOString())
      .lte('created_at', windowEnd.toISOString())
      .eq('status', 'completed');
    if (merchantId) q = q.eq('merchant_id', merchantId);

    const { data: txs, error: txErr } = await q;
    if (txErr) throw txErr;

    const mismatches: Array<Record<string, unknown>> = [];

    for (const tx of txs || []) {
      // Pull ledger credit total + provider events for this tx in parallel
      const [{ data: ledger }, { data: events }] = await Promise.all([
        supabase.from('ledger_entries')
          .select('amount, currency, entry_type')
          .eq('transaction_id', tx.id),
        supabase.from('provider_events')
          .select('payload, event_type')
          .eq('transaction_id', tx.id),
      ]);

      const credits = (ledger || []).filter(l => l.entry_type === 'credit');
      const ledgerSum = credits.reduce((s, l) => s + Number(l.amount || 0), 0);

      // 1. Missing ledger credit on a completed tx → flag
      if (credits.length === 0) {
        mismatches.push({
          transaction_id: tx.id, merchant_id: tx.merchant_id,
          mismatch_type: 'missing_ledger',
          expected_amount: tx.amount, actual_amount: 0,
          expected_currency: tx.currency,
          details: { reason: 'completed transaction has no ledger credit' },
        });
        continue;
      }

      // 2. Ledger amount must match transaction amount
      if (Math.abs(ledgerSum - Number(tx.amount)) > AMOUNT_TOLERANCE) {
        mismatches.push({
          transaction_id: tx.id, merchant_id: tx.merchant_id,
          mismatch_type: 'amount',
          expected_amount: tx.amount, actual_amount: ledgerSum,
          expected_currency: tx.currency, actual_currency: credits[0]?.currency,
          details: { credits: credits.length },
        });
      }

      // 3. FX sanity check
      if (tx.fx_rate && tx.settlement_amount && tx.currency !== tx.settlement_currency) {
        const expectedSettlement = Number(tx.amount) * Number(tx.fx_rate);
        const drift = Math.abs(expectedSettlement - Number(tx.settlement_amount)) / expectedSettlement;
        if (drift > FX_TOLERANCE) {
          mismatches.push({
            transaction_id: tx.id, merchant_id: tx.merchant_id,
            mismatch_type: 'fx_rate',
            expected_amount: expectedSettlement, actual_amount: tx.settlement_amount,
            expected_currency: tx.settlement_currency, actual_currency: tx.settlement_currency,
            fx_rate_expected: tx.fx_rate, fx_rate_actual: Number(tx.settlement_amount) / Number(tx.amount),
            details: { drift_pct: (drift * 100).toFixed(3) },
          });
        }
      }

      // 4. Cross-check provider-reported amount when present in webhook payload
      const providerAmount = (events || [])
        .map(e => Number((e.payload as any)?.amount ?? (e.payload as any)?.transactions?.[0]?.amount))
        .find(n => Number.isFinite(n) && n > 0);
      if (providerAmount && Math.abs(providerAmount - Number(tx.amount)) > AMOUNT_TOLERANCE) {
        mismatches.push({
          transaction_id: tx.id, merchant_id: tx.merchant_id,
          mismatch_type: 'settlement',
          expected_amount: tx.amount, actual_amount: providerAmount,
          expected_currency: tx.currency, actual_currency: tx.currency,
          details: { provider: tx.provider, source: 'webhook_payload' },
        });
      }
    }

    // Write the run + mismatches
    const { data: run } = await supabase.from('reconciliation_runs').insert({
      window_start: windowStart.toISOString(),
      window_end: windowEnd.toISOString(),
      transactions_checked: txs?.length ?? 0,
      mismatches_found: mismatches.length,
      status: mismatches.length > 0 ? 'mismatches_found' : 'clean',
      notes: { hours, merchantId },
    }).select('id').single();

    if (mismatches.length && run?.id) {
      await supabase.from('reconciliation_mismatches').insert(
        mismatches.map(m => ({ ...m, run_id: run.id })),
      );
    }

    return new Response(JSON.stringify({
      success: true,
      run_id: run?.id,
      transactions_checked: txs?.length ?? 0,
      mismatches: mismatches.length,
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error('[Reconciliation] error', e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
