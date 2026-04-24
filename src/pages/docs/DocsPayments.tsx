import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CodeBlock } from "@/components/docs/CodeBlock";
import { ApiEndpoint } from "@/components/docs/ApiEndpoint";
import { DocsContentSection } from "@/components/docs/DocsContentSection";
import { DocsDownloadActions } from "@/components/docs/DocsDownloadActions";
import { Callout } from "@/components/docs/Callout";

export default function DocsPayments() {
  return (
    <div className="max-w-4xl mx-auto space-y-10">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <Badge variant="secondary" className="mb-3">API Reference</Badge>
          <h1 className="text-3xl font-heading font-bold tracking-tight">Payments API</h1>
          <p className="text-muted-foreground mt-2">
            Charge cards, accept Open Banking, Crypto, and APMs through a single endpoint.
            MzzPay routes each transaction to the optimal acquirer based on currency, BIN,
            risk profile, and merchant routing rules.
          </p>
        </div>
        <DocsDownloadActions />
      </div>

      <Callout variant="info" title="Status semantics">
        A 200 response means the request was <em>accepted</em>. Inspect{" "}
        <code>transaction.status</code>: <code>completed</code> means funds captured,
        <code>pending</code> awaits processor confirmation or 3DS,{" "}
        <code>failed</code> includes a <code>last_error</code> with the decline reason.
      </Callout>

      <Callout variant="warning" title="New: strict payload validation (April 2026)">
        Every <code>/process-payment</code> and <code>/process-payout</code> request is
        validated against a Zod schema <strong>before</strong> any acquirer call. Invalid
        payloads return <code>processor_validation_error</code> with a typed{" "}
        <code>code</code> (e.g. <code>invalid_currency</code>,{" "}
        <code>amount_below_minimum</code>, <code>missing_card_details</code>) and an{" "}
        <code>issues[]</code> array describing each failed field. No provider attempt is
        made and no charge is created.
      </Callout>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">The Transaction Object</CardTitle>
        </CardHeader>
        <CardContent>
          <CodeBlock
            code={`{
  "id": "9b1c2d3e-4f5a-6b7c-8d9e-0a1b2c3d4e5f",
  "object": "transaction",
  "merchant_id": "mer_abc123",
  "amount": 5000,
  "currency": "usd",
  "status": "completed",
  "payment_method": "card",
  "provider": "mzzpay-usd",
  "processor_transaction_id": "txn_8821k",
  "card_brand": "visa",
  "card_last4": "4242",
  "customer_email": "jane@example.com",
  "description": "Order #1234",
  "metadata": {},
  "created_at": "2026-04-22T12:00:00Z",
  "updated_at": "2026-04-22T12:00:01Z"
}`}
            language="curl"
          />
        </CardContent>
      </Card>

      <ApiEndpoint
        method="POST"
        path="/functions/v1/process-payment"
        title="Create a Payment"
        description="Charge a customer. Card data is sent directly to the acquirer; set saveCard:true to vault the PAN through VGS for future recurring charges."
        params={[
          { name: "amount", type: "number", required: true, desc: "Amount in major units of currency (e.g. 49.99)" },
          { name: "currency", type: "string", required: true, desc: "ISO 4217 code: usd, eur, gbp, cad, aud" },
          { name: "paymentMethod", type: "string", required: true, desc: "card, open_banking, crypto, pix, boleto, apple_pay" },
          { name: "cardDetails", type: "object", required: false, desc: "{ number, expMonth, expYear, cvc, holderName } — required when paymentMethod=card" },
          { name: "customerEmail", type: "string", required: false, desc: "Email for receipt + reconciliation" },
          { name: "customer", type: "object", required: false, desc: "{ first, last, phone, ip } enrichment for risk scoring" },
          { name: "billing", type: "object", required: false, desc: "{ address, postal_code, city, state, country }" },
          { name: "description", type: "string", required: false, desc: "Statement descriptor / order reference" },
          { name: "idempotencyKey", type: "string", required: false, desc: "Dedupe key — repeat requests return the cached response" },
          { name: "saveCard", type: "boolean", required: false, desc: "Vault the PAN via VGS for recurring billing" },
          { name: "retry", type: "boolean", required: false, desc: "Force a fresh attempt under the same idempotencyKey after a decline" },
        ]}
        code={{
          curl: `curl -X POST https://api.mzzpay.io/functions/v1/process-payment \\
  -H "Authorization: Bearer <user_jwt>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "amount": 50.00,
    "currency": "usd",
    "paymentMethod": "card",
    "customerEmail": "jane@example.com",
    "description": "Order #1234",
    "cardDetails": {
      "number": "4242424242424242",
      "expMonth": "12",
      "expYear": "2028",
      "cvc": "123"
    }
  }'`,
          node: `const { data, error } = await supabase.functions.invoke('process-payment', {
  body: {
    amount: 50,
    currency: 'usd',
    paymentMethod: 'card',
    customerEmail: 'jane@example.com',
    description: 'Order #1234',
    cardDetails: { number: '4242...', expMonth: '12', expYear: '2028', cvc: '123' },
    idempotencyKey: crypto.randomUUID(),
  },
});`,
          python: `payment = supabase.functions.invoke("process-payment", body={
    "amount": 50,
    "currency": "usd",
    "paymentMethod": "card",
    "customerEmail": "jane@example.com",
    "cardDetails": { "number": "4242...", "expMonth": "12", "expYear": "2028", "cvc": "123" },
})`,
        }}
        response={`{
  "success": true,
  "transaction": {
    "id": "9b1c2d3e-4f5a-6b7c-8d9e-0a1b2c3d4e5f",
    "amount": 5000,
    "currency": "usd",
    "status": "completed",
    "provider": "mzzpay-usd",
    "card_last4": "4242",
    "card_brand": "visa"
  }
}`}
      />

      <ApiEndpoint
        method="POST"
        path="/functions/v1/retry-payment"
        title="Retry a Past-Due Subscription Charge"
        description="Manually triggers smart-retry for a past_due subscription. The retry engine respects max_attempts, backoff_strategy (linear / exponential / fibonacci), and the merchant's allowed retry_decline_codes."
        params={[
          { name: "subscription_id", type: "string", required: false, desc: "Limit retry to a single subscription. Omit to retry every past_due subscription" },
          { name: "force", type: "boolean", required: false, desc: "Bypass attempt-count and backoff guards" },
        ]}
        code={{
          curl: `curl -X POST https://api.mzzpay.io/functions/v1/retry-payment \\
  -H "Authorization: Bearer <service_role>" \\
  -d '{ "subscription_id": "sub_5hKp2" }'`,
          node: `const { data } = await supabase.functions.invoke('retry-payment', {
  body: { subscription_id: 'sub_5hKp2' },
});`,
          python: `data = supabase.functions.invoke("retry-payment", body={"subscription_id": "sub_5hKp2"})`,
        }}
        response={`{
  "success": true,
  "processed": 1,
  "results": [
    { "subscription_id": "sub_5hKp2", "status": "succeeded", "attempt": 2 }
  ]
}`}
      />

      <ApiEndpoint
        method="GET"
        path="/rest/v1/transactions"
        title="List Transactions"
        description="Query the transactions table directly via PostgREST. Apply filters with PostgREST query syntax."
        params={[
          { name: "select", type: "string", required: false, desc: "Comma-separated columns. Default *" },
          { name: "status", type: "string", required: false, desc: "eq.completed, eq.pending, eq.failed, eq.refunded" },
          { name: "order", type: "string", required: false, desc: "Sort: created_at.desc" },
          { name: "limit", type: "integer", required: false, desc: "1-1000 (Supabase default cap)" },
        ]}
        code={{
          curl: `curl "https://api.mzzpay.io/rest/v1/transactions?status=eq.completed&order=created_at.desc&limit=10" \\
  -H "Authorization: Bearer <user_jwt>" \\
  -H "apikey: <publishable_key>"`,
          node: `const { data } = await supabase
  .from('transactions')
  .select('*')
  .eq('status', 'completed')
  .order('created_at', { ascending: false })
  .limit(10);`,
          python: `data = supabase.table("transactions").select("*").eq("status", "completed").limit(10).execute()`,
        }}
        response={`[
  {
    "id": "9b1c...",
    "amount": 5000,
    "currency": "usd",
    "status": "completed",
    "provider": "mzzpay-usd",
    "created_at": "2026-04-22T12:00:00Z"
  }
]`}
      />

      <section className="space-y-4 pt-4 border-t border-border">
        <h2 className="text-2xl font-heading font-semibold tracking-tight">
          Idempotency &amp; duplicate detection
        </h2>
        <p className="text-sm text-muted-foreground">
          Always send a fresh <code>idempotencyKey</code> (UUID v4) per checkout attempt.
          The browser SDK generates one automatically on mount. When{" "}
          <code>/process-payment</code> finds an existing row in{" "}
          <code>idempotency_keys</code> for the same{" "}
          <code>(merchant_id, key)</code> pair, the original response is replayed —{" "}
          <strong>no second authorization is sent to the acquirer</strong>. Cached
          declines are NOT replayed; they fall through so the merchant can retry under
          the same key.
        </p>

        <h3 className="text-base font-semibold tracking-tight pt-2">
          Duplicate response — exact 200 payload
        </h3>
        <p className="text-xs text-muted-foreground">
          Replays always return HTTP <code>200</code> with the original transaction
          object plus five duplicate-detection fields the UI must branch on:
        </p>
        <CodeBlock
          language="curl"
          code={`HTTP/1.1 200 OK
Content-Type: application/json

{
  "success": true,
  "duplicate": true,                       // hard signal — this is a replay
  "idempotency_replayed": true,            // alias for older SDKs
  "idempotency_key": "6f3b2a1e-9c4d-4f8a-bb12-7e9f3a2b1c4d",
  "code": "idempotency_conflict",          // stable machine code
  "error_code": "idempotency_conflict",    // alias
  "first_seen_at": "2026-04-24T18:02:11.412Z",
  "transaction": {
    "id": "9b1c2d3e-4f5a-6b7c-8d9e-0f1a2b3c4d5e",
    "status": "completed",
    "amount": 5000,
    "currency": "USD",
    "provider": "shieldhub",
    "provider_ref": "ep_8821k"
  },
  "providerResponse": { /* original acquirer payload, untouched */ }
}`}
        />

        <h3 className="text-base font-semibold tracking-tight pt-2">
          Surfacing the duplicate state in the UI
        </h3>
        <p className="text-xs text-muted-foreground">
          The hosted checkout, NewPayment screen, and merchant SDK all branch on{" "}
          <code>response.duplicate === true</code> before showing a success / failure
          state. The pattern below is what the in-app checkout uses today — replicate it
          in any custom integration:
        </p>
        <CodeBlock
          language="node"
          code={`const { data } = await supabase.functions.invoke('process-payment', {
  body: { amount, currency, paymentMethod, cardDetails, idempotencyKey },
});

if (data?.duplicate) {
  // Same key, same body → original response replayed.
  // Do NOT re-render the success animation, do NOT re-emit analytics.
  toast.info('Duplicate request', {
    description: \`This payment was already processed at \${new Date(data.first_seen_at).toLocaleString()}.\`,
    action: { label: 'View transaction', onClick: () => openDrawer(data.transaction.id) },
  });
  // Hand the user back to the existing transaction; never create a new row.
  navigate(\`/transactions/\${data.transaction.id}\`);
  return;
}

if (data?.success) { /* normal happy path */ }`}
        />
        <p className="text-xs text-muted-foreground">
          If the cached row had <code>status === 'failed'</code>, the backend skips the
          replay and re-attempts under the same key — your handler will see a fresh
          response with <code>duplicate</code> absent or <code>false</code>. Pass{" "}
          <code>retry: true</code> to force a re-attempt even when the cached row
          succeeded (used by the post-decline retry overlay).
        </p>
      </section>

      <section className="space-y-4 pt-4 border-t border-border">
        <h2 className="text-2xl font-heading font-semibold tracking-tight">
          Realtime timeline (provider_events)
        </h2>
        <p className="text-sm text-muted-foreground">
          Each transaction emits a stream of <code>provider_events</code> rows as the
          attempt progresses through the acquirer (validation, 3DS challenge, fallback
          to 2D, Matrix H2H attempt outcome, capture, settlement). Subscribe via Supabase
          Realtime to render a live timeline in your dashboard or detail drawer.
        </p>
        <CodeBlock
          language="node"
          code={`supabase
  .channel(\`provider_events:\${transactionId}\`)
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'provider_events',
    filter: \`transaction_id=eq.\${transactionId}\`,
  }, ({ new: ev }) => {
    // ev.event_type: 'validated' | '3ds_challenge' | 'fallback_2d'
    //              | 'matrix_h2h_attempt' | 'authorized' | 'captured' | 'declined'
    timeline.push(ev);
  })
  .subscribe();`}
        />
      </section>

      <section className="space-y-4 pt-4 border-t border-border">
        <h2 className="text-2xl font-heading font-semibold tracking-tight">
          Provider routing
        </h2>
        <ul className="text-sm text-muted-foreground space-y-2 list-disc pl-5">
          <li>
            <strong>EUR / GBP</strong> → MzzPay EUR S2S.
          </li>
          <li>
            <strong>USD (Mexico acquirer)</strong> → Shieldhub. The descriptor
            <code className="mx-1">AXP*FER*AXP*FERES</code> is injected automatically;
            it is non-empty on every request.
          </li>
          <li>
            <strong>Matrix Partners merchants</strong> → routed via the H2H endpoint.
            All other merchants use the standard hosted/S2S flow because every payment
            form is generated from this project.
          </li>
          <li>
            <strong>Visa / Mastercard only</strong> on the live Shieldhub MID; 3DS is
            enforced when the card is enrolled.
          </li>
        </ul>
      </section>

      <section className="space-y-4 pt-4 border-t border-border">
        <h2 className="text-2xl font-heading font-semibold tracking-tight">
          Lifecycle, routing & refund semantics
        </h2>
        <DocsContentSection sectionId="payments" />
      </section>

      <section className="space-y-4 pt-4 border-t border-border">
        <h2 className="text-2xl font-heading font-semibold tracking-tight">Errors</h2>
        <DocsContentSection sectionId="errors" />
      </section>

      <section className="space-y-4 pt-4 border-t border-border">
        <h2 className="text-2xl font-heading font-semibold tracking-tight">
          Pagination, filtering, expansion
        </h2>
        <DocsContentSection sectionId="pagination" />
      </section>
    </div>
  );
}
