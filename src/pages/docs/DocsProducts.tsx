import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CodeBlock } from "@/components/docs/CodeBlock";
import { ApiEndpoint } from "@/components/docs/ApiEndpoint";
import { DocsDownloadActions } from "@/components/docs/DocsDownloadActions";

export default function DocsProducts() {
  return (
    <div className="max-w-4xl mx-auto space-y-10">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <Badge variant="secondary" className="mb-3">API Reference</Badge>
          <h1 className="text-3xl font-heading font-bold tracking-tight">Products API</h1>
          <p className="text-muted-foreground mt-2">
            The merchant catalog. Backed by <code>public.products</code> with strict RLS —
            authenticated merchants CRUD only their own rows. Referenced by payment links and
            invoices via JSONB snapshots.
          </p>
        </div>
        <DocsDownloadActions />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">The Product Object</CardTitle></CardHeader>
        <CardContent>
          <CodeBlock
            code={`{
  "id": "6f7a8b9c-0d1e-2f3a-4b5c-6d7e8f9a0b1c",
  "merchant_id": "9b1c2d3e-...",
  "name": "Premium Plan",
  "description": "Annual subscription",
  "price": 249.00,
  "currency": "USD",
  "stock": 999,
  "category": "subscription",
  "product_type": "digital",
  "sku": "PREM-ANNUAL-01",
  "image_url": "https://cdn.example.com/premium.png",
  "is_active": true,
  "created_at": "2026-04-22T10:00:00Z",
  "updated_at": "2026-04-22T10:00:00Z"
}`}
            language="curl"
          />
          <p className="text-xs text-muted-foreground mt-2">Source: <code>public.products</code></p>
        </CardContent>
      </Card>

      <ApiEndpoint
        method="POST"
        path="/rest/v1/products"
        title="Create a Product"
        description="Insert a row into public.products."
        params={[
          { name: "merchant_id", type: "uuid", required: true, desc: "Owning merchant" },
          { name: "name", type: "string", required: true, desc: "Display name" },
          { name: "price", type: "number", required: true, desc: "Major units. Default 0" },
          { name: "currency", type: "string", required: false, desc: "Default 'USD'" },
          { name: "stock", type: "integer", required: false, desc: "Default 0" },
          { name: "product_type", type: "string", required: false, desc: "physical | digital | subscription" },
          { name: "sku", type: "string", required: false, desc: "Merchant SKU" },
          { name: "image_url", type: "string", required: false, desc: "Hero image URL" },
          { name: "is_active", type: "boolean", required: false, desc: "Default true" },
        ]}
        code={{
          curl: `curl -X POST "https://api.mzzpay.io/rest/v1/products" -H "Authorization: Bearer <user_jwt>" -H "apikey: <publishable_key>" -H "Content-Type: application/json" -H "Prefer: return=representation" -d '{ "merchant_id":"9b1c...", "name":"Premium Plan", "price":249, "currency":"USD" }'`,
          node: `await supabase.from('products').insert({
  merchant_id: merchant.id, name: 'Premium Plan', price: 249, currency: 'USD',
}).select().single();`,
          python: `supabase.table("products").insert({...}).execute()`,
        }}
        response={`[ { "id": "6f7a...", "name": "Premium Plan", "price": 249, "is_active": true } ]`}
      />

      <ApiEndpoint
        method="GET"
        path="/rest/v1/products"
        title="List Products"
        description="Returns the merchant's catalog. Filter is_active=eq.true to show only live items."
        params={[
          { name: "is_active", type: "boolean", required: false, desc: "eq.true / eq.false" },
          { name: "category", type: "string", required: false, desc: "PostgREST filter" },
        ]}
        code={{
          curl: `curl "https://api.mzzpay.io/rest/v1/products?is_active=eq.true" -H "Authorization: Bearer <user_jwt>" -H "apikey: <publishable_key>"`,
          node: `await supabase.from('products').select('*').eq('is_active', true);`,
          python: `supabase.table("products").select("*").eq("is_active", True).execute()`,
        }}
        response={`[ { "id": "6f7a...", "name": "Premium Plan", "price": 249 } ]`}
      />

      <ApiEndpoint
        method="PATCH"
        path="/rest/v1/products?id=eq.{id}"
        title="Update a Product"
        description="Patch any column. Use is_active=false to soft-disable."
        code={{
          curl: `curl -X PATCH "https://api.mzzpay.io/rest/v1/products?id=eq.6f7a..." -H "Authorization: Bearer <user_jwt>" -H "apikey: <publishable_key>" -H "Content-Type: application/json" -d '{ "price": 199 }'`,
          node: `await supabase.from('products').update({ price: 199 }).eq('id', '6f7a...');`,
          python: `supabase.table("products").update({"price":199}).eq("id","6f7a...").execute()`,
        }}
        response={`[ { "id": "6f7a...", "price": 199 } ]`}
      />

      <ApiEndpoint
        method="DELETE"
        path="/rest/v1/products?id=eq.{id}"
        title="Delete a Product"
        description="Hard-deletes the row. payment_links.products JSONB snapshot remains intact."
        code={{
          curl: `curl -X DELETE "https://api.mzzpay.io/rest/v1/products?id=eq.6f7a..." -H "Authorization: Bearer <user_jwt>" -H "apikey: <publishable_key>"`,
          node: `await supabase.from('products').delete().eq('id', '6f7a...');`,
          python: `supabase.table("products").delete().eq("id","6f7a...").execute()`,
        }}
        response={`HTTP/1.1 204 No Content`}
      />
    </div>
  );
}
