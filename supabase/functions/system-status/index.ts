// System Status probe — checks the live availability of the routing-critical
// integrations the admin panel depends on:
//   1. Shieldhub  — primary 2D card MID (api.shieldhub upstream)
//   2. Open Banking (Mondo) — EU/UK 3DS + SEPA path
//   3. processor-routes Edge Function — internal routing config endpoint
//
// We deliberately ping the public health/landing surface of each provider with
// a short timeout. The goal is "is this reachable from our edge runtime right
// now" — not a deep API auth check. Each result is structured so the dashboard
// can render a status pill and a "last error" link to the most recent
// `provider_events` row whose payload signals a failure.
//
// Returns a single JSON object so the UI can render with one fetch.

import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface ProbeResult {
  id: "shieldhub" | "open_banking" | "processor_routes";
  label: string;
  status: "healthy" | "degraded" | "down";
  http_status: number | null;
  latency_ms: number | null;
  message: string;
  last_error?: {
    event_id: string;
    transaction_id: string | null;
    occurred_at: string;
    summary: string;
  } | null;
}

async function probe(
  url: string,
  opts: { method?: string; headers?: Record<string, string>; timeoutMs?: number } = {},
): Promise<{ status: number | null; latencyMs: number; ok: boolean; error?: string }> {
  const started = Date.now();
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? 6000);
  try {
    const r = await fetch(url, {
      method: opts.method ?? "GET",
      headers: { "user-agent": "MZZPay-SystemStatus/1.0", ...(opts.headers ?? {}) },
      redirect: "manual",
      signal: ctrl.signal,
    });
    await r.body?.cancel();
    return {
      status: r.status,
      latencyMs: Date.now() - started,
      // Treat any non-5xx response as "the upstream answered". A 401/403 from
      // an unauthenticated probe still proves the host is up.
      ok: r.status < 500,
    };
  } catch (e) {
    return {
      status: null,
      latencyMs: Date.now() - started,
      ok: false,
      error: (e as Error).message,
    };
  } finally {
    clearTimeout(t);
  }
}

async function fetchLastError(
  admin: ReturnType<typeof createClient>,
  provider: string,
): Promise<ProbeResult["last_error"]> {
  const { data } = await (admin as any)
    .from("provider_events")
    .select("id, transaction_id, created_at, event_type, payload")
    .eq("provider", provider)
    .or("event_type.ilike.%fail%,event_type.ilike.%error%,event_type.ilike.%declin%")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  const p: any = data.payload ?? {};
  const summary =
    p?.error?.message ||
    p?.gateway_message ||
    p?.message ||
    p?.error_message ||
    data.event_type ||
    "Unknown error";
  return {
    event_id: data.id,
    transaction_id: data.transaction_id ?? null,
    occurred_at: data.created_at,
    summary: String(summary).slice(0, 280),
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

  // Fire all three probes in parallel for a snappy panel.
  const [shieldRes, mondoRes, routesRes, shieldErr, mondoErr] = await Promise.all([
    probe("https://api.shieldhub.com/", { timeoutMs: 6000 }),
    // Mondo Open Banking S2S endpoint actually used by process-payment.
    probe("https://server-to-server.getmondo.co/", { timeoutMs: 6000 }),
    probe(`${SUPABASE_URL}/functions/v1/processor-routes`, {
      timeoutMs: 6000,
      // No auth header on purpose — a 401 means the function is alive.
    }),
    fetchLastError(admin, "shieldhub").catch(() => null),
    fetchLastError(admin, "mondo").catch(() => null),
  ]);

  const classify = (
    p: { status: number | null; ok: boolean; error?: string },
  ): ProbeResult["status"] => {
    if (p.status === null) return "down";
    if (!p.ok) return "down";
    // 401/403 from upstream public probe = healthy reachability.
    return "healthy";
  };

  const results: ProbeResult[] = [
    {
      id: "shieldhub",
      label: "Shieldhub (Primary 2D card)",
      status: classify(shieldRes),
      http_status: shieldRes.status,
      latency_ms: shieldRes.latencyMs,
      message:
        shieldRes.error ??
        (shieldRes.status === null
          ? "Unreachable"
          : `Upstream responded with HTTP ${shieldRes.status}`),
      last_error: shieldErr,
    },
    {
      id: "open_banking",
      label: "Open Banking (Mondo · EU/UK)",
      status: classify(mondoRes),
      http_status: mondoRes.status,
      latency_ms: mondoRes.latencyMs,
      message:
        mondoRes.error ??
        (mondoRes.status === null
          ? "Unreachable"
          : `Upstream responded with HTTP ${mondoRes.status}`),
      last_error: mondoErr,
    },
    {
      id: "processor_routes",
      label: "processor-routes Edge Function",
      status:
        routesRes.status === null
          ? "down"
          : routesRes.status >= 500
            ? "down"
            : "healthy",
      http_status: routesRes.status,
      latency_ms: routesRes.latencyMs,
      message:
        routesRes.error ??
        (routesRes.status === null
          ? "Unreachable"
          : `Function responded with HTTP ${routesRes.status}`),
      last_error: null,
    },
  ];

  const overall: "healthy" | "degraded" | "down" = results.every((r) => r.status === "healthy")
    ? "healthy"
    : results.some((r) => r.status === "down")
      ? "degraded"
      : "healthy";

  return new Response(
    JSON.stringify({ checked_at: new Date().toISOString(), overall, services: results }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
