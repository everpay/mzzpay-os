import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CodeBlock } from "@/components/docs/CodeBlock";
import { ApiEndpoint } from "@/components/docs/ApiEndpoint";

export default function DocsInvoices() {
  return (
    <div className="max-w-4xl mx-auto space-y-10">
      <div>
        <Badge variant="secondary" className="mb-3">API Reference</Badge>
        <h1 className="text-3xl font-heading font-bold tracking-tight">Invoices API</h1>
        <p className="text-muted-foreground mt-2">
          Create, send, and collect on invoices with hosted payment pages and automated reminders.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">The Invoice Object</CardTitle>
        </CardHeader>
        <CardContent>
          <CodeBlock
            code={`{
  "id": "inv_abc123",
  "object": "invoice",
  "invoice_number": "INV-2026-0001",
  "amount": 12500,
  "currency": "usd",
  "status": "open",
  "customer_id": "cus_abc123",
  "customer_email": "jane@example.com",
  "customer_name": "Jane Doe",
  "description": "Consulting services - April",
  "items": [
    { "name": "Strategy session", "qty": 5, "unit_price": 2500 }
  ],
  "due_date": "2026-05-01",
  "paid_at": null,
  "hosted_url": "https://pay.mzzpay.io/inv_abc123",
  "created_at": "2026-04-09T12:00:00Z"
}`}
            language="curl"
          />
        </CardContent>
      </Card>

      <ApiEndpoint
        method="POST"
        path="/v1/invoices"
        title="Create an Invoice"
        description="Create and optionally send an invoice to a customer."
        params={[
          { name: "customer_email", type: "string", required: true, desc: "Recipient email address" },
          { name: "amount", type: "integer", required: true, desc: "Total amount in smallest currency unit" },
          { name: "currency", type: "string", required: true, desc: "Three-letter ISO currency code" },
          { name: "items", type: "array", required: false, desc: "Line items: { name, qty, unit_price }" },
          { name: "due_date", type: "string", required: false, desc: "ISO 8601 date (YYYY-MM-DD)" },
          { name: "description", type: "string", required: false, desc: "Internal note shown on invoice" },
        ]}
        code={{
          curl: `curl -X POST https://api.mzzpay.io/v1/invoices \\
  -H "Authorization: Bearer sk_test_your_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "customer_email": "jane@example.com",
    "amount": 12500,
    "currency": "usd",
    "due_date": "2026-05-01"
  }'`,
          node: `const invoice = await mzzpay.invoices.create({
  customer_email: 'jane@example.com',
  amount: 12500,
  currency: 'usd',
  due_date: '2026-05-01',
});`,
          python: `invoice = mzzpay.Invoice.create(
  customer_email="jane@example.com",
  amount=12500,
  currency="usd",
  due_date="2026-05-01",
)`,
        }}
        response={`{
  "id": "inv_abc123",
  "invoice_number": "INV-2026-0001",
  "status": "open",
  "amount": 12500,
  "hosted_url": "https://pay.mzzpay.io/inv_abc123"
}`}
      />

      <ApiEndpoint
        method="GET"
        path="/v1/invoices"
        title="List Invoices"
        description="Retrieve a paginated list of invoices."
        params={[
          { name: "limit", type: "integer", required: false, desc: "1-100, default 10" },
          { name: "status", type: "string", required: false, desc: "open, paid, overdue, void" },
          { name: "customer_id", type: "string", required: false, desc: "Filter by customer" },
        ]}
        code={{
          curl: `curl https://api.mzzpay.io/v1/invoices?status=open \\
  -H "Authorization: Bearer sk_test_your_key"`,
          node: `const invoices = await mzzpay.invoices.list({ status: 'open' });`,
          python: `invoices = mzzpay.Invoice.list(status="open")`,
        }}
        response={`{
  "object": "list",
  "data": [...],
  "has_more": false,
  "total_count": 24
}`}
      />

      <ApiEndpoint
        method="POST"
        path="/v1/invoices/:id/send"
        title="Send an Invoice"
        description="Email the hosted invoice link to the customer."
        params={[]}
        code={{
          curl: `curl -X POST https://api.mzzpay.io/v1/invoices/inv_abc123/send \\
  -H "Authorization: Bearer sk_test_your_key"`,
          node: `await mzzpay.invoices.send('inv_abc123');`,
          python: `mzzpay.Invoice.send("inv_abc123")`,
        }}
        response={`{
  "id": "inv_abc123",
  "status": "open",
  "sent_at": "2026-04-09T12:00:00Z"
}`}
      />

      <ApiEndpoint
        method="POST"
        path="/v1/invoices/:id/void"
        title="Void an Invoice"
        description="Cancel an unpaid invoice."
        params={[]}
        code={{
          curl: `curl -X POST https://api.mzzpay.io/v1/invoices/inv_abc123/void \\
  -H "Authorization: Bearer sk_test_your_key"`,
          node: `await mzzpay.invoices.void('inv_abc123');`,
          python: `mzzpay.Invoice.void("inv_abc123")`,
        }}
        response={`{
  "id": "inv_abc123",
  "status": "void"
}`}
      />
    </div>
  );
}
