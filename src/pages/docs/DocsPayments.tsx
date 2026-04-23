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
            Create, capture, and manage payments across multiple processors and payment methods.
          </p>
        </div>
        <DocsDownloadActions />
      </div>

      <Callout variant="info" title="A 200 means accepted, not settled">
        Always inspect the <code>status</code> field. <code>requires_action</code> needs a 3DS
        redirect; <code>processing</code> is in flight; only <code>succeeded</code> means funds
        are captured.
      </Callout>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">The Payment Object</CardTitle>
        </CardHeader>
        <CardContent>
          <CodeBlock
            code={`{
  "id": "pay_abc123xyz",
  "object": "payment",
  "amount": 5000,
  "currency": "usd",
  "status": "succeeded",
  "payment_method": "pm_card_visa",
  "description": "Order #1234",
  "merchant_id": "mer_abc123",
  "processor": "mzzpay",
  "metadata": {},
  "created_at": "2026-04-09T12:00:00Z",
  "updated_at": "2026-04-09T12:00:00Z"
}`}
            language="curl"
          />
        </CardContent>
      </Card>

      <ApiEndpoint
        method="POST"
        path="/v1/payments"
        title="Create a Payment"
        description="Create a new payment and charge the customer."
        params={[
          { name: "amount", type: "integer", required: true, desc: "Amount in smallest currency unit (e.g., cents)" },
          { name: "currency", type: "string", required: true, desc: "Three-letter ISO currency code" },
          { name: "payment_method", type: "string", required: true, desc: "Payment method ID or type" },
          { name: "description", type: "string", required: false, desc: "Description of the payment" },
          { name: "metadata", type: "object", required: false, desc: "Additional key-value metadata" },
          { name: "capture", type: "boolean", required: false, desc: "Auto-capture. Defaults to true" },
        ]}
        code={{
          curl: `curl -X POST https://api.mzzpay.io/v1/payments \\
  -H "Authorization: Bearer sk_test_your_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "amount": 5000,
    "currency": "usd",
    "payment_method": "pm_card_visa",
    "description": "Order #1234"
  }'`,
          node: `const payment = await mzzpay.payments.create({
  amount: 5000,
  currency: 'usd',
  payment_method: 'pm_card_visa',
  description: 'Order #1234',
});`,
          python: `payment = mzzpay.Payment.create(
  amount=5000,
  currency="usd",
  payment_method="pm_card_visa",
  description="Order #1234",
)`,
        }}
        response={`{
  "id": "pay_abc123xyz",
  "object": "payment",
  "amount": 5000,
  "currency": "usd",
  "status": "succeeded",
  "payment_method": "pm_card_visa",
  "description": "Order #1234",
  "created_at": "2026-04-09T12:00:00Z"
}`}
      />

      <ApiEndpoint
        method="GET"
        path="/v1/payments"
        title="List Payments"
        description="Retrieve a paginated list of payments."
        params={[
          { name: "limit", type: "integer", required: false, desc: "Number of results (1-100, default 10)" },
          { name: "offset", type: "integer", required: false, desc: "Pagination offset" },
          { name: "status", type: "string", required: false, desc: "Filter by status" },
        ]}
        code={{
          curl: `curl https://api.mzzpay.io/v1/payments?limit=10 \\
  -H "Authorization: Bearer sk_test_your_key"`,
          node: `const payments = await mzzpay.payments.list({
  limit: 10,
  status: 'succeeded',
});`,
          python: `payments = mzzpay.Payment.list(
  limit=10,
  status="succeeded",
)`,
        }}
        response={`{
  "object": "list",
  "data": [...],
  "has_more": true,
  "total_count": 142
}`}
      />

      <ApiEndpoint
        method="POST"
        path="/v1/payments/:id/capture"
        title="Capture a Payment"
        description="Capture a previously authorized payment."
        params={[
          { name: "amount", type: "integer", required: false, desc: "Partial capture amount (defaults to full)" },
        ]}
        code={{
          curl: `curl -X POST https://api.mzzpay.io/v1/payments/pay_abc123/capture \\
  -H "Authorization: Bearer sk_test_your_key" \\
  -d '{"amount": 3000}'`,
          node: `const captured = await mzzpay.payments.capture('pay_abc123', {
  amount: 3000,
});`,
          python: `captured = mzzpay.Payment.capture(
  "pay_abc123",
  amount=3000,
)`,
        }}
        response={`{
  "id": "pay_abc123",
  "status": "succeeded",
  "amount": 3000,
  "captured": true
}`}
      />

      <ApiEndpoint
        method="POST"
        path="/v1/payments/:id/refund"
        title="Refund a Payment"
        description="Issue a full or partial refund."
        params={[
          { name: "amount", type: "integer", required: false, desc: "Partial refund amount. Omit for full refund" },
          { name: "reason", type: "string", required: false, desc: "duplicate, fraudulent, requested_by_customer" },
        ]}
        code={{
          curl: `curl -X POST https://api.mzzpay.io/v1/payments/pay_abc123/refund \\
  -H "Authorization: Bearer sk_test_your_key" \\
  -d '{"amount": 2500, "reason": "requested_by_customer"}'`,
          node: `const refund = await mzzpay.payments.refund('pay_abc123', {
  amount: 2500,
  reason: 'requested_by_customer',
});`,
          python: `refund = mzzpay.Payment.refund(
  "pay_abc123",
  amount=2500,
  reason="requested_by_customer",
)`,
        }}
        response={`{
  "id": "ref_xyz789",
  "payment_id": "pay_abc123",
  "amount": 2500,
  "status": "succeeded",
  "reason": "requested_by_customer"
}`}
      />

      <section className="space-y-4 pt-4 border-t border-border">
        <h2 className="text-2xl font-heading font-semibold tracking-tight">
          Lifecycle, routing & refund semantics
        </h2>
        <DocsContentSection sectionId="payments" />
      </section>

      <section className="space-y-4 pt-4 border-t border-border">
        <h2 className="text-2xl font-heading font-semibold tracking-tight">
          Errors
        </h2>
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
