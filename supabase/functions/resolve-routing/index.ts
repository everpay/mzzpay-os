// Server-side authoritative routing resolver.
//
// Returns the SAME provider + matched rule that `process-payment` will use
// at submit time, so the client can validate that the "Matched rule" tooltip
// in NewPayment shows the rule that actually wins. Any drift between client
// and server is surfaced to the operator as a mismatch warning.
//
// This logic MUST stay in lockstep with `src/lib/providers.ts::resolveProvider`
// AND with the routing block in `supabase/functions/process-payment`.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface RuleRow {
  id: string;
  name: string | null;
  priority: number;
  active: boolean;
  currency_match: string[] | null;
  amount_min: number | null;
  amount_max: number | null;
  target_provider: string | null;
  fallback_provider: string | null;
}

interface ResolveBody {
  currency?: string;
  amount?: number | null;
  paymentMethod?: string;
  merchantId?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  let body: ResolveBody;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const currency = (body.currency || '').toUpperCase();
  if (!currency) return json({ error: 'currency is required' }, 400);
  const amount = typeof body.amount === 'number' && isFinite(body.amount) ? body.amount : null;
  const paymentMethod = body.paymentMethod || 'card';

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

  // Resolve merchant — prefer explicit merchantId (hosted checkout) but fall
  // back to the JWT user (admin/merchant portal preview) so this works both
  // for authenticated dashboards and for unauthenticated checkouts that pass
  // a merchantId explicitly.
  let merchantId = body.merchantId || null;
  let gamblingEnabled = false;

  if (!merchantId) {
    const authHeader = req.headers.get('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const { data: u } = await admin.auth.getUser(authHeader.replace('Bearer ', ''));
      if (u?.user) {
        const { data: m } = await admin
          .from('merchants')
          .select('id, gambling_enabled')
          .eq('user_id', u.user.id)
          .maybeSingle();
        if (m) {
          merchantId = m.id;
          gamblingEnabled = !!m.gambling_enabled;
        }
      }
    }
  }

  if (merchantId && !gamblingEnabled) {
    const { data: m } = await admin
      .from('merchants')
      .select('gambling_enabled')
      .eq('id', merchantId)
      .maybeSingle();
    gamblingEnabled = !!m?.gambling_enabled;
  }

  let rules: RuleRow[] = [];
  if (merchantId) {
    const { data } = await (admin.from as any)('routing_rules')
      .select('id, name, priority, active, currency_match, amount_min, amount_max, target_provider, fallback_provider')
      .eq('merchant_id', merchantId)
      .eq('active', true)
      .order('priority', { ascending: true });
    rules = (data ?? []) as RuleRow[];
  }

  // Apply the same selection algorithm as the client + process-payment.
  let matched: RuleRow | null = null;
  for (const r of rules) {
    if (r.active === false) continue;
    const cs = (r.currency_match ?? []).map((c) => c.toUpperCase());
    if (cs.length > 0 && !cs.includes(currency)) continue;
    if (amount != null) {
      if (r.amount_min != null && amount < Number(r.amount_min)) continue;
      if (r.amount_max != null && amount > Number(r.amount_max)) continue;
    }
    matched = r;
    break;
  }

  let provider: string;
  let reason:
    | 'override_rule'
    | 'open_banking'
    | 'gambling_enabled'
    | 'default_policy';

  if (matched && matched.target_provider) {
    provider = matched.target_provider;
    reason = 'override_rule';
  } else if (paymentMethod === 'open_banking') {
    provider = 'mondo';
    reason = 'open_banking';
  } else if (gamblingEnabled) {
    provider = 'matrix';
    reason = 'gambling_enabled';
  } else {
    provider = 'shieldhub';
    reason = 'default_policy';
  }

  return json({
    provider,
    reason,
    matched_rule_id: matched?.id ?? null,
    matched_rule: matched
      ? {
          id: matched.id,
          name: matched.name,
          priority: matched.priority,
          currency_match: matched.currency_match,
          amount_min: matched.amount_min,
          amount_max: matched.amount_max,
          target_provider: matched.target_provider,
          fallback_provider: matched.fallback_provider,
        }
      : null,
    inputs: { currency, amount, paymentMethod, merchantId, gamblingEnabled },
    rules_evaluated: rules.length,
  });
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
