import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CodeBlock } from "@/components/docs/CodeBlock";
import { ApiEndpoint } from "@/components/docs/ApiEndpoint";
import { DocsDownloadActions } from "@/components/docs/DocsDownloadActions";
import { Callout } from "@/components/docs/Callout";

export default function DocsDisputes() {
  return (
    <div className="max-w-4xl mx-auto space-y-10">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <Badge variant="secondary" className="mb-3">API Reference</Badge>
          <h1 className="text-3xl font-heading font-bold tracking-tight">Disputes API</h1>
          <p className="text-muted-foreground mt-2">
            Manage chargebacks, retrieval requests, and inquiries. Submit evidence packages
            programmatically — MzzPay&apos;s Chargeflow integration auto-formats responses for
            each card network.
          </p>
        </div>
        <DocsDownloadActions />
      </div>

      <Callout variant="warning" title="Evidence deadlines are strict">
        Submit your evidence at least <strong>24 hours</strong> before <code>evidence_due_date</code>.
        Card networks will not accept late submissions and the dispute is automatically lost.
      </Callout>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">The Dispute Object</CardTitle>
        </CardHeader>
        <CardContent>
          <CodeBlock
            code={`{
  "id": "dp_8MzQp",
  "object": "dispute",
  "payment_id": "pay_abc123",
  "amount": 5000,
  "currency": "usd",
  "reason": "fraudulent",
  "status": "needs_response",
  "evidence_due_date": "2026-05-08T00:00:00Z",
  "network": "visa",
  "evidence": {},
  "outcome": null
}`}
            language="curl"
          />
        </CardContent>
      </Card>

      <ApiEndpoint
        method="GET"
        path="/v1/disputes/:id"
        title="Retrieve a Dispute"
        description="Get the current status, evidence checklist, and outcome of a dispute."
        code={{
          curl: `curl https://api.mzzpay.io/v1/disputes/dp_8MzQp \\
  -H "Authorization: Bearer sk_test_your_key"`,
          node: `const dispute = await mzzpay.disputes.retrieve('dp_8MzQp');`,
          python: `dispute = mzzpay.Dispute.retrieve("dp_8MzQp")`,
        }}
        response={`{
  "id": "dp_8MzQp",
  "status": "needs_response",
  "evidence_due_date": "2026-05-08T00:00:00Z"
}`}
      />

      <ApiEndpoint
        method="POST"
        path="/v1/disputes/:id"
        title="Update Dispute Evidence"
        description="Upload or update evidence fields. Submit when ready."
        params={[
          { name: "evidence", type: "object", required: true, desc: "Evidence fields: receipt, customer_communication, shipping_documentation, etc." },
          { name: "submit", type: "boolean", required: false, desc: "Set to true to lock the package and submit to the network" },
        ]}
        code={{
          curl: `curl -X POST https://api.mzzpay.io/v1/disputes/dp_8MzQp \\
  -H "Authorization: Bearer sk_test_your_key" \\
  -d '{
    "evidence": {
      "receipt": "file_rec_8821",
      "customer_communication": "file_msg_443",
      "service_documentation": "Subscription delivered as agreed."
    },
    "submit": true
  }'`,
          node: `await mzzpay.disputes.update('dp_8MzQp', {
  evidence: {
    receipt: 'file_rec_8821',
    customer_communication: 'file_msg_443',
  },
  submit: true,
});`,
          python: `mzzpay.Dispute.modify(
  "dp_8MzQp",
  evidence={"receipt": "file_rec_8821"},
  submit=True,
)`,
        }}
        response={`{
  "id": "dp_8MzQp",
  "status": "under_review",
  "submitted_at": "2026-04-22T11:14:00Z"
}`}
      />

      <ApiEndpoint
        method="POST"
        path="/v1/disputes/:id/accept"
        title="Accept a Dispute"
        description="Concede the dispute. The funds and dispute fee remain with the cardholder. Useful for low-value disputes where the cost of evidence outweighs recovery."
        code={{
          curl: `curl -X POST https://api.mzzpay.io/v1/disputes/dp_8MzQp/accept \\
  -H "Authorization: Bearer sk_test_your_key"`,
          node: `await mzzpay.disputes.accept('dp_8MzQp');`,
          python: `mzzpay.Dispute.accept("dp_8MzQp")`,
        }}
        response={`{ "id": "dp_8MzQp", "status": "lost", "outcome": "accepted" }`}
      />

      <ApiEndpoint
        method="GET"
        path="/v1/disputes"
        title="List Disputes"
        description="Paginated list of disputes. Filter by status, network, or date range."
        params={[
          { name: "status", type: "string", required: false, desc: "needs_response, under_review, won, lost" },
          { name: "network", type: "string", required: false, desc: "visa, mastercard, amex, discover" },
        ]}
        code={{
          curl: `curl "https://api.mzzpay.io/v1/disputes?status=needs_response" \\
  -H "Authorization: Bearer sk_test_your_key"`,
          node: `const disputes = await mzzpay.disputes.list({ status: 'needs_response' });`,
          python: `disputes = mzzpay.Dispute.list(status="needs_response")`,
        }}
        response={`{ "object": "list", "data": [...], "has_more": false }`}
      />
    </div>
  );
}
