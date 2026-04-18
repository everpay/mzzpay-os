import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function sign(secret: string, body: string) {
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const { merchant_id, event_type, payload } = await req.json();
    if (!merchant_id || !event_type) throw new Error('merchant_id and event_type required');
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    const { data: endpoints } = await supabase.from('webhook_endpoints')
      .select('*').eq('merchant_id', merchant_id).eq('active', true);

    const results: any[] = [];
    for (const ep of endpoints || []) {
      const events = ep.events as string[];
      if (events.length > 0 && !events.includes(event_type)) continue;

      const body = JSON.stringify({ id: crypto.randomUUID(), type: event_type, data: payload, created: Date.now() });
      const signature = await sign(ep.secret, body);
      let status = 'failed', responseStatus: number | null = null, responseBody: string | null = null;
      try {
        const r = await fetch(ep.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Mzzpay-Signature': signature, 'X-Mzzpay-Event': event_type },
          body, signal: AbortSignal.timeout(10000),
        });
        responseStatus = r.status;
        responseBody = (await r.text()).slice(0, 1000);
        status = r.ok ? 'delivered' : 'failed';
      } catch (e) {
        responseBody = String(e).slice(0, 500);
      }
      const { data: delivery } = await supabase.from('webhook_deliveries').insert({
        merchant_id, endpoint_id: ep.id, event_type, payload,
        status, response_status: responseStatus, response_body: responseBody, attempt_count: 1,
        next_retry_at: status === 'failed' ? new Date(Date.now() + 60_000).toISOString() : null,
      }).select().single();
      results.push(delivery);
    }
    return new Response(JSON.stringify({ success: true, dispatched: results.length, results }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
