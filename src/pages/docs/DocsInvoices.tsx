import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CodeBlock } from "@/components/docs/CodeBlock";
import { ApiEndpoint } from "@/components/docs/ApiEndpoint";
import { DocsDownloadActions } from "@/components/docs/DocsDownloadActions";
import { Callout } from "@/components/docs/Callout";

export default function DocsInvoices() {
  return (
    <div className="max-w-4xl mx-auto space-y-10">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <Badge variant="secondary" className="mb-3">API Reference</Badge>
          <h1 className="text-3xl font-heading font-bold tracking-tight">Invoices API</h1>
          <p className="text-muted-foreground mt-2">
            Invoices live in <code>public.invoices</code>. Lifecycle:{" "}
            <code>draft → sent → paid | overdue | void</code>. Once <code>sent</code>, the row
            becomes anon-readable so the hosted <code>/pay/:invoiceId</code> page can render.
          </p>
        </div>
        <DocsDownloadActions />
      </div>

      <Callout variant="warning" title="Overdue is automatic">
        The scheduled <code>invoice-overdue-check</code> edge function flips any{" "}
        <code>sent</code> invoice past its <code>due_date</code> to <code>overdue</code>.
      </Callout>

      <Card>
        <CardHeader><CardTitle className="text-lg">The Invoice Object</CardTitle></CardHeader>
        <CardContent>
          <CodeBlock
            code={`{
  "id": "7c8d9e0f-1a2b-3c4d-5e6f-7a8b9c0d1e2f",
  "merchant_id": "9b1c2d3e-...",
  "customer_id": "8a2b1c3d-...",
  "customer_email": "jane@example.com",
  "customer_name": "Jane Doe",
  "invoice_number": "INV-2026-0087",
  "amount": 249.00,
  "currency": "USD",
  "status": "sent",
  "description": "Premium plan — April 2026",
  "items": [{ "name": "Premium plan", "quantity": 1, "unit_price": 249.00 }],
  "due_date": "2026-05-22T00:00:00Z",
  "paid_at": null,
  "transaction_id": null,
  "notes": null,
  "created_at": "2026-04-22T10:00:00Z",
  "updated_at": "2026-04-22T10:00:00Z"
}`}
            language="curl"
          />
          <p className="text-xs text-muted-foreground mt-2">Source: <code>public.invoices</code></p>
        </CardContent>
      </Card>

      <ApiEndpoint
        method="POST"
        path="/rest/v1/invoices"
        title="Create an Invoice"
        description="Insert a draft invoice. Set status='sent' to publish it."
        params={[
          { name: "merchant_id", type: "uuid", required: true, desc: "Owning merchant" },
          { name: "customer_email", type: "string", required: true, desc: "Recipient email" },
          { name: "amount", type: "number", required: true, desc: "Total in major units" },
          { name: "currency", type: "string", required: false, desc: "ISO 4217. Default 'USD'" },
          { name: "status", type: "string", required: false, desc: "draft | sent. Default 'draft'" },
          { name: "items", type: "jsonb", required: false, desc: "Line items array" },
          { name: "due_date", type: "timestamptz", required: false, desc: "Triggers overdue automation" },
          { name: "invoice_number", type: "string", required: false, desc: "Display reference" },
        ]}
        code={{
          curl: `curl -X POST "https://api.mzzpay.io/rest/v1/invoices" \\
  -H "Authorization: Bearer <user_jwt>" \\
  -H "apikey: <publishable_key>" \\
  -H "Content-Type: application/json" \\
  -H "Prefer: return=representation" \\
  -d '{ "merchant_id":"9b1c...", "customer_email":"jane@example.com", "amount":249, "currency":"USD", "status":"sent", "due_date":"2026-05-22T00:00:00Z" }'`,
          node: `await supabase.from('invoices').insert({
  merchant_id: merchant.id, customer_email: 'jane@example.com',
  amount: 249, currency: 'USD', status: 'sent',
  due_date: '2026-05-22T00:00:00Z',
}).select().single();`,
          python: `supabase.table("invoices").insert({...}).execute()`,
        }}
        response={`[ { "id": "7c8d...", "status": "sent", "created_at": "..." } ]`}
      />

      <ApiEndpoint
        method="GET"
        path="/rest/v1/invoices"
        title="List Invoices"
        description="Filter by customer, status, or date. Authenticated merchants see all of theirs; anon publishable key only sees sent/overdue."
        params={[
          { name: "status", type: "string", required: false, desc: "eq.draft | eq.sent | eq.paid | eq.overdue | eq.void" },
          { name: "customer_id", type: "uuid", required: false, desc: "Filter by customer" },
        ]}
        code={{
          curl: `curl "https://api.mzzpay.io/rest/v1/invoices?status=eq.sent" -H "Authorization: Bearer <user_jwt>" -H "apikey: <publishable_key>"`,
          node: `await supabase.from('invoices').select('*').eq('status','sent');`,
          python: `supabase.table("invoices").select("*").eq("status","sent").execute()`,
        }}
        response={`[ { "id": "7c8d...", "amount": 249, "status": "sent" } ]`}
      />

      <ApiEndpoint
        method="PATCH"
        path="/rest/v1/invoices?id=eq.{id}"
        title="Update / Mark Paid / Void"
        description="Patch status. Setting paid sets paid_at and links transaction_id."
        params={[
          { name: "status", type: "string", required: false, desc: "draft | sent | paid | overdue | void" },
          { name: "paid_at", type: "timestamptz", required: false, desc: "Set when marking paid" },
          { name: "transaction_id", type: "uuid", required: false, desc: "Link to transactions.id" },
        ]}
        code={{
          curl: `curl -X PATCH "https://api.mzzpay.io/rest/v1/invoices?id=eq.7c8d..." -H "Authorization: Bearer <user_jwt>" -H "apikey: <publishable_key>" -H "Content-Type: application/json" -d '{ "status":"paid", "paid_at":"2026-04-22T11:00:00Z" }'`,
          node: `await supabase.from('invoices').update({ status:'paid', paid_at: new Date().toISOString() }).eq('id', invoiceId);`,
          python: `supabase.table("invoices").update({"status":"paid"}).eq("id", id).execute()`,
        }}
        response={`[ { "id": "7c8d...", "status": "paid" } ]`}
      />

      <ApiEndpoint
        method="POST"
        path="/functions/v1/invoice-overdue-check"
        title="(Cron) Mark Overdue Invoices"
        description="Internal scheduled function — flips sent → overdue for past-due invoices."
        code={{
          curl: `curl -X POST "https://api.mzzpay.io/functions/v1/invoice-overdue-check" -H "Authorization: Bearer <service_role_key>"`,
          node: `await supabase.functions.invoke('invoice-overdue-check');`,
          python: `supabase.functions.invoke("invoice-overdue-check")`,
        }}
        response={`{ "updated": 3, "invoices": [...] }`}
      />
    </div>
  );
}
