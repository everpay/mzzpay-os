// Risonpay (CDN Software Tech) webhook receiver.
//
// Verifies the inbound `x-signature` header using Risonpay's RSA public key
// (SHA256-RSA over the raw request body), then ingests the event into
// `provider_events` and updates the matching `transactions` row.
//
// Env:
//   RISONPAY_PUBLIC_KEY  – PEM (BEGIN PUBLIC KEY) string used to verify webhooks.
//                          Falls back to the bundled backoffice key if unset.
//   SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY  – set by Lovable Cloud.
//
// Webhook payload (per docs §webhooks):
//   { transaction_id, external_id, status, error_code?, error_message?,
//     amount?, currency?, payment_method?, ... }
//
// Status mapping mirrors src/lib/matrix-status.ts conventions.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import {
  applyLedgerCredit,
  ingestProviderEvent,
} from "../_shared/psp-ingest.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-signature, x-short-signature, x-request-id",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Bundled fallback — the Risonpay backoffice public key supplied by the merchant.
// Override via the RISONPAY_PUBLIC_KEY secret in production.
const FALLBACK_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAi3spv6HOgWysRN+SS2P5
tQTLBbfahyDLVD/Z4o9Z71D0tkRCJHNuMQu1cQCb4NhZmmuh6tXUnId20sXNHcFc
AHBZWPYzXRplg/vMBmBorw2//PU1zggoUcsOZMrfxw+eAo4IxfnerSiND7ECAxAB
J2rkVB2pQ4ZjHvm4MoMVl2tlitn0hvzrkW9ceqABJccjxT0s3ltTkZPV4L5niNdh
+2gYSz/k2re08yRwUYzhmWfeFcZwMRvvv4aBEjIJm1vWymYx9CHLKRKo7xBc/wU1
GIn8cLpJpSM1i4eZm1HqJdW6tOk8p6MQSX0UszOTyh4Wb0pEPNSJVh6UicwHwGnt
4wIDAQAB
-----END PUBLIC KEY-----`;

/* -------------------------------------------------------------------------- */
/* Crypto helpers                                                              */
/* -------------------------------------------------------------------------- */

function pemToDer(pem: string): Uint8Array {
  const b64 = pem
    .replace(/-----BEGIN [^-]+-----/g, "")
    .replace(/-----END [^-]+-----/g, "")
    .replace(/\s+/g, "");
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function importRisonpayPublicKey(pem: string): Promise<CryptoKey> {
  return await crypto.subtle.importKey(
    "spki",
    pemToDer(pem),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"],
  );
}

async function verifyRisonpaySignature(
  body: string,
  signatureB64: string,
  pem: string,
): Promise<boolean> {
  try {
    const key = await importRisonpayPublicKey(pem);
    const sigBin = atob(signatureB64.trim());
    const sig = new Uint8Array(sigBin.length);
    for (let i = 0; i < sigBin.length; i++) sig[i] = sigBin.charCodeAt(i);
    const data = new TextEncoder().encode(body);
    return await crypto.subtle.verify(
      "RSASSA-PKCS1-v1_5",
      key,
      sig,
      data,
    );
  } catch (_err) {
    return false;
  }
}

/* -------------------------------------------------------------------------- */
/* Status mapping                                                              */
/* -------------------------------------------------------------------------- */

type InternalStatus = "pending" | "processing" | "completed" | "failed" | "refunded";

function mapRisonpayStatus(s?: string | null): InternalStatus {
  switch ((s || "").toLowerCase()) {
    case "completed":
    case "success":
    case "successful":
    case "captured":
    case "paid":
      return "completed";
    case "failed":
    case "declined":
    case "error":
    case "cancelled":
    case "canceled":
    case "expired":
      return "failed";
    case "refunded":
      return "refunded";
    case "processing":
    case "in_progress":
    case "pending_3ds":
      return "processing";
    case "pending":
    default:
      return "pending";
  }
}

/* -------------------------------------------------------------------------- */
/* Handler                                                                     */
/* -------------------------------------------------------------------------- */

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Read raw body BEFORE parsing — signature is computed over the exact bytes.
  const rawBody = await req.text();
  const signature = req.headers.get("x-signature") || "";
  const requestId = req.headers.get("x-request-id") || crypto.randomUUID();

  const publicKey = Deno.env.get("RISONPAY_PUBLIC_KEY") || FALLBACK_PUBLIC_KEY;

  // Always 200 + structured body so Risonpay's retry storm doesn't 5xx-loop us.
  const ok = signature
    ? await verifyRisonpaySignature(rawBody, signature, publicKey)
    : false;

  if (!signature || !ok) {
    console.warn("[risonpay-webhook] signature verify failed", { requestId, hasSig: !!signature });
    return new Response(
      JSON.stringify({ received: true, verified: false, error: "invalid_signature" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  let payload: Record<string, any> = {};
  try {
    payload = rawBody ? JSON.parse(rawBody) : {};
  } catch {
    return new Response(
      JSON.stringify({ received: true, verified: true, error: "invalid_json" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const externalId: string | undefined =
    payload.external_id || payload.merchant_external_id || payload.order_id;
  const providerRef: string | undefined =
    payload.transaction_id || payload.id || payload.uuid;
  const eventType: string =
    payload.event_type || payload.event || `risonpay.${payload.status || "update"}`;
  const eventId: string | null =
    payload.event_id || payload.notification_id || providerRef || null;
  const mappedStatus = mapRisonpayStatus(payload.status);

  // Locate the transaction by provider_ref first, then external_id (idempotency_key).
  let txRow:
    | { id: string; merchant_id: string; status: string }
    | null = null;
  if (providerRef) {
    const { data } = await supabase
      .from("transactions")
      .select("id, merchant_id, status")
      .eq("provider", "risonpay")
      .eq("provider_ref", providerRef)
      .maybeSingle();
    txRow = data || null;
  }
  if (!txRow && externalId) {
    const { data } = await supabase
      .from("transactions")
      .select("id, merchant_id, status")
      .eq("idempotency_key", externalId)
      .maybeSingle();
    txRow = data || null;
  }

  if (!txRow) {
    // Still log the event for observability — useful for replays/troubleshooting.
    console.warn("[risonpay-webhook] no matching transaction", { providerRef, externalId, requestId });
    return new Response(
      JSON.stringify({ received: true, verified: true, matched: false }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // Idempotent insert into provider_events (dedupes on (provider, webhook_event_id)).
  const ingest = await ingestProviderEvent(supabase, {
    provider: "risonpay" as any, // table accepts free-text; helper enum is widened at runtime
    eventId,
    eventType,
    payload: { ...payload, x_request_id: requestId },
    transactionId: txRow.id,
    merchantId: txRow.merchant_id,
    mappedStatus: mappedStatus === "refunded" ? null : mappedStatus,
  });

  if (ingest.duplicate) {
    return new Response(
      JSON.stringify({ received: true, verified: true, duplicate: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // Apply transaction status update (only forward — never overwrite a terminal state).
  const terminal = ["completed", "failed", "refunded"];
  if (!terminal.includes(txRow.status) || mappedStatus === "refunded") {
    await supabase
      .from("transactions")
      .update({
        status: mappedStatus,
        provider_ref: providerRef ?? undefined,
        processor_error_code: payload.error_code ?? null,
        processor_error_message: payload.error_message ?? null,
        processor_raw_response: payload,
        updated_at: new Date().toISOString(),
      })
      .eq("id", txRow.id);

    if (mappedStatus === "completed") {
      await applyLedgerCredit(supabase, txRow.id);
    }
  }

  return new Response(
    JSON.stringify({ received: true, verified: true, matched: true, status: mappedStatus }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
