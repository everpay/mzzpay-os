// risonpay-process — creates transactions on RisonPay covering both
// server-side card capture (sending_card_details=true) and APM (hosted)
// flows. Routes to sandbox or production by RISONPAY_ENVIRONMENT.
//
// Body (validated):
//   { mode: 'card' | 'apm', amount, currency, external_id,
//     payment_method?: string,                  // for APM
//     return_url?: string, callback_url?: string,
//     card?: { number, cvv, expire, holder },   // for card mode
//     customer?: { email, first_name, last_name, country } }
//
// Returns 200 with { ok, transaction_id, payment_url?, status, raw }.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SANDBOX = "https://api-dev.cdnsoftwaretech.com";
const PROD = "https://api.cdnsoftwaretech.com";

function baseUrl(): string {
  const env = (Deno.env.get("RISONPAY_ENVIRONMENT") || "sandbox").toLowerCase();
  return env === "production" ? PROD : SANDBOX;
}

async function signRsaSha256(body: string, pemPrivateKey: string): Promise<string> {
  const b64 = pemPrivateKey
    .replace(/-----BEGIN [^-]+-----/g, "")
    .replace(/-----END [^-]+-----/g, "")
    .replace(/\s+/g, "");
  const bin = atob(b64);
  const der = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) der[i] = bin.charCodeAt(i);
  const key = await crypto.subtle.importKey(
    "pkcs8",
    der,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(body),
  );
  let s = "";
  for (const b of new Uint8Array(sig)) s += String.fromCharCode(b);
  return btoa(s);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return json({ error: "method_not_allowed" }, 405);
  }

  const merchantId = Deno.env.get("RISONPAY_MERCHANT_ID");
  const privateKey = Deno.env.get("RISONPAY_PRIVATE_KEY");
  if (!merchantId || !privateKey) {
    return json({ ok: false, error: "risonpay_credentials_missing" }, 200);
  }

  let body: any;
  try { body = await req.json(); } catch { return json({ error: "invalid_json" }, 400); }

  const { mode, amount, currency, external_id, payment_method, card, customer, return_url, callback_url } = body || {};
  if (!mode || !amount || !currency || !external_id) {
    return json({ ok: false, error: "missing_fields", required: ["mode", "amount", "currency", "external_id"] }, 200);
  }
  if (Number(amount) < 10) {
    return json({ ok: false, error: "amount_below_minimum", message: "RisonPay sandbox minimum is 10.00 EUR" }, 200);
  }

  // Build RisonPay request payload
  const payload: Record<string, any> = {
    merchant_id: merchantId,
    external_id,
    amount: Number(amount),
    currency,
    return_url: return_url || "https://mzzpay.io/checkout/return",
    callback_url:
      callback_url ||
      `${Deno.env.get("SUPABASE_URL")}/functions/v1/risonpay-webhook`,
    customer: customer || {},
  };

  if (mode === "card") {
    if (!card?.number || !card?.cvv || !card?.expire) {
      return json({ ok: false, error: "missing_card_details" }, 200);
    }
    payload.sending_card_details = true;
    payload.card = card;
  } else if (mode === "apm") {
    payload.payment_method = payment_method || "bank_transfer";
    payload.sending_card_details = false;
  } else {
    return json({ ok: false, error: "invalid_mode" }, 200);
  }

  const bodyStr = JSON.stringify(payload);
  let signature = "";
  try {
    signature = await signRsaSha256(bodyStr, privateKey);
  } catch (e) {
    console.error("[risonpay-process] sign failed", e);
    return json({ ok: false, error: "signature_failed" }, 200);
  }

  const endpoint = mode === "card"
    ? `${baseUrl()}/p/payment/card_details`
    : `${baseUrl()}/p/payment`;

  let upstream: any = null;
  let status = 0;
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-signature": signature,
        "x-short-signature": signature.slice(0, 64),
      },
      body: bodyStr,
    });
    status = res.status;
    const text = await res.text();
    try { upstream = JSON.parse(text); } catch { upstream = { raw: text }; }
  } catch (e) {
    return json({ ok: false, error: "network_error", message: String(e) }, 200);
  }

  // Persist transaction shadow row in our DB so the webhook can match it.
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const auth = req.headers.get("authorization") || "";
    const token = auth.replace(/^Bearer\s+/i, "");
    let merchantRow: { id: string } | null = null;
    if (token) {
      const { data: { user } } = await supabase.auth.getUser(token);
      if (user) {
        const { data } = await supabase
          .from("merchants").select("id").eq("user_id", user.id).maybeSingle();
        merchantRow = data;
      }
    }
    if (merchantRow) {
      await supabase.from("transactions").insert({
        merchant_id: merchantRow.id,
        amount: Number(amount),
        currency,
        status: "pending",
        provider: "risonpay",
        provider_ref: upstream?.transaction_id ?? upstream?.id ?? null,
        idempotency_key: external_id,
        payment_method_type: mode === "card" ? (card?.brand || "card") : (payment_method || "apm"),
        processor_raw_response: { request_mode: mode, upstream },
      });
    }
  } catch (e) {
    console.warn("[risonpay-process] tx insert failed", e);
  }

  return json({
    ok: status >= 200 && status < 300,
    mode,
    transaction_id: upstream?.transaction_id ?? upstream?.id ?? null,
    payment_url: upstream?.payment_url ?? null,
    status: upstream?.status ?? null,
    upstream_http_status: status,
    raw: upstream,
  }, 200);
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
