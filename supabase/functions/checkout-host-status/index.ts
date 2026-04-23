// Reports whether the dedicated checkout subdomain (default: checkout.mzzpay.io)
// is reachable AND preserves query parameters end-to-end. Used by the merchant
// dashboard to surface the live status before they save / share payment links.
//
// Strategy:
//   1. HEAD the root of the subdomain. If we get a 200/2xx with text/html, the
//      SPA is being served directly — best case.
//   2. If we get a redirect (3xx), follow the Location header and check whether
//      the original query parameters survived. CDN rules that strip the query
//      string are the #1 reason hosted checkout breaks; we explicitly detect it.
//   3. We never throw on the network — the dashboard always wants a structured
//      JSON answer it can render.

import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

const DEFAULT_HOST = "checkout.mzzpay.io";
const APEX_HOST = "mzzpay.io";

// Magic markers we use to detect query-string preservation through redirects.
const PROBE_PARAM = "__probe";
const PROBE_VALUE = `mzz-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

interface HostCheckResult {
  host: string;
  apexHost: string;
  reachable: boolean;
  preservesQuery: boolean;
  servesSpa: boolean;
  status: "active" | "redirected" | "broken" | "unreachable";
  message: string;
  details: {
    initialStatus: number | null;
    finalStatus: number | null;
    finalUrl: string | null;
    redirectChain: string[];
    contentType: string | null;
    latencyMs: number | null;
  };
}

async function probeHost(host: string): Promise<HostCheckResult> {
  const started = Date.now();
  const probeUrl = `https://${host}/?${PROBE_PARAM}=${PROBE_VALUE}&currency=USD`;

  const result: HostCheckResult = {
    host,
    apexHost: APEX_HOST,
    reachable: false,
    preservesQuery: false,
    servesSpa: false,
    status: "unreachable",
    message: "",
    details: {
      initialStatus: null,
      finalStatus: null,
      finalUrl: null,
      redirectChain: [],
      contentType: null,
      latencyMs: null,
    },
  };

  try {
    // Step 1 — manual redirect to inspect the chain ourselves.
    const initial = await fetch(probeUrl, {
      method: "GET",
      redirect: "manual",
      headers: { "user-agent": "MZZPay-CheckoutProbe/1.0" },
    });
    await initial.body?.cancel();
    result.details.initialStatus = initial.status;
    result.reachable = true;

    if (initial.status >= 200 && initial.status < 300) {
      // Direct hit — best case.
      const ct = initial.headers.get("content-type");
      result.details.contentType = ct;
      result.servesSpa = !!ct && ct.includes("text/html");
      // Same-origin response always preserves the query string.
      result.preservesQuery = true;
      result.details.finalStatus = initial.status;
      result.details.finalUrl = probeUrl;
      result.status = result.servesSpa ? "active" : "broken";
      result.message = result.servesSpa
        ? `${host} is serving the checkout SPA directly.`
        : `${host} responded ${initial.status} but did not return HTML.`;
    } else if (initial.status >= 300 && initial.status < 400) {
      // Follow redirects (cap at 5) and check query preservation on the final hop.
      const chain: string[] = [];
      let current = initial.headers.get("location");
      let last: Response | null = initial;
      let hops = 0;
      while (current && hops < 5) {
        const nextUrl = new URL(current, `https://${host}`).toString();
        chain.push(nextUrl);
        const next = await fetch(nextUrl, {
          method: "GET",
          redirect: "manual",
          headers: { "user-agent": "MZZPay-CheckoutProbe/1.0" },
        });
        await next.body?.cancel();
        last = next;
        if (next.status >= 300 && next.status < 400) {
          current = next.headers.get("location");
          hops += 1;
        } else {
          break;
        }
      }

      result.details.redirectChain = chain;
      result.details.finalStatus = last?.status ?? null;
      const finalUrl = chain[chain.length - 1] ?? null;
      result.details.finalUrl = finalUrl;
      result.details.contentType = last?.headers.get("content-type") ?? null;

      if (finalUrl) {
        try {
          const u = new URL(finalUrl);
          result.preservesQuery = u.searchParams.get(PROBE_PARAM) === PROBE_VALUE;
        } catch {
          result.preservesQuery = false;
        }
      }

      result.servesSpa =
        !!result.details.contentType && result.details.contentType.includes("text/html");

      if (!result.preservesQuery) {
        result.status = "broken";
        result.message = `${host} redirects to ${finalUrl ?? "unknown"} but strips the query string. Customers will lose payment context.`;
      } else if (!result.servesSpa) {
        result.status = "broken";
        result.message = `${host} redirects but does not return HTML at the destination.`;
      } else {
        result.status = "redirected";
        result.message = `${host} redirects to ${finalUrl} and preserves the query string. OK but adds an extra hop.`;
      }
    } else {
      result.status = "broken";
      result.message = `${host} returned HTTP ${initial.status}.`;
    }
  } catch (err) {
    result.reachable = false;
    result.status = "unreachable";
    result.message = `Could not reach ${host}: ${(err as Error).message}`;
  } finally {
    result.details.latencyMs = Date.now() - started;
  }

  return result;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  let host = DEFAULT_HOST;
  try {
    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      if (body && typeof body.host === "string" && body.host.trim()) {
        host = body.host.trim();
      }
    } else {
      const url = new URL(req.url);
      const q = url.searchParams.get("host");
      if (q && q.trim()) host = q.trim();
    }
  } catch {
    // ignore — keep default
  }

  // Reject obviously dangerous input (only allow plausible hostnames).
  if (!/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(host)) {
    return new Response(
      JSON.stringify({ error: "invalid host" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const subdomainResult = await probeHost(host);
  const apexResult = host === APEX_HOST ? subdomainResult : await probeHost(APEX_HOST);

  const recommended = subdomainResult.status === "active" || subdomainResult.status === "redirected"
    ? "subdomain"
    : "apex";

  const payload = {
    checkedAt: new Date().toISOString(),
    recommended,
    subdomain: subdomainResult,
    apex: apexResult,
    summary:
      subdomainResult.status === "active"
        ? `Checkout subdomain (${host}) is healthy.`
        : subdomainResult.status === "redirected"
          ? `Checkout subdomain (${host}) works but adds a redirect hop.`
          : `Checkout subdomain (${host}) is not safe to use yet — use the apex (${APEX_HOST}/checkout) for now.`,
  };

  return new Response(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
