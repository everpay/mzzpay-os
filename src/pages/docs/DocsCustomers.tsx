import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CodeBlock } from "@/components/docs/CodeBlock";
import { ApiEndpoint } from "@/components/docs/ApiEndpoint";

export default function DocsCustomers() {
  return (
    <div className="max-w-4xl mx-auto space-y-10">
      <div>
        <Badge variant="secondary" className="mb-3">API Reference</Badge>
        <h1 className="text-3xl font-heading font-bold tracking-tight">Customers API</h1>
        <p className="text-muted-foreground mt-2">Create and manage customer records, payment methods, and preferences.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">The Customer Object</CardTitle>
        </CardHeader>
        <CardContent>
          <CodeBlock
            code={`{
  "id": "cus_abc123",
  "object": "customer",
  "name": "Jane Doe",
  "email": "jane@example.com",
  "phone": "+1234567890",
  "description": "Premium customer",
  "payment_methods": ["pm_card_visa"],
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
        path="/v1/customers"
        title="Create a Customer"
        description="Create a new customer record."
        params={[
          { name: "name", type: "string", required: true, desc: "Customer full name" },
          { name: "email", type: "string", required: true, desc: "Customer email address" },
          { name: "phone", type: "string", required: false, desc: "Phone number in E.164 format" },
          { name: "metadata", type: "object", required: false, desc: "Custom key-value metadata" },
        ]}
        code={{
          curl: `curl -X POST https://api.mzzpay.com/v1/customers \\
  -H "Authorization: Bearer sk_test_your_key" \\
  -d '{
    "name": "Jane Doe",
    "email": "jane@example.com",
    "phone": "+1234567890"
  }'`,
          node: `const customer = await mzzpay.customers.create({
  name: 'Jane Doe',
  email: 'jane@example.com',
  phone: '+1234567890',
});`,
          python: `customer = mzzpay.Customer.create(
  name="Jane Doe",
  email="jane@example.com",
  phone="+1234567890",
)`,
        }}
        response={`{
  "id": "cus_abc123",
  "name": "Jane Doe",
  "email": "jane@example.com",
  "phone": "+1234567890",
  "created_at": "2026-04-09T12:00:00Z"
}`}
      />

      <ApiEndpoint
        method="GET"
        path="/v1/customers/:id"
        title="Retrieve a Customer"
        description="Get details of a specific customer."
        params={[]}
        code={{
          curl: `curl https://api.mzzpay.com/v1/customers/cus_abc123 \\
  -H "Authorization: Bearer sk_test_your_key"`,
          node: `const customer = await mzzpay.customers.retrieve('cus_abc123');`,
          python: `customer = mzzpay.Customer.retrieve("cus_abc123")`,
        }}
        response={`{
  "id": "cus_abc123",
  "name": "Jane Doe",
  "email": "jane@example.com",
  "payment_methods": ["pm_card_visa"]
}`}
      />

      <ApiEndpoint
        method="PATCH"
        path="/v1/customers/:id"
        title="Update a Customer"
        description="Update an existing customer's details."
        params={[
          { name: "name", type: "string", required: false, desc: "Updated name" },
          { name: "email", type: "string", required: false, desc: "Updated email" },
          { name: "metadata", type: "object", required: false, desc: "Updated metadata" },
        ]}
        code={{
          curl: `curl -X PATCH https://api.mzzpay.com/v1/customers/cus_abc123 \\
  -H "Authorization: Bearer sk_test_your_key" \\
  -d '{"name": "Jane Smith"}'`,
          node: `const customer = await mzzpay.customers.update('cus_abc123', {
  name: 'Jane Smith',
});`,
          python: `customer = mzzpay.Customer.update(
  "cus_abc123",
  name="Jane Smith",
)`,
        }}
        response={`{
  "id": "cus_abc123",
  "name": "Jane Smith",
  "updated_at": "2026-04-10T08:00:00Z"
}`}
      />

      <ApiEndpoint
        method="DELETE"
        path="/v1/customers/:id"
        title="Delete a Customer"
        description="Permanently delete a customer and all associated data."
        params={[]}
        code={{
          curl: `curl -X DELETE https://api.mzzpay.com/v1/customers/cus_abc123 \\
  -H "Authorization: Bearer sk_test_your_key"`,
          node: `await mzzpay.customers.delete('cus_abc123');`,
          python: `mzzpay.Customer.delete("cus_abc123")`,
        }}
        response={`{
  "id": "cus_abc123",
  "deleted": true
}`}
      />
    </div>
  );
}
