import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CodeBlock } from "@/components/docs/CodeBlock";
import { ApiEndpoint } from "@/components/docs/ApiEndpoint";
import { DocsDownloadActions } from "@/components/docs/DocsDownloadActions";
import { Callout } from "@/components/docs/Callout";

export default function DocsCustomers() {
  return (
    <div className="max-w-4xl mx-auto space-y-10">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <Badge variant="secondary" className="mb-3">API Reference</Badge>
          <h1 className="text-3xl font-heading font-bold tracking-tight">Customers API</h1>
          <p className="text-muted-foreground mt-2">
            Customers are stored in the <code>public.customers</code> table and scoped per
            merchant via the <code>merchant_id</code> + <code>email</code> unique constraint.
            All endpoints below are PostgREST endpoints protected by RLS — the authenticated
            user can only access rows belonging to their merchant.
          </p>
        </div>
        <DocsDownloadActions />
      </div>

      <Callout variant="info" title="PostgREST, not REST-by-hand">
        Every Customers endpoint is the auto-generated PostgREST surface for the{" "}
        <code>public.customers</code> table. Filtering uses PostgREST operators
        (<code>eq.</code>, <code>ilike.</code>, <code>in.()</code>) — see{" "}
        <a className="underline" href="https://postgrest.org/en/stable/api.html" target="_blank" rel="noreferrer">PostgREST docs</a>.
      </Callout>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">The Customer Object</CardTitle>
        </CardHeader>
        <CardContent>
          <CodeBlock
            code={`{
  "id": "8a2b1c3d-4e5f-6a7b-8c9d-0e1f2a3b4c5d",
  "merchant_id": "9b1c2d3e-4f5a-6b7c-8d9e-0a1b2c3d4e5f",
  "email": "jane@example.com",
  "first_name": "Jane",
  "last_name": "Doe",
  "billing_address": {
    "line1": "1 Market St",
    "city": "San Francisco",
    "country": "US",
    "postal_code": "94105"
  },
  "created_at": "2026-04-22T10:00:00Z",
  "updated_at": "2026-04-22T10:00:00Z"
}`}
            language="curl"
          />
          <p className="text-xs text-muted-foreground mt-2">
            Source: <code>public.customers</code> · RLS: merchants can SELECT/INSERT/UPDATE
            their own rows.
          </p>
        </CardContent>
      </Card>

      <ApiEndpoint
        method="POST"
        path="/rest/v1/customers"
        title="Create a Customer"
        description="Insert a row into public.customers. The merchant_id must match a merchant owned by the authenticated user."
        params={[
          { name: "merchant_id", type: "uuid", required: true, desc: "Owning merchant (must be owned by caller)" },
          { name: "email", type: "string", required: true, desc: "Customer email — unique per merchant" },
          { name: "first_name", type: "string", required: false, desc: "Given name" },
          { name: "last_name", type: "string", required: false, desc: "Family name" },
          { name: "billing_address", type: "jsonb", required: false, desc: "Free-form address object" },
        ]}
        code={{
          curl: `curl -X POST "https://api.mzzpay.io/rest/v1/customers" \\
  -H "Authorization: Bearer <user_jwt>" \\
  -H "apikey: <publishable_key>" \\
  -H "Content-Type: application/json" \\
  -H "Prefer: return=representation" \\
  -d '{
    "merchant_id": "9b1c2d3e-...",
    "email": "jane@example.com",
    "first_name": "Jane",
    "last_name": "Doe"
  }'`,
          node: `const { data, error } = await supabase
  .from('customers')
  .insert({
    merchant_id: merchant.id,
    email: 'jane@example.com',
    first_name: 'Jane',
    last_name: 'Doe',
  })
  .select()
  .single();`,
          python: `data = supabase.table("customers").insert({
    "merchant_id": merchant_id,
    "email": "jane@example.com",
    "first_name": "Jane",
    "last_name": "Doe",
}).execute()`,
        }}
        response={`[
  {
    "id": "8a2b1c3d-...",
    "merchant_id": "9b1c2d3e-...",
    "email": "jane@example.com",
    "first_name": "Jane",
    "last_name": "Doe",
    "billing_address": null,
    "created_at": "2026-04-22T10:00:00Z",
    "updated_at": "2026-04-22T10:00:00Z"
  }
]`}
      />

      <ApiEndpoint
        method="GET"
        path="/rest/v1/customers"
        title="List / Search Customers"
        description="Returns rows visible under RLS. Use ?email=ilike.*jane* for fuzzy search and select=id,email,... to project columns."
        params={[
          { name: "select", type: "string", required: false, desc: "Comma-separated column projection" },
          { name: "email", type: "string", required: false, desc: "PostgREST filter, e.g. eq.jane@example.com" },
          { name: "order", type: "string", required: false, desc: "e.g. created_at.desc" },
          { name: "limit", type: "integer", required: false, desc: "Max 1000 by default" },
        ]}
        code={{
          curl: `curl "https://api.mzzpay.io/rest/v1/customers?select=id,email,created_at&order=created_at.desc&limit=20" \\
  -H "Authorization: Bearer <user_jwt>" \\
  -H "apikey: <publishable_key>"`,
          node: `const { data } = await supabase
  .from('customers')
  .select('id, email, created_at')
  .order('created_at', { ascending: false })
  .limit(20);`,
          python: `data = supabase.table("customers").select("id,email,created_at").order("created_at", desc=True).limit(20).execute()`,
        }}
        response={`[
  { "id": "8a2b...", "email": "jane@example.com", "created_at": "2026-04-22T10:00:00Z" }
]`}
      />

      <ApiEndpoint
        method="PATCH"
        path="/rest/v1/customers?id=eq.{id}"
        title="Update a Customer"
        description="Patch one row by id. updated_at is set automatically by the update_customers_updated_at trigger."
        params={[
          { name: "first_name", type: "string", required: false, desc: "New given name" },
          { name: "last_name", type: "string", required: false, desc: "New family name" },
          { name: "billing_address", type: "jsonb", required: false, desc: "Replacement address object" },
        ]}
        code={{
          curl: `curl -X PATCH "https://api.mzzpay.io/rest/v1/customers?id=eq.8a2b1c3d-..." \\
  -H "Authorization: Bearer <user_jwt>" \\
  -H "apikey: <publishable_key>" \\
  -H "Content-Type: application/json" \\
  -d '{ "first_name": "Janet" }'`,
          node: `await supabase.from('customers')
  .update({ first_name: 'Janet' })
  .eq('id', '8a2b1c3d-...');`,
          python: `supabase.table("customers").update({"first_name": "Janet"}).eq("id", "8a2b1c3d-...").execute()`,
        }}
        response={`[ { "id": "8a2b...", "first_name": "Janet", "updated_at": "2026-04-22T11:00:00Z" } ]`}
      />

      <ApiEndpoint
        method="DELETE"
        path="/rest/v1/customers?id=eq.{id}"
        title="Delete a Customer"
        description="Cascades to subscriptions and payment_methods (ON DELETE CASCADE). Invoices remain because they reference customer_id without cascade."
        code={{
          curl: `curl -X DELETE "https://api.mzzpay.io/rest/v1/customers?id=eq.8a2b1c3d-..." \\
  -H "Authorization: Bearer <user_jwt>" \\
  -H "apikey: <publishable_key>"`,
          node: `await supabase.from('customers').delete().eq('id', '8a2b1c3d-...');`,
          python: `supabase.table("customers").delete().eq("id", "8a2b1c3d-...").execute()`,
        }}
        response={`HTTP/1.1 204 No Content`}
      />
    </div>
  );
}
