// Validates email DNS records for a subdomain using Google DNS-over-HTTPS.
// Returns the live records and a per-expected-record verdict.
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

interface ExpectedRecord {
  type: "MX" | "TXT" | "CNAME";
  host: string; // FQDN
  value: string; // canonical expected value (lowercased trailing dot stripped)
  priority?: number;
  label: string;
}

const DOH = "https://dns.google/resolve";

async function resolve(name: string, type: string) {
  const url = `${DOH}?name=${encodeURIComponent(name)}&type=${type}`;
  const r = await fetch(url, { headers: { accept: "application/dns-json" } });
  if (!r.ok) return { Answer: [] as Array<{ data: string; type: number; TTL?: number }> };
  return await r.json() as { Answer?: Array<{ data: string; type: number; TTL?: number }> };
}

const norm = (s: string) => s.trim().toLowerCase().replace(/\.$/, "").replace(/^"|"$/g, "");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { subdomain } = await req.json();
    if (!subdomain || typeof subdomain !== "string") {
      return new Response(JSON.stringify({ error: "subdomain required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const fqdn = subdomain.trim().toLowerCase().replace(/\.$/, "");

    // Lovable-managed email DNS for the delegated subdomain.
    const expected: ExpectedRecord[] = [
      { type: "MX", host: fqdn, value: "feedback-smtp.us-east-1.amazonses.com", priority: 10, label: "Inbound mail (MX)" },
      { type: "TXT", host: fqdn, value: "v=spf1 include:amazonses.com ~all", label: "SPF authorization (TXT)" },
      { type: "TXT", host: `_dmarc.${fqdn}`, value: "v=dmarc1; p=none;", label: "DMARC policy (TXT)" },
      { type: "CNAME", host: `resend._domainkey.${fqdn}`, value: "resend._domainkey.lovable.cloud", label: "DKIM signing key (CNAME)" },
      { type: "CNAME", host: `send.${fqdn}`, value: "send.lovable.cloud", label: "Tracking host (CNAME)" },
    ];

    // Look up live records in parallel.
    const lookups = await Promise.all([
      resolve(fqdn, "MX"),
      resolve(fqdn, "TXT"),
      resolve(`_dmarc.${fqdn}`, "TXT"),
      resolve(`resend._domainkey.${fqdn}`, "CNAME"),
      resolve(`send.${fqdn}`, "CNAME"),
      resolve(fqdn, "NS"),
      resolve(fqdn, "A"),
      resolve(fqdn, "AAAA"),
    ]);

    const [mx, txtRoot, txtDmarc, dkim, send, ns, a, aaaa] = lookups;

    const checks = expected.map((exp) => {
      let live: string[] = [];
      let ok = false;
      let detail = "";

      if (exp.type === "MX") {
        live = (mx.Answer ?? []).map((r) => r.data); // "10 host."
        ok = live.some((l) => norm(l.split(" ").slice(-1)[0]) === norm(exp.value));
      } else if (exp.type === "TXT" && exp.host === fqdn) {
        live = (txtRoot.Answer ?? []).map((r) => r.data);
        ok = live.some((l) => norm(l).startsWith("v=spf1") && norm(l).includes("amazonses.com"));
      } else if (exp.type === "TXT" && exp.host.startsWith("_dmarc.")) {
        live = (txtDmarc.Answer ?? []).map((r) => r.data);
        ok = live.some((l) => norm(l).startsWith("v=dmarc1"));
      } else if (exp.type === "CNAME" && exp.host.startsWith("resend._domainkey.")) {
        live = (dkim.Answer ?? []).map((r) => r.data);
        ok = live.some((l) => norm(l) === norm(exp.value));
      } else if (exp.type === "CNAME" && exp.host.startsWith("send.")) {
        live = (send.Answer ?? []).map((r) => r.data);
        ok = live.some((l) => norm(l) === norm(exp.value));
      }

      if (!ok) {
        detail = live.length === 0 ? "No record found yet (DNS may still be propagating)." : `Found ${live.length} record(s) but none match expected value.`;
      } else {
        detail = "Matches expected value.";
      }

      return { ...exp, live, ok, detail };
    });

    // Conflict detection — extra records that should NOT exist on a subdomain
    // delegated for email-only on a Hostinger-style root zone.
    const conflicts: { host: string; type: string; data: string; reason: string }[] = [];

    for (const r of ns.Answer ?? []) {
      conflicts.push({
        host: fqdn,
        type: "NS",
        data: r.data,
        reason: "NS delegation found. Hostinger does not support NS records on subdomains and this conflicts with MX/TXT/CNAME email records on the same subdomain.",
      });
    }
    for (const r of a.Answer ?? []) {
      conflicts.push({
        host: fqdn,
        type: "A",
        data: r.data,
        reason: "A record on the email subdomain can interfere with mail routing — remove unless this subdomain also serves a website.",
      });
    }
    for (const r of aaaa.Answer ?? []) {
      conflicts.push({
        host: fqdn,
        type: "AAAA",
        data: r.data,
        reason: "AAAA record on the email subdomain can interfere with mail routing — remove unless this subdomain also serves a website.",
      });
    }

    // Extra TXT records on the apex subdomain that aren't SPF.
    const extraTxt = (txtRoot.Answer ?? [])
      .map((r) => r.data)
      .filter((d) => !norm(d).startsWith("v=spf1"));
    for (const d of extraTxt) {
      conflicts.push({
        host: fqdn,
        type: "TXT",
        data: d,
        reason: "Unexpected TXT record on the email subdomain. Only the SPF TXT (v=spf1 …) belongs here.",
      });
    }

    const summary = {
      total: checks.length,
      verified: checks.filter((c) => c.ok).length,
      pending: checks.filter((c) => !c.ok).length,
      conflicts: conflicts.length,
    };

    return new Response(
      JSON.stringify({ subdomain: fqdn, summary, checks, conflicts, expected }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
