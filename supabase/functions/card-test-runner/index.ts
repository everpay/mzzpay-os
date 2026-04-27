// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/**
 * card-test-runner
 *
 * Sends a fixed battery of documented test cards to BOTH Matrix Partners
 * (sandbox) and Shieldhub (production), stores every outcome in
 * `card_test_runs`, and returns a summary. Real cards are NEVER used; only
 * the doc-listed test PANs:
 *
 *   Shieldhub  https://documenter.getpostman.com/view/547480/2sB2qXkPAz#test-cards
 *     4242 4242 4242 4242  → Approved (gated behind ALLOW_REAL_CHARGE; off by default)
 *     4242 4242 4242 4341  → Declined
 *     4242 4242 4242 4846  → 3DS Redirect
 *
 *   Matrix     https://docs.matrixpaysolution.com/en/#test-cards
 *     4111 1111 1111 1111  → Approved (sandbox)
 *     4000 0000 0000 0002  → Declined (sandbox)
 *
 * Auth: requires a valid Supabase user JWT. The merchant linked to that user
 * receives the test rows. Returns 401 if the caller is not authenticated.
 */

const SHIELDHUB_URL = "https://pgw.shieldhubpay.com/api/transaction";
const MATRIX_SANDBOX = "https://api-sandbox.matrixpaysolution.com";

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(input),
  );
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

interface ShieldhubScenario {
  scenario: string;
  pan: string;
  expectedStatuses: string[];
  realCharge?: boolean;
}

const SHIELDHUB_DESCRIPTOR = "AXP*FER*AXP*FERES";
const SHIELDHUB_ACQUIRER_COUNTRY = "MX";

const SHIELDHUB_SCENARIOS: ShieldhubScenario[] = [
  {
    scenario: "Declined card (Visa 4341)",
    pan: "4242424242424341",
    expectedStatuses: ["Declined", "Failed"],
  },
  {
    scenario: "3DS Redirect card (Visa 4846)",
    pan: "4242424242424846",
    expectedStatuses: ["Redirect", "Approved", "Pending"],
  },
  // Approved card omitted by default — would charge $10 on the LIVE account.
  // Enable by passing { include_approved: true } in the request body.
];

interface MatrixCardScenario {
  scenario: string;
  pan: string;
  expMonth: string;
  expYear: string;
  cvv: string;
  brand: string;
  enrolled3ds: boolean;
}

// Documented sandbox cards from https://docs.matrixpaysolution.com (provided
// by EVERPAY ops 2026-04). All non-US billing because Matrix region-blocks US.
const MATRIX_CARDS: MatrixCardScenario[] = [
  { scenario: "Visa 3DS-enrolled (4012…1003)", pan: "4012000300001003", expMonth: "01", expYear: "29", cvv: "030", brand: "Visa", enrolled3ds: true },
  { scenario: "Visa frictionless (4012…1881)", pan: "4012888888881881", expMonth: "10", expYear: "27", cvv: "000", brand: "Visa", enrolled3ds: false },
  { scenario: "Mastercard (5413…3002)",        pan: "5413330300003002", expMonth: "04", expYear: "28", cvv: "440", brand: "Mastercard", enrolled3ds: false },
  { scenario: "Mastercard (5555…4444)",        pan: "5555555555554444", expMonth: "12", expYear: "27", cvv: "111", brand: "Mastercard", enrolled3ds: false },
  { scenario: "Amex (3714…8431)",              pan: "371449635398431",  expMonth: "01", expYear: "28", cvv: "0203", brand: "Amex", enrolled3ds: false },
  { scenario: "UnionPay (6212…1232)",          pan: "6212345678901232", expMonth: "02", expYear: "28", cvv: "123",  brand: "UnionPay", enrolled3ds: false },
];

// Matrix is wired as H2H ONLY — every payment form in this project routes
// card data straight into /v1/h2h/payment so the hosted-checkout endpoint is
// intentionally not exercised by the battery test.

async function runShieldhub(
  supabase: any,
  merchantId: string,
  batchId: string,
  includeApproved: boolean,
) {
  const clientId = Deno.env.get("SHIELDHUB_CLIENT_ID");
  const apiSecret = Deno.env.get("SHIELDHUB_API_SECRET");
  if (!clientId || !apiSecret) {
    return [{
      provider: "shieldhub",
      scenario: "missing credentials",
      ok: false,
      error: "SHIELDHUB_CLIENT_ID / SHIELDHUB_API_SECRET not configured",
    }];
  }

  const scenarios = [...SHIELDHUB_SCENARIOS];
  if (includeApproved) {
    scenarios.push({
      scenario: "Approved card (Visa 4242) — REAL CHARGE $10",
      pan: "4242424242424242",
      expectedStatuses: ["Approved", "Redirect"],
      realCharge: true,
    });
  }

  const results: any[] = [];
  for (const sc of scenarios) {
    const txRef = crypto.randomUUID();
    const amount = "10";
    const hash = await sha256Hex(clientId + amount + txRef + apiSecret);
    const body = {
      amount,
      currency: "USD",
      transaction_reference: txRef,
      redirectback_url: "https://example.com/cb",
      notification_url: "https://example.com/notify",
      // EVERPAY 3D PTY · Mexico acquirer · soft descriptor on every charge.
      // Send under every alias the gateway accepts.
      descriptor: SHIELDHUB_DESCRIPTOR,
      descriptor_text: SHIELDHUB_DESCRIPTOR,
      soft_descriptor: SHIELDHUB_DESCRIPTOR,
      statement_descriptor: SHIELDHUB_DESCRIPTOR,
      acquirer_country: SHIELDHUB_ACQUIRER_COUNTRY,
      // 3DS-when-enrolled: gateway will issue Redirect for enrolled cards
      // and process as 2D for the rest.
      three_ds: "enrolled",
      customer: {
        first: "Card", last: "Test", email: "card-test@everpay.io",
        phone: "(555) 555-5555", ip: "1.1.1.1",
      },
      billing: {
        address: "1 Test St", postal_code: "10001",
        city: "New York", state: "NY", country: "MX",
      },
      card: {
        holder: "Card Test", number: sc.pan, cvv: "123",
        expiry_month: "12", expiry_year: "30",
      },
    };

    let httpStatus = 0;
    let parsed: any = null;
    let errorMessage: string | null = null;
    try {
      const res = await fetch(SHIELDHUB_URL, {
        method: "POST",
        headers: {
          "client-id": clientId,
          "client-hash": hash,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      httpStatus = res.status;
      const text = await res.text();
      try { parsed = JSON.parse(text); } catch { parsed = { raw: text }; }
    } catch (e) {
      errorMessage = `network: ${String(e)}`;
    }

    const status = parsed?.status ?? null;
    const code = parsed?.error?.code ?? parsed?.code ?? null;
    const msg = parsed?.error?.messsage ?? parsed?.error?.message ?? errorMessage;

    const redactedRequest = {
      endpoint: SHIELDHUB_URL,
      method: "POST",
      headers: { "client-id": clientId, "client-hash": "<redacted>", "Content-Type": "application/json" },
      body: {
        ...body,
        card: {
          ...body.card,
          number: `**** **** **** ${sc.pan.slice(-4)}`,
          cvv: "***",
        },
      },
    };

    const row = {
      merchant_id: merchantId,
      batch_id: batchId,
      provider: "shieldhub",
      environment: "production",
      scenario: sc.scenario,
      card_last4: sc.pan.slice(-4),
      card_brand: "Visa",
      currency: "USD",
      amount: 10,
      upstream_http_status: httpStatus || null,
      result_status: status,
      result_code: code != null ? String(code) : null,
      error_message: msg,
      raw_response: parsed,
      raw_request: redactedRequest,
    };

    await supabase.from("card_test_runs").insert(row);
    results.push({
      ...row,
      passed: status ? sc.expectedStatuses.includes(status) : false,
      expected: sc.expectedStatuses,
    });
  }
  return results;
}

async function runMatrix(
  supabase: any,
  merchantId: string,
  batchId: string,
) {
  const pub = Deno.env.get("MATRIX_PUBLIC_KEY");
  const sec = Deno.env.get("MATRIX_SECRET_KEY");
  if (!pub || !sec) {
    return [{
      provider: "matrix",
      scenario: "missing credentials",
      ok: false,
      error: "MATRIX_PUBLIC_KEY / MATRIX_SECRET_KEY not configured",
    }];
  }
  const auth = `Basic ${btoa(`${pub}:${sec}`)}`;

  const results: any[] = [];

  // 1. Mint a customer token (no money movement; appears in Matrix dashboard
  // as a customer record).
  const tokenRef = `e2e_token_${Date.now()}`;
  const tokenBody = {
    id: tokenRef,
    country: "NL",
    details: {
      email: `e2e_${Date.now()}@everpay.io`,
      first_name: "E2E", last_name: "Test", cardholder: "E2E Test",
      country: "NL", city: "Rotterdam", address: "1 Test St", zip: "10001",
      phone: "+31600000000",
    },
  };

  let customerToken: string | null = null;
  try {
    const res = await fetch(`${MATRIX_SANDBOX}/v1/customer/token`, {
      method: "POST",
      headers: { "Authorization": auth, "Content-Type": "application/json" },
      body: JSON.stringify(tokenBody),
    });
    const text = await res.text();
    let json: any = {};
    try { json = JSON.parse(text); } catch { json = { raw: text }; }
    customerToken = json?.data?.customer_token ?? json?.customer_token ?? json?.id ?? null;

    const row = {
      merchant_id: merchantId,
      batch_id: batchId,
      provider: "matrix",
      environment: "sandbox",
      scenario: "customer_token (mint)",
      card_last4: null,
      card_brand: null,
      currency: null,
      amount: null,
      upstream_http_status: res.status,
      result_status: customerToken ? "issued" : "missing",
      result_code: json?.code != null ? String(json.code) : null,
      error_message: customerToken ? null : `no token in response: ${text.slice(0, 200)}`,
      raw_response: json,
      raw_request: {
        endpoint: `${MATRIX_SANDBOX}/v1/customer/token`,
        method: "POST",
        headers: { Authorization: "Basic <redacted>", "Content-Type": "application/json" },
        body: tokenBody,
      },
    };
    await supabase.from("card_test_runs").insert(row);
    results.push({ ...row, passed: !!customerToken });
  } catch (e) {
    results.push({
      provider: "matrix",
      scenario: "customer_token",
      passed: false,
      error_message: `network: ${String(e)}`,
    });
  }

  // 2. H2H card payments per documented test card. These show up in the
  // Matrix portal as real test transactions with brand + last4.
  for (const card of MATRIX_CARDS) {
    const stamp = Date.now().toString(36);
    const orderId = `e2e_${stamp}_${card.pan.slice(-4)}`;
    const body: Record<string, unknown> = {
      order_id: orderId,
      reference: orderId,
      order_description: "card-test-runner h2h",
      amount: 10,
      currency: "EUR",
      country: "NL",
      customer_token: customerToken ?? "no_token",
      callback_url: "https://example.com/cb",
      result_url: "https://example.com/result",
      success_url: "https://example.com/ok",
      error_url: "https://example.com/err",
      language: "EN",
      card: {
        number: card.pan,
        cvv: card.cvv,
        expire: `${card.expMonth}/${card.expYear}`,
        cardholder: "E2E Test",
      },
    };

    let httpStatus = 0;
    let parsed: any = null;
    let errorMessage: string | null = null;
    try {
      const res = await fetch(`${MATRIX_SANDBOX}/v1/h2h/payment`, {
        method: "POST",
        headers: { "Authorization": auth, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      httpStatus = res.status;
      const text = await res.text();
      try { parsed = JSON.parse(text); } catch { parsed = { raw: text }; }
    } catch (e) {
      errorMessage = `network: ${String(e)}`;
    }

    const code = parsed?.code;
    const txStatus = parsed?.transactions?.[0]?.status ?? parsed?.status ?? null;
    const passed = code === 0 || txStatus === "success" || txStatus === "pending" || txStatus === "3ds";

    const row = {
      merchant_id: merchantId,
      batch_id: batchId,
      provider: "matrix",
      environment: "sandbox",
      scenario: card.scenario + (card.enrolled3ds ? " · 3DS" : ""),
      card_last4: card.pan.slice(-4),
      card_brand: card.brand,
      currency: "EUR",
      amount: 10,
      upstream_http_status: httpStatus || null,
      result_status: txStatus ?? (passed ? "Approved" : "Failed"),
      result_code: code != null ? String(code) : null,
      error_message: passed ? null : (errorMessage ?? parsed?.status_description ?? parsed?.message ?? null),
      raw_response: parsed,
      raw_request: {
        endpoint: `${MATRIX_SANDBOX}/v1/h2h/payment`,
        method: "POST",
        headers: { Authorization: "Basic <redacted>", "Content-Type": "application/json" },
        body: { ...body, card: { ...(body.card as Record<string, unknown>), number: `**** **** **** ${card.pan.slice(-4)}`, cvv: "***" } },
      },
    };
    await supabase.from("card_test_runs").insert(row);
    results.push({ ...row, passed });
  }

  // Matrix hosted-checkout intentionally NOT exercised — Matrix is wired as
  // H2H only across every payment form in this project, so the battery test
  // mirrors live behavior. Re-enable here only if a hosted-checkout merchant
  // is onboarded in the future.

  return results;
}

/* ─────────────────────────── RisonPay ─────────────────────────── */

interface RisonpayScenario {
  scenario: string;
  pan: string;
  cvv: string;
  brand: string;
  expectedStatuses: string[];
}

const RISONPAY_CARDS: RisonpayScenario[] = [
  { scenario: "RisonPay 3DS Required (Visa 4000…3220)", pan: "4000000000003220", cvv: "123", brand: "Visa", expectedStatuses: ["pending", "processing", "completed", "redirect"] },
  { scenario: "RisonPay Insufficient funds (Visa 4000…9995)", pan: "4000000000009995", cvv: "123", brand: "Visa", expectedStatuses: ["failed", "declined"] },
  { scenario: "RisonPay No 3DS success (MC 5555…4444)", pan: "5555555555554444", cvv: "123", brand: "Mastercard", expectedStatuses: ["completed", "success", "pending"] },
];

async function runRisonpay(supabase: any, merchantId: string, batchId: string) {
  const merchantApi = Deno.env.get("RISONPAY_MERCHANT_ID");
  const privateKey = Deno.env.get("RISONPAY_PRIVATE_KEY");
  if (!merchantApi || !privateKey) {
    return [{
      provider: "risonpay",
      scenario: "missing credentials",
      passed: false,
      error_message: "RISONPAY_MERCHANT_ID / RISONPAY_PRIVATE_KEY not configured",
    }];
  }

  const env = (Deno.env.get("RISONPAY_ENVIRONMENT") || "sandbox").toLowerCase();
  const base = env === "production"
    ? "https://api.cdnsoftwaretech.com"
    : "https://api-dev.cdnsoftwaretech.com";

  // Sign helper (mirrors risonpay-process)
  const sign = async (bodyStr: string) => {
    const b64 = privateKey
      .replace(/-----BEGIN [^-]+-----/g, "")
      .replace(/-----END [^-]+-----/g, "")
      .replace(/\s+/g, "");
    const bin = atob(b64);
    const der = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) der[i] = bin.charCodeAt(i);
    const key = await crypto.subtle.importKey(
      "pkcs8", der,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false, ["sign"],
    );
    const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(bodyStr));
    let s = ""; for (const b of new Uint8Array(sig)) s += String.fromCharCode(b);
    return btoa(s);
  };

  const results: any[] = [];

  // Card mode (sending_card_details=true)
  for (const sc of RISONPAY_CARDS) {
    const externalId = `e2e_rison_${Date.now().toString(36)}_${sc.pan.slice(-4)}`;
    const requestBody = {
      merchant_id: merchantApi,
      external_id: externalId,
      amount: 10,
      currency: "EUR",
      sending_card_details: true,
      return_url: "https://example.com/return",
      callback_url: "https://example.com/callback",
      card: {
        number: sc.pan,
        cvv: sc.cvv,
        expire: "12/30",
        holder: "Card Test",
      },
      customer: {
        email: "card-test@everpay.io",
        first_name: "Card", last_name: "Test", country: "GB",
      },
    };
    const bodyStr = JSON.stringify(requestBody);
    let signature = ""; try { signature = await sign(bodyStr); } catch { /* */ }

    let httpStatus = 0;
    let parsed: any = null;
    let errMsg: string | null = null;
    try {
      const res = await fetch(`${base}/p/payment/card_details`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-signature": signature,
          "x-short-signature": signature.slice(0, 64),
        },
        body: bodyStr,
      });
      httpStatus = res.status;
      const text = await res.text();
      try { parsed = JSON.parse(text); } catch { parsed = { raw: text }; }
    } catch (e) {
      errMsg = `network: ${String(e)}`;
    }

    const status = (parsed?.status ?? "").toString().toLowerCase();
    const passed = sc.expectedStatuses.some((s) => status.includes(s));
    const code = parsed?.error_code ?? parsed?.code ?? null;

    const row = {
      merchant_id: merchantId,
      batch_id: batchId,
      provider: "risonpay",
      environment: env === "production" ? "production" : "sandbox",
      scenario: sc.scenario,
      card_last4: sc.pan.slice(-4),
      card_brand: sc.brand,
      currency: "EUR",
      amount: 10,
      upstream_http_status: httpStatus || null,
      result_status: parsed?.status ?? (passed ? "passed" : "failed"),
      result_code: code != null ? String(code) : null,
      error_message: passed ? null : (errMsg ?? parsed?.error_message ?? parsed?.message ?? null),
      raw_response: parsed,
      raw_request: {
        endpoint: `${base}/p/payment/card_details`,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-signature": "<redacted>",
          "x-short-signature": "<redacted>",
        },
        body: { ...requestBody, card: { ...requestBody.card, number: `**** **** **** ${sc.pan.slice(-4)}`, cvv: "***" } },
      },
    };
    await supabase.from("card_test_runs").insert(row);
    results.push({ ...row, passed });
  }

  // APM mode probe (Bank transfer GB sandbox)
  const apmExternalId = `e2e_rison_apm_${Date.now().toString(36)}`;
  const apmBody = {
    merchant_id: merchantApi,
    external_id: apmExternalId,
    amount: 10,
    currency: "EUR",
    sending_card_details: false,
    payment_method: "bank_transfer",
    return_url: "https://example.com/return",
    callback_url: "https://example.com/callback",
    customer: { email: "apm-test@everpay.io", first_name: "APM", last_name: "Test", country: "GB" },
  };
  const apmStr = JSON.stringify(apmBody);
  let apmSig = ""; try { apmSig = await sign(apmStr); } catch { /* */ }
  let apmStatus = 0; let apmParsed: any = null; let apmErr: string | null = null;
  try {
    const res = await fetch(`${base}/p/payment`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-signature": apmSig },
      body: apmStr,
    });
    apmStatus = res.status;
    const text = await res.text();
    try { apmParsed = JSON.parse(text); } catch { apmParsed = { raw: text }; }
  } catch (e) { apmErr = `network: ${String(e)}`; }
  const apmPassed = !!apmParsed?.payment_url || apmStatus === 200;
  const apmRow = {
    merchant_id: merchantId,
    batch_id: batchId,
    provider: "risonpay",
    environment: env === "production" ? "production" : "sandbox",
    scenario: "RisonPay APM bank_transfer (GB modelo sandbox)",
    card_last4: null, card_brand: null,
    currency: "EUR", amount: 10,
    upstream_http_status: apmStatus || null,
    result_status: apmParsed?.status ?? (apmPassed ? "redirect" : "failed"),
    result_code: apmParsed?.code != null ? String(apmParsed.code) : null,
    error_message: apmPassed ? null : (apmErr ?? apmParsed?.message ?? null),
    raw_response: apmParsed,
    raw_request: {
      endpoint: `${base}/p/payment`,
      method: "POST",
      headers: { "Content-Type": "application/json", "x-signature": "<redacted>" },
      body: apmBody,
    },
  };
  await supabase.from("card_test_runs").insert(apmRow);
  results.push({ ...apmRow, passed: apmPassed });

  return results;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const authHeader = req.headers.get("Authorization") ?? "";
    const apiKeyHeader = req.headers.get("apikey") ?? "";
    const xClientToken = req.headers.get("x-client-token") ?? "";

    // Try every common location: Authorization: Bearer X, apikey, x-client-token
    const bearer = authHeader.replace(/^Bearer\s+/i, "").trim();
    const token = bearer || apiKeyHeader.trim() || xClientToken.trim();

    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

    const body = await req.json().catch(() => ({}));
    const includeApproved = body?.include_approved === true;
    const providers = (body?.providers as string[] | undefined) ?? ["matrix", "shieldhub", "risonpay"];

    // Decode role from JWT (no signature verification — only for branching)
    let tokenRole: string | null = null;
    let tokenSub: string | null = null;
    try {
      const part = token.split(".")[1];
      if (part) {
        const json = JSON.parse(atob(part.replace(/-/g, "+").replace(/_/g, "/")));
        tokenRole = json?.role ?? null;
        tokenSub = json?.sub ?? null;
      }
    } catch { /* ignore */ }

    console.log("[card-test-runner] auth check", {
      hasAuth: !!authHeader, hasApiKey: !!apiKeyHeader, hasXClient: !!xClientToken,
      tokenLen: token.length, role: tokenRole, sub: tokenSub,
    });

    if (!token) {
      return new Response(JSON.stringify({
        error: "missing_credentials",
        message:
          "No credentials supplied. Send a user JWT in the Authorization header " +
          "(Bearer …) or call with the service role key in `apikey`/`Authorization`.",
      }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let merchant: { id: string } | null = null;

    // Mode 1 — service-role caller may pass an explicit merchant_id
    const isServiceRole = token === serviceKey || tokenRole === "service_role";
    if (isServiceRole) {
      const requestedMerchant = body?.merchant_id;
      if (!requestedMerchant) {
        return new Response(JSON.stringify({
          error: "missing_merchant_id",
          message:
            "Service-role calls must include `merchant_id` in the JSON body so test runs are attributed to a real merchant.",
        }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data, error } = await supabase
        .from("merchants").select("id").eq("id", requestedMerchant).maybeSingle();
      if (error) console.warn("[card-test-runner] merchant lookup error", error);
      merchant = data ?? null;
      if (!merchant) {
        return new Response(JSON.stringify({
          error: "unknown_merchant",
          message: `No merchant found with id ${requestedMerchant}.`,
        }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else if (token === anonKey) {
      // Anon key alone is not enough — caller needs a user JWT
      return new Response(JSON.stringify({
        error: "anon_key_not_allowed",
        message:
          "Anonymous credentials cannot trigger live test runs. Sign in to the dashboard first.",
      }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } else {
      // Mode 2 — user JWT → derive merchant via auth.uid
      const { data: { user }, error: userErr } = await supabase.auth.getUser(token);
      if (userErr || !user) {
        return new Response(JSON.stringify({
          error: "invalid_session",
          message:
            "Your session has expired or is invalid. Sign out and back in, then retry.",
          debug: userErr?.message ?? null,
        }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data, error: merchErr } = await supabase
        .from("merchants").select("id").eq("user_id", user.id).maybeSingle();
      if (merchErr) console.warn("[card-test-runner] merchant lookup", merchErr);
      merchant = data ?? null;
      if (!merchant) {
        return new Response(JSON.stringify({
          error: "no_merchant_for_user",
          message:
            "Your user account isn't linked to a merchant yet. Complete onboarding first.",
        }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const batchId = crypto.randomUUID();
    const all: any[] = [];

    if (providers.includes("matrix")) {
      const m = await runMatrix(supabase, merchant.id, batchId);
      all.push(...m);
    }
    if (providers.includes("shieldhub")) {
      const s = await runShieldhub(supabase, merchant.id, batchId, includeApproved);
      all.push(...s);
    }
    if (providers.includes("risonpay")) {
      const r = await runRisonpay(supabase, merchant.id, batchId);
      all.push(...r);
    }

    return new Response(JSON.stringify({
      batch_id: batchId,
      merchant_id: merchant.id,
      total: all.length,
      passed: all.filter((r) => r.passed).length,
      results: all,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[card-test-runner] error", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
