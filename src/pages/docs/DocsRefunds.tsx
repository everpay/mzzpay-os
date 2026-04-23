import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CodeBlock } from "@/components/docs/CodeBlock";
import { ApiEndpoint } from "@/components/docs/ApiEndpoint";
import { DocsDownloadActions } from "@/components/docs/DocsDownloadActions";
import { Callout } from "@/components/docs/Callout";

export default function DocsRefunds() {
  return (
    <div className="max-w-4xl mx-auto space-y-10">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <Badge variant="secondary" className="mb-3">API Reference</Badge>
          <h1 className="text-3xl font-heading font-bold tracking-tight">Refunds API</h1>
          <p className="text-muted-foreground mt-2">
            Issue full or partial refunds. Refunds are processed asynchronously and reconciled
            against the original captured payment.
          </p>
        </div>
        <DocsDownloadActions />
      </div>

      <Callout variant="info" title="Refunds settle on the next payout cycle">
        A successful refund response means the request was accepted by the processor. Funds
        return to the cardholder within 5–10 business days depending on the issuer. Listen for
        the <code>refund.succeeded</code> webhook for confirmation.
      </Callout>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">The Refund Object</CardTitle>
        </CardHeader>
        <CardContent>
          <CodeBlock
            code={`{
  "id": "ref_xyz789",
  "object": "refund",
  "payment_id": "pay_abc123",
  "amount": 2500,
  "currency": "usd",
  "status": "succeeded",
  "reason": "requested_by_customer",
  "processor_refund_id": "re_1Nx...",
  "created_at": "2026-04-22T10:14:00Z"
}`}
            language="curl"
          />
        </CardContent>
      </Card>

      <ApiEndpoint
        method="POST"
        path="/v1/refunds"
        title="Create a Refund"
        description="Refund a previously captured payment, fully or partially."
        params={[
          { name: "payment_id", type: "string", required: true, desc: "ID of the original payment to refund" },
          { name: "amount", type: "integer", required: false, desc: "Partial amount in minor units. Omit for full refund" },
          { name: "reason", type: "string", required: false, desc: "duplicate, fraudulent, requested_by_customer" },
          { name: "metadata", type: "object", required: false, desc: "Key-value metadata stored on the refund" },
        ]}
        code={{
          curl: `curl -X POST https://api.mzzpay.io/v1/refunds \\
  -H "Authorization: Bearer sk_test_your_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "payment_id": "pay_abc123",
    "amount": 2500,
    "reason": "requested_by_customer"
  }'`,
          node: `const refund = await mzzpay.refunds.create({
  payment_id: 'pay_abc123',
  amount: 2500,
  reason: 'requested_by_customer',
});`,
          python: `refund = mzzpay.Refund.create(
  payment_id="pay_abc123",
  amount=2500,
  reason="requested_by_customer",
)`,
        }}
        response={`{
  "id": "ref_xyz789",
  "payment_id": "pay_abc123",
  "amount": 2500,
  "currency": "usd",
  "status": "pending",
  "reason": "requested_by_customer"
}`}
      />

      <ApiEndpoint
        method="GET"
        path="/v1/refunds/:id"
        title="Retrieve a Refund"
        description="Fetch the latest state of a refund by ID."
        code={{
          curl: `curl https://api.mzzpay.io/v1/refunds/ref_xyz789 \\
  -H "Authorization: Bearer sk_test_your_key"`,
          node: `const refund = await mzzpay.refunds.retrieve('ref_xyz789');`,
          python: `refund = mzzpay.Refund.retrieve("ref_xyz789")`,
        }}
        response={`{
  "id": "ref_xyz789",
  "payment_id": "pay_abc123",
  "amount": 2500,
  "status": "succeeded"
}`}
      />

      <ApiEndpoint
        method="GET"
        path="/v1/refunds"
        title="List Refunds"
        description="Paginated list of refunds. Filter by payment, status, or date range."
        params={[
          { name: "payment_id", type: "string", required: false, desc: "Filter by source payment" },
          { name: "status", type: "string", required: false, desc: "pending, succeeded, failed" },
          { name: "limit", type: "integer", required: false, desc: "Max results (1-100, default 10)" },
        ]}
        code={{
          curl: `curl "https://api.mzzpay.io/v1/refunds?payment_id=pay_abc123" \\
  -H "Authorization: Bearer sk_test_your_key"`,
          node: `const refunds = await mzzpay.refunds.list({ payment_id: 'pay_abc123' });`,
          python: `refunds = mzzpay.Refund.list(payment_id="pay_abc123")`,
        }}
        response={`{
  "object": "list",
  "data": [...],
  "has_more": false,
  "total_count": 1
}`}
      />
    </div>
  );
}
