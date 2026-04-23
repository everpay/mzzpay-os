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
            Issue full or partial refunds against a completed transaction. Refunds are written
            to the <code>refunds</code> table immediately and reconciled with the acquirer on
            the next settlement cycle.
          </p>
        </div>
        <DocsDownloadActions />
      </div>

      <Callout variant="info" title="Refunds settle on the next payout cycle">
        The <code>refund.completed</code> response confirms the request was accepted by the
        acquirer. Funds reach the cardholder within 5–10 business days depending on the
        issuer. Subscribe to the <code>refund.created</code> webhook for real-time updates.
      </Callout>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">The Refund Object</CardTitle>
        </CardHeader>
        <CardContent>
          <CodeBlock
            code={`{
  "id": "8a2b1c3d-4e5f-6a7b-8c9d-0e1f2a3b4c5d",
  "object": "refund",
  "merchant_id": "mer_abc123",
  "transaction_id": "9b1c2d3e-4f5a-6b7c-8d9e-0a1b2c3d4e5f",
  "amount": 2500,
  "currency": "usd",
  "status": "completed",
  "reason": "requested_by_customer",
  "provider": "mzzpay-usd",
  "created_at": "2026-04-22T10:14:00Z"
}`}
            language="curl"
          />
        </CardContent>
      </Card>

      <ApiEndpoint
        method="POST"
        path="/functions/v1/refund-payment"
        title="Create a Refund"
        description="Refund a completed transaction. Validates that the refund amount does not exceed the original capture and writes an audit_logs entry."
        params={[
          { name: "transactionId", type: "uuid", required: true, desc: "ID of the transactions row to refund" },
          { name: "amount", type: "number", required: true, desc: "Refund amount in major units. Must be ≤ transaction.amount" },
          { name: "reason", type: "string", required: false, desc: "Free-text or one of: duplicate, fraudulent, requested_by_customer" },
        ]}
        code={{
          curl: `curl -X POST https://api.mzzpay.io/functions/v1/refund-payment \\
  -H "Authorization: Bearer <user_jwt>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "transactionId": "9b1c2d3e-4f5a-6b7c-8d9e-0a1b2c3d4e5f",
    "amount": 25.00,
    "reason": "requested_by_customer"
  }'`,
          node: `const { data, error } = await supabase.functions.invoke('refund-payment', {
  body: {
    transactionId: '9b1c...',
    amount: 25,
    reason: 'requested_by_customer',
  },
});`,
          python: `data = supabase.functions.invoke("refund-payment", body={
    "transactionId": "9b1c...",
    "amount": 25,
    "reason": "requested_by_customer",
})`,
        }}
        response={`{
  "success": true,
  "refund": {
    "id": "8a2b1c3d-...",
    "transaction_id": "9b1c2d3e-...",
    "amount": 25,
    "currency": "usd",
    "status": "completed",
    "reason": "requested_by_customer"
  }
}`}
      />

      <ApiEndpoint
        method="GET"
        path="/rest/v1/refunds"
        title="List Refunds"
        description="Query the refunds table. Filter by transaction, status, or date range using PostgREST operators."
        params={[
          { name: "transaction_id", type: "uuid", required: false, desc: "eq.<id> to filter by source transaction" },
          { name: "status", type: "string", required: false, desc: "eq.completed, eq.pending, eq.failed" },
          { name: "limit", type: "integer", required: false, desc: "Default 1000 cap" },
        ]}
        code={{
          curl: `curl "https://api.mzzpay.io/rest/v1/refunds?transaction_id=eq.9b1c..." \\
  -H "Authorization: Bearer <user_jwt>" \\
  -H "apikey: <publishable_key>"`,
          node: `const { data } = await supabase
  .from('refunds')
  .select('*')
  .eq('transaction_id', '9b1c...');`,
          python: `data = supabase.table("refunds").select("*").eq("transaction_id", "9b1c...").execute()`,
        }}
        response={`[
  {
    "id": "8a2b1c3d-...",
    "transaction_id": "9b1c...",
    "amount": 25,
    "status": "completed",
    "created_at": "2026-04-22T10:14:00Z"
  }
]`}
      />
    </div>
  );
}
