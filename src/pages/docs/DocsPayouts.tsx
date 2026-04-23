import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CodeBlock } from "@/components/docs/CodeBlock";
import { ApiEndpoint } from "@/components/docs/ApiEndpoint";
import { DocsDownloadActions } from "@/components/docs/DocsDownloadActions";
import { Callout } from "@/components/docs/Callout";

export default function DocsPayouts() {
  return (
    <div className="max-w-4xl mx-auto space-y-10">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <Badge variant="secondary" className="mb-3">API Reference</Badge>
          <h1 className="text-3xl font-heading font-bold tracking-tight">Payouts API</h1>
          <p className="text-muted-foreground mt-2">
            Move funds from your MzzPay balance to a connected bank account, card, or crypto
            wallet. Payouts route through SEPA, SWIFT, ACH, FPS, or on-chain rails based on
            the destination.
          </p>
        </div>
        <DocsDownloadActions />
      </div>

      <Callout variant="warning" title="Payouts are irreversible">
        Once a payout transitions to <code>in_transit</code> or <code>paid</code> it cannot be
        cancelled programmatically. Always confirm the recipient ID before submitting.
      </Callout>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">The Payout Object</CardTitle>
        </CardHeader>
        <CardContent>
          <CodeBlock
            code={`{
  "id": "po_2NxK9w",
  "object": "payout",
  "amount": 125000,
  "currency": "eur",
  "destination": "ba_iban_DE89...",
  "rail": "sepa",
  "status": "in_transit",
  "estimated_arrival": "2026-04-24",
  "fx": { "from": "usd", "to": "eur", "rate": 0.92 },
  "fee": 250,
  "created_at": "2026-04-22T09:30:00Z"
}`}
            language="curl"
          />
        </CardContent>
      </Card>

      <ApiEndpoint
        method="POST"
        path="/v1/payouts"
        title="Create a Payout"
        description="Send funds to a registered bank account or crypto wallet. FX is applied automatically when source and destination currencies differ."
        params={[
          { name: "amount", type: "integer", required: true, desc: "Amount in minor units of source currency" },
          { name: "currency", type: "string", required: true, desc: "Source currency (your wallet currency)" },
          { name: "destination", type: "string", required: true, desc: "Bank account or crypto wallet ID" },
          { name: "rail", type: "string", required: false, desc: "sepa, swift, ach, fps, or onchain. Auto-selected if omitted" },
          { name: "description", type: "string", required: false, desc: "Statement descriptor / memo" },
          { name: "metadata", type: "object", required: false, desc: "Custom key-value tags" },
        ]}
        code={{
          curl: `curl -X POST https://api.mzzpay.io/v1/payouts \\
  -H "Authorization: Bearer sk_test_your_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "amount": 125000,
    "currency": "eur",
    "destination": "ba_iban_DE89370400440532013000",
    "rail": "sepa",
    "description": "April settlement"
  }'`,
          node: `const payout = await mzzpay.payouts.create({
  amount: 125000,
  currency: 'eur',
  destination: 'ba_iban_DE89370400440532013000',
  rail: 'sepa',
});`,
          python: `payout = mzzpay.Payout.create(
  amount=125000,
  currency="eur",
  destination="ba_iban_DE89370400440532013000",
  rail="sepa",
)`,
        }}
        response={`{
  "id": "po_2NxK9w",
  "amount": 125000,
  "currency": "eur",
  "status": "pending",
  "estimated_arrival": "2026-04-24"
}`}
      />

      <ApiEndpoint
        method="GET"
        path="/v1/payouts/:id"
        title="Retrieve a Payout"
        description="Fetch the current status, rail, and tracking info for a payout."
        code={{
          curl: `curl https://api.mzzpay.io/v1/payouts/po_2NxK9w \\
  -H "Authorization: Bearer sk_test_your_key"`,
          node: `const payout = await mzzpay.payouts.retrieve('po_2NxK9w');`,
          python: `payout = mzzpay.Payout.retrieve("po_2NxK9w")`,
        }}
        response={`{
  "id": "po_2NxK9w",
  "status": "paid",
  "paid_at": "2026-04-24T14:02:00Z",
  "rail_reference": "TRN-SEPA-558912"
}`}
      />

      <ApiEndpoint
        method="POST"
        path="/v1/payouts/:id/cancel"
        title="Cancel a Payout"
        description="Cancel a payout that has not yet been submitted to the rail. Only works while status is pending."
        code={{
          curl: `curl -X POST https://api.mzzpay.io/v1/payouts/po_2NxK9w/cancel \\
  -H "Authorization: Bearer sk_test_your_key"`,
          node: `await mzzpay.payouts.cancel('po_2NxK9w');`,
          python: `mzzpay.Payout.cancel("po_2NxK9w")`,
        }}
        response={`{ "id": "po_2NxK9w", "status": "canceled" }`}
      />

      <ApiEndpoint
        method="GET"
        path="/v1/payouts"
        title="List Payouts"
        description="Paginated list of payouts. Filter by destination, status, rail, or date range."
        params={[
          { name: "status", type: "string", required: false, desc: "pending, in_transit, paid, failed, canceled" },
          { name: "rail", type: "string", required: false, desc: "sepa, swift, ach, fps, onchain" },
          { name: "limit", type: "integer", required: false, desc: "Max results (1-100, default 10)" },
        ]}
        code={{
          curl: `curl "https://api.mzzpay.io/v1/payouts?status=in_transit" \\
  -H "Authorization: Bearer sk_test_your_key"`,
          node: `const payouts = await mzzpay.payouts.list({ status: 'in_transit' });`,
          python: `payouts = mzzpay.Payout.list(status="in_transit")`,
        }}
        response={`{ "object": "list", "data": [...], "has_more": false }`}
      />
    </div>
  );
}
