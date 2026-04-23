import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CodeBlock } from "@/components/docs/CodeBlock";
import { ApiEndpoint } from "@/components/docs/ApiEndpoint";
import { DocsDownloadActions } from "@/components/docs/DocsDownloadActions";
import { Callout } from "@/components/docs/Callout";

export default function DocsPaymentLinks() {
  return (
    <div className="max-w-4xl mx-auto space-y-10">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <Badge variant="secondary" className="mb-3">API Reference</Badge>
          <h1 className="text-3xl font-heading font-bold tracking-tight">Payment Links API</h1>
          <p className="text-muted-foreground mt-2">
            Shareable hosted-checkout URLs backed by <code>public.payment_links</code>.
            Send via email, SMS, or QR code — no front-end work required. The hosted page
            (<code>checkout.mzzpay.io</code>) reads the row, presents the right method tabs,
            and posts the final result through <code>payment-link-webhook</code>.
          </p>
        </div>
        <DocsDownloadActions />
      </div>

      <Callout variant="info" title="Status lifecycle">
        Rows start <code>active</code>. Set <code>status='inactive'</code> to deactivate.
        Successful checkouts trigger <code>payment_link.completed</code> via{" "}
        <code>payment-link-webhook</code> which also fans out to your merchant{" "}
        <code>webhook_url</code>.
      </Callout>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">The Payment Link Object</CardTitle>
        </CardHeader>
        <CardContent>
          <CodeBlock
            code={`{
  "id": "ee11ff22-3344-5566-7788-99aabbccddee",
  "merchant_id": "9b1c2d3e-...",
  "amount": 49.99,
  "currency": "GBP",
  "description": "Premium plan — annual",
  "customer_email": null,
  "customer_name": null,
  "order_id": "ORD-987",
  "payment_method": "all",
  "success_url": "https://shop.example.com/thanks",
  "cancel_url": "https://shop.example.com/cancel",
  "url": "https://checkout.mzzpay.io/?link=ee11ff22-...",
  "products": [
    { "id": "6f7a...", "name": "Premium Plan", "qty": 1, "price": 49.99 }
  ],
  "status": "active",
  "created_at": "2026-04-22T09:00:00Z"
}`}
            language="curl"
          />
          <p className="text-xs text-muted-foreground mt-2">
            Source: <code>public.payment_links</code> · <code>payment_method</code> ∈{" "}
            <code>all | card | open_banking | apple_pay | google_pay | crypto</code>.
          </p>
        </CardContent>
      </Card>

      <ApiEndpoint
        method="POST"
        path="/rest/v1/payment_links"
        title="Create a Payment Link"
        description="Insert a row. The url column must be set to the public hosted-checkout URL (the dashboard generates this for you when you create from the UI)."
        params={[
          { name: "merchant_id", type: "uuid", required: true, desc: "Owning merchant" },
          { name: "amount", type: "number", required: false, desc: "Major units. Omit for customer-entered amount" },
          { name: "currency", type: "string", required: false, desc: "ISO 4217. Default 'USD'" },
          { name: "description", type: "string", required: false, desc: "Shown on checkout" },
          { name: "payment_method", type: "string", required: false, desc: "all | card | open_banking | apple_pay | google_pay | crypto. Default 'all'" },
          { name: "success_url", type: "string", required: false, desc: "Post-payment redirect" },
          { name: "cancel_url", type: "string", required: false, desc: "Cancel redirect" },
          { name: "products", type: "jsonb", required: false, desc: "Snapshot of line items" },
          { name: "url", type: "string", required: true, desc: "Public URL (e.g. https://checkout.mzzpay.io/?link={id})" },
        ]}
        code={{
          curl: `curl -X POST "https://api.mzzpay.io/rest/v1/payment_links" \\
  -H "Authorization: Bearer <user_jwt>" \\
  -H "apikey: <publishable_key>" \\
  -H "Content-Type: application/json" \\
  -H "Prefer: return=representation" \\
  -d '{
    "merchant_id": "9b1c...",
    "amount": 49.99,
    "currency": "GBP",
    "description": "Premium plan — annual",
    "payment_method": "all",
    "url": "https://checkout.mzzpay.io/?link=PLACEHOLDER"
  }'`,
          node: `const { data } = await supabase.from('payment_links').insert({
  merchant_id: merchant.id,
  amount: 49.99, currency: 'GBP',
  description: 'Premium plan — annual',
  payment_method: 'all',
  url: \`https://checkout.mzzpay.io/?link=\${crypto.randomUUID()}\`,
}).select().single();`,
          python: `supabase.table("payment_links").insert({...}).execute()`,
        }}
        response={`[ { "id": "ee11...", "url": "https://checkout.mzzpay.io/?link=ee11...", "status": "active" } ]`}
      />

      <ApiEndpoint
        method="GET"
        path="/rest/v1/payment_links"
        title="List Payment Links"
        description="Filter by status to show only live links."
        params={[
          { name: "status", type: "string", required: false, desc: "eq.active | eq.inactive" },
          { name: "order", type: "string", required: false, desc: "e.g. created_at.desc" },
        ]}
        code={{
          curl: `curl "https://api.mzzpay.io/rest/v1/payment_links?status=eq.active&order=created_at.desc" \\
  -H "Authorization: Bearer <user_jwt>" \\
  -H "apikey: <publishable_key>"`,
          node: `const { data } = await supabase.from('payment_links').select('*').eq('status','active');`,
          python: `supabase.table("payment_links").select("*").eq("status","active").execute()`,
        }}
        response={`[ { "id": "ee11...", "amount": 49.99, "status": "active" } ]`}
      />

      <ApiEndpoint
        method="PATCH"
        path="/rest/v1/payment_links?id=eq.{id}"
        title="Deactivate a Payment Link"
        description="Set status to inactive. Existing in-flight checkout sessions complete normally — only new visits are blocked."
        code={{
          curl: `curl -X PATCH "https://api.mzzpay.io/rest/v1/payment_links?id=eq.ee11..." \\
  -H "Authorization: Bearer <user_jwt>" \\
  -H "apikey: <publishable_key>" \\
  -H "Content-Type: application/json" \\
  -d '{ "status": "inactive" }'`,
          node: `await supabase.from('payment_links').update({ status: 'inactive' }).eq('id', linkId);`,
          python: `supabase.table("payment_links").update({"status":"inactive"}).eq("id", link_id).execute()`,
        }}
        response={`[ { "id": "ee11...", "status": "inactive" } ]`}
      />

      <ApiEndpoint
        method="POST"
        path="/functions/v1/payment-link-webhook"
        title="(Internal) Hosted Checkout Callback"
        description="Called by the hosted checkout page when a payment-link session settles. You normally do NOT call this — but the contract is documented for reference."
        params={[
          { name: "event", type: "string", required: true, desc: "payment_link.completed | payment_link.failed | payment_link.expired | payment_link.refunded" },
          { name: "transaction_id", type: "uuid", required: true, desc: "transactions.id created by the checkout flow" },
          { name: "partner_session_id", type: "string", required: false, desc: "Hosted-page session id" },
          { name: "amount", type: "number", required: false, desc: "Amount captured" },
          { name: "currency", type: "string", required: false, desc: "Currency" },
          { name: "payment_method", type: "string", required: false, desc: "Method actually used" },
          { name: "merchant_id", type: "uuid", required: false, desc: "Override merchant resolution" },
        ]}
        code={{
          curl: `curl -X POST "https://api.mzzpay.io/functions/v1/payment-link-webhook" \\
  -H "Content-Type: application/json" \\
  -d '{
    "event": "payment_link.completed",
    "transaction_id": "9b1c...",
    "amount": 49.99,
    "currency": "GBP",
    "payment_method": "card"
  }'`,
          node: `await fetch(url, { method: 'POST', body: JSON.stringify({ event, transaction_id, amount, currency }) });`,
          python: `requests.post(url, json={"event":"payment_link.completed","transaction_id":"..."})`,
        }}
        response={`{ "received": true, "event": "payment_link.completed" }`}
      />
    </div>
  );
}
