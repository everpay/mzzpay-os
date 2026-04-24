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
