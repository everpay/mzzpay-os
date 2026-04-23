/**
 * Single source of truth for the developer documentation.
 * Used by:
 *  - the React docs pages (rendered)
 *  - the LLM-friendly /llms.txt route
 *  - the "Download as PDF" button
 *
 * If you change copy here, both the rendered docs and the
 * downloadable artifacts stay in sync.
 */

export const DOCS_META = {
  product: "MzzPay",
  apiVersion: "v1",
  baseUrl: "https://api.mzzpay.io/v1",
  signatureHeader: "X-MzzPay-Signature",
  apiKeyHeader: "Authorization",
  contact: "developers@mzzpay.io",
} as const;

export interface DocsSection {
  id: string;
  title: string;
  /** Plain-text body used by the LLM doc and the PDF export. */
  body: string;
}

/**
 * Long-form copy in plain Markdown. Senior-tech-writer style:
 *  - Lead with what the developer needs to do.
 *  - One verb per heading.
 *  - Short paragraphs, concrete examples, no marketing voice.
 */
export const DOCS_SECTIONS: DocsSection[] = [
  {
    id: "introduction",
    title: "Introduction",
    body: `MzzPay is a unified payments API for cards, wallets, open banking, and gaming rails. A single integration gives you intelligent provider routing, idempotent requests, real-time webhooks, and PCI-DSS Level 1 vaulting — without rewriting your checkout when you add a new market.

This reference is the contract. Every endpoint is versioned (\`v1\`), every response is JSON, and every state change emits a webhook. If something here disagrees with the SDK, the API wins.`,
  },
  {
    id: "quick-start",
    title: "Quick Start",
    body: `Goal: take a card payment in test mode in under ten minutes.

Step 1 — Provision keys
Create a sandbox account and copy your secret key (\`sk_test_…\`). Treat it like a database password: server-side only, never bundled in a mobile app or React build.

Step 2 — Make a request
All API calls are HTTPS POST/GET to \`${DOCS_META.baseUrl}\`. Authenticate with a Bearer token:

    curl -X POST ${DOCS_META.baseUrl}/payments \\
      -H "Authorization: Bearer sk_test_..." \\
      -H "Content-Type: application/json" \\
      -H "Idempotency-Key: $(uuidgen)" \\
      -d '{
        "amount": 5000,
        "currency": "usd",
        "payment_method": "pm_card_visa",
        "description": "Order #1234"
      }'

Step 3 — Handle the response
A 200 means we accepted the request, not that the funds settled. Inspect \`status\`:
  - \`succeeded\` — captured, money is in flight to your account.
  - \`requires_action\` — a 3DS challenge is needed; redirect the customer to \`next_action.redirect_url\`.
  - \`failed\` — read \`error.code\` and surface it to the customer.

Step 4 — Subscribe to webhooks
Polling is for prototypes. In production, register a webhook endpoint and react to \`payment.succeeded\`, \`payment.failed\`, \`refund.created\`, and \`dispute.created\`. Verify the \`${DOCS_META.signatureHeader}\` header on every delivery — see the Webhooks section.

Step 5 — Go live
Swap \`sk_test_…\` for \`sk_live_…\`, point your webhook to a production URL, and submit your business profile for KYB review. Live keys are issued only after KYB approval.`,
  },
  {
    id: "authentication",
    title: "Authentication & Request Signing",
    body: `MzzPay supports two authentication modes. Pick one per environment.

1) Bearer token (default)
The simplest pattern — used by 95% of integrations. Send your secret key in the \`Authorization\` header:

    Authorization: Bearer sk_live_4eC39H...

Every request is rate-limited per key (1,000 req/min in sandbox, 5,000 req/min in live, raise on request).

2) HMAC request signing (high-security tier)
Required for treasury, payouts > $50,000, and merchants on our enterprise plan. Instead of sending the secret over the wire, sign the request body with HMAC-SHA-256:

    timestamp  = current Unix ms (e.g. 1745393482000)
    payload    = the exact JSON body string you POST
    string     = "${'${'}timestamp${'}'}.${'${'}payload${'}'}"
    signature  = hex( HMAC_SHA256(api_secret, string) )

Then send three headers:

    mzz-key:        pk_live_...
    mzz-signature:  t=1745393482000,v=9f86d081884c...
    Content-Type:   application/json

The server tolerates ±5 minutes of clock skew. Anything older is rejected with \`401 invalid_signature\` to defeat replay attacks. Rotate \`api_secret\` quarterly via the dashboard — old secrets are valid for 24 hours after rotation to give you a clean cutover.

Key hygiene
  - \`pk_…\` keys are publishable: safe in browser bundles for tokenization only.
  - \`sk_…\` keys are secret: server-side only. If one leaks, revoke it from the dashboard immediately — every request after revocation returns \`401\`.`,
  },
  {
    id: "idempotency",
    title: "Idempotency",
    body: `Network failures happen. To make every mutating request safely retryable, send an \`Idempotency-Key\` header with a unique value (UUID v4 is recommended) per logical operation:

    Idempotency-Key: 6f3b2a1e-9c4d-4f8a-bb12-7e9f3a2b1c4d

Behavior
  - First request — processed normally; the response is cached for 24 hours.
  - Retry with the same key and the same body — the cached response is returned, the operation is not re-executed.
  - Retry with the same key and a different body — \`409 idempotency_conflict\` is returned. This protects you from double-charging on stale UI state.

Scope
Idempotency is per-merchant, per-endpoint. The same key can be reused across endpoints (e.g. \`/payments\` and \`/refunds\`).

Use it
Generate the key once when the user clicks "Pay" — not inside the retry loop. That way the first attempt and every retry share the same key.`,
  },
  {
    id: "payments",
    title: "Payments",
    body: `The Payments API charges a customer for a one-off purchase. For recurring billing, see the Subscriptions API.

Lifecycle
  created → requires_action* → processing → succeeded
                            → failed
                            → canceled
  *only if the issuer requests 3DS

Endpoints
  POST   /payments               Create and charge
  GET    /payments               List, paginated
  GET    /payments/:id           Retrieve one
  POST   /payments/:id/capture   Capture a held auth
  POST   /payments/:id/refund    Issue a refund
  POST   /payments/:id/cancel    Cancel before capture

Create a payment

    POST ${DOCS_META.baseUrl}/payments

Required:
  amount          integer    Smallest currency unit (cents, pence, paise…)
  currency        string     ISO-4217 lowercase (\`usd\`, \`eur\`, \`gbp\`)
  payment_method  string     A \`pm_…\` token from Checkout.js or a saved method

Optional:
  capture         boolean    Default true. Set false for auth-only.
  description     string     Shown on customer's statement.
  metadata        object     Up to 50 keys, 500 chars each. Returned on every event.
  customer_id     string     Attach to a saved customer for analytics.
  statement_descriptor string Up to 22 chars, alphanumeric + space.

Routing
You don't pick a processor. MzzPay scores every active route on cost, success rate, latency, and BIN compatibility, then sends the request to the highest-scoring acquirer. Failed authorizations are automatically retried on the next-best route — see the Smart Retry section.

Refunds
A refund is a separate object, not an in-place mutation. Partial refunds are supported and cumulative — you can issue multiple partials until the total equals the captured amount. Once \`amount_refunded == amount\`, the payment moves to \`refunded\` and further refund attempts return \`400 already_refunded\`.`,
  },
  {
    id: "customers",
    title: "Customers",
    body: `A Customer is a long-lived object that aggregates payment methods, invoices, subscriptions, and analytics for one end-user. You don't need a Customer to take a one-off charge — but for anything recurring, returning, or invoiced, create one.

Endpoints
  POST   /customers
  GET    /customers
  GET    /customers/:id
  PATCH  /customers/:id
  DELETE /customers/:id           (soft delete; PII is anonymized within 30 days)

Identity matching
We deduplicate on \`(merchant_id, lower(email))\`. If you POST a customer whose email already exists, you get the existing record back with \`200\` instead of \`201\`. To force a new record, omit the email and use \`metadata.external_id\` instead.

Saved payment methods
Attach methods with \`POST /customers/:id/payment_methods\`. The response includes the \`pm_…\` token you pass to \`/payments\`. Methods are stored in our PCI-DSS Level 1 vault — your servers never see the PAN.`,
  },
  {
    id: "invoices",
    title: "Invoices",
    body: `Invoices are hosted billing documents with a public payment URL, automatic reminders, and PDF generation. Create one and send it; the customer pays themselves.

Endpoints
  POST   /invoices
  GET    /invoices
  GET    /invoices/:id
  POST   /invoices/:id/send       Email the hosted link
  POST   /invoices/:id/void       Cancel an unpaid invoice
  POST   /invoices/:id/finalize   Lock totals and assign a number

States
  draft → open → paid
              → overdue → paid
              → void

Line items
Pass an \`items\` array of \`{ name, qty, unit_price, tax_rate? }\`. We compute totals server-side — never trust client math on money.

Automated reminders
Default cadence: 3 days before due, on due date, +3 / +7 / +14 days overdue. Override with \`reminder_schedule\` on the invoice or globally in dashboard settings.

Hosted page
Every invoice gets a unique \`hosted_url\` like \`https://pay.mzzpay.io/inv_abc123\`. The page renders your brand, accepts every payment method enabled on your account, and updates the invoice status in real time.`,
  },
  {
    id: "products",
    title: "Products",
    body: `A Product is a reusable catalog entry. Attach it to invoices, subscriptions, or checkout sessions to keep pricing consistent and enable revenue analytics.

Endpoints
  POST   /products
  GET    /products
  GET    /products/:id
  PATCH  /products/:id
  DELETE /products/:id

Inventory
Set \`stock\` to enforce inventory; omit it for digital / unlimited goods. When \`stock\` reaches 0, attempted purchases return \`400 out_of_stock\`.

Pricing tiers
For tiered or volume pricing, create one Product and multiple Prices via \`POST /products/:id/prices\`. Each Price has its own \`amount\`, \`currency\`, and optional \`recurring\` interval.`,
  },
  {
    id: "webhooks",
    title: "Webhooks",
    body: `Webhooks are how we tell you something happened — a payment succeeded, a chargeback was filed, a payout settled. Treat them as the truth source; don't poll.

Delivery guarantees
At-least-once delivery. We retry with exponential backoff for 72 hours: 1m, 5m, 30m, 2h, 12h, 24h, 24h. Stop the retries by responding 2xx within 10 seconds.

Verifying the signature
Every delivery includes the \`${DOCS_META.signatureHeader}\` header:

    ${DOCS_META.signatureHeader}: t=1745393482000,v1=9f86d081884c...

Compute the expected signature server-side and compare with a constant-time check:

    expected = hex(HMAC_SHA256(webhook_secret, t + "." + raw_body))
    valid    = constant_time_equal(expected, v1)

If \`valid\` is false, return 400 and discard the event. If the timestamp is older than 5 minutes, also reject — this defeats replay attacks.

Event payload

    {
      "id": "evt_2QHv7K...",
      "type": "payment.succeeded",
      "api_version": "${DOCS_META.apiVersion}",
      "created_at": "2026-04-23T05:14:09Z",
      "livemode": true,
      "data": { /* the resource as it now is */ },
      "previous_attributes": { /* changed fields, if any */ }
    }

Idempotent consumers
Use \`event.id\` as the dedupe key in your handler. We may deliver the same event twice; you must process it once.

Local development
Use the dashboard's webhook tester to fire any event at any URL — including ngrok / localhost.dev tunnels. No code change needed.`,
  },
  {
    id: "errors",
    title: "Errors",
    body: `MzzPay uses conventional HTTP status codes plus a stable, machine-readable error object.

  200  Success
  400  Bad request — validation failed; see error.code
  401  Authentication failed
  402  Payment failed — see error.decline_code (issuer reason)
  403  Forbidden — your key lacks permission
  404  Not found
  409  Conflict — usually idempotency
  422  Unprocessable — business rule rejected the request
  429  Rate-limited — retry after the Retry-After header
  500  Server error — safe to retry with the same Idempotency-Key

Error object

    {
      "error": {
        "type": "card_error",
        "code": "card_declined",
        "decline_code": "insufficient_funds",
        "message": "Your card has insufficient funds.",
        "param": "payment_method",
        "doc_url": "https://docs.mzzpay.io/errors/card_declined",
        "request_id": "req_2QHv7K..."
      }
    }

\`type\` buckets the error so you can branch generically (\`api_error\`, \`card_error\`, \`validation_error\`, \`rate_limit_error\`). \`code\` is the stable, narrow identifier — log it. \`message\` is human copy you can show to the user as-is. Always log \`request_id\` — it's the first thing support will ask for.`,
  },
  {
    id: "pagination",
    title: "Pagination, Filtering, Expansion",
    body: `Lists use cursor-based pagination. Each list response returns:

    {
      "object": "list",
      "data": [ ... ],
      "has_more": true,
      "next_cursor": "cur_2QHv7K..."
    }

Pass \`?cursor=cur_2QHv7K...&limit=100\` to fetch the next page. Limit is 1–100, default 10.

Filtering
Most resources accept \`?status=\`, \`?created[gte]=\`, \`?created[lte]=\`, and \`?metadata[key]=value\`. Date filters take Unix seconds or RFC-3339 strings.

Expansion
To inline a related object instead of its ID, pass \`?expand[]=customer&expand[]=payment_method\`. Up to four levels deep, max five expansions per request — keeps response payloads predictable.`,
  },
  {
    id: "sdks",
    title: "Official SDKs",
    body: `We publish first-party SDKs for the languages our merchants ship on. They're thin wrappers — every call maps 1:1 to an HTTP endpoint, every error preserves the wire-format \`code\` and \`request_id\`.

  Node.js   npm install @mzzpay/node       Types: included
  Python    pip install mzzpay              Types: PEP-561 stubs
  PHP       composer require mzzpay/mzzpay  PSR-4 autoload
  Ruby      gem install mzzpay              Frozen string compatible
  Go        go get github.com/mzzpay/mzzpay-go
  Java      Maven / Gradle, JDK 11+

Versioning
SDKs follow semver. Major bumps line up with API version pins; minor releases never break existing call sites. Pin the major in your manifest and you can trust \`upgrade\` to be safe.

Going SDK-less
Every SDK is a convenience wrapper over plain HTTP. If you're on a runtime we don't ship, all you need is an HTTPS client and an HMAC implementation — see the Authentication section.`,
  },
];

export const DOCS_DOCUMENT_TITLE = `${DOCS_META.product} API Reference (${DOCS_META.apiVersion})`;
