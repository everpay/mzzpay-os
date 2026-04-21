// Public API: GET /processor-routes
// Returns the merchant's routing rules, fee profiles, and assigned acquirers.
// Auth: Bearer token (Supabase JWT) OR x-api-key header (merchant.api_key_hash).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    let merchantId: string | null = null;

    // 1. API key auth
    const apiKey = req.headers.get('x-api-key');
    if (apiKey) {
      const { data: m } = await admin.from('merchants').select('id').eq('api_key_hash', apiKey).maybeSingle();
      merchantId = m?.id ?? null;
    }

    // 2. JWT auth fallback
    if (!merchantId) {
      const authHeader = req.headers.get('Authorization');
      if (authHeader?.startsWith('Bearer ')) {
        const { data: u } = await admin.auth.getUser(authHeader.replace('Bearer ', ''));
        if (u?.user) {
          const { data: m } = await admin.from('merchants').select('id').eq('user_id', u.user.id).maybeSingle();
          merchantId = m?.id ?? null;
        }
      }
    }

    if (!merchantId) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const [rulesQ, feesQ, midsQ] = await Promise.all([
      admin.from('routing_rules').select('*').eq('merchant_id', merchantId).order('priority'),
      admin.from('processor_fee_profiles').select('*').eq('merchant_id', merchantId),
      admin.from('merchant_acquirer_mids')
        .select('*, acquirer:acquirers(name, country, success_rate, avg_latency_ms, active)')
        .eq('merchant_id', merchantId).order('priority'),
    ]);

    return new Response(JSON.stringify({
      merchant_id: merchantId,
      routing_rules: rulesQ.data || [],
      fee_profiles: feesQ.data || [],
      acquirers: midsQ.data || [],
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message || 'Internal error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
