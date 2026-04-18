import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CodeBlock } from "@/components/docs/CodeBlock";
import { ApiEndpoint } from "@/components/docs/ApiEndpoint";

export default function DocsProducts() {
  return (
    <div className="max-w-4xl mx-auto space-y-10">
      <div>
        <Badge variant="secondary" className="mb-3">API Reference</Badge>
        <h1 className="text-3xl font-heading font-bold tracking-tight">Products API</h1>
        <p className="text-muted-foreground mt-2">
          Manage your catalog of products and digital goods to attach to payments, invoices, and subscriptions.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">The Product Object</CardTitle>
        </CardHeader>
        <CardContent>
          <CodeBlock
            code={`{
  "id": "prod_abc123",
  "object": "product",
  "name": "Pro Plan",
  "description": "Monthly subscription with all features",
  "price": 4999,
  "currency": "usd",
  "sku": "PRO-MO-001",
  "category": "subscription",
  "product_type": "service",
  "stock": 0,
  "image_url": "https://cdn.mzzpay.io/img/prod_abc123.png",
  "is_active": true,
  "created_at": "2026-04-09T12:00:00Z"
}`}
            language="curl"
          />
        </CardContent>
      </Card>

      <ApiEndpoint
        method="POST"
        path="/v1/products"
        title="Create a Product"
        description="Add a new product to your catalog."
        params={[
          { name: "name", type: "string", required: true, desc: "Product name shown to customers" },
          { name: "price", type: "integer", required: true, desc: "Price in smallest currency unit" },
          { name: "currency", type: "string", required: true, desc: "Three-letter ISO currency code" },
          { name: "sku", type: "string", required: false, desc: "Stock Keeping Unit identifier" },
          { name: "stock", type: "integer", required: false, desc: "Inventory count (omit for unlimited)" },
          { name: "product_type", type: "string", required: false, desc: "good, service, or digital" },
          { name: "image_url", type: "string", required: false, desc: "Public URL to product image" },
        ]}
        code={{
          curl: `curl -X POST https://api.mzzpay.io/v1/products \\
  -H "Authorization: Bearer sk_test_your_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Pro Plan",
    "price": 4999,
    "currency": "usd",
    "sku": "PRO-MO-001"
  }'`,
          node: `const product = await mzzpay.products.create({
  name: 'Pro Plan',
  price: 4999,
  currency: 'usd',
  sku: 'PRO-MO-001',
});`,
          python: `product = mzzpay.Product.create(
  name="Pro Plan",
  price=4999,
  currency="usd",
  sku="PRO-MO-001",
)`,
        }}
        response={`{
  "id": "prod_abc123",
  "name": "Pro Plan",
  "price": 4999,
  "currency": "usd",
  "is_active": true
}`}
      />

      <ApiEndpoint
        method="GET"
        path="/v1/products"
        title="List Products"
        description="Retrieve a paginated list of products."
        params={[
          { name: "limit", type: "integer", required: false, desc: "1-100, default 10" },
          { name: "is_active", type: "boolean", required: false, desc: "Filter by active status" },
          { name: "category", type: "string", required: false, desc: "Filter by category" },
        ]}
        code={{
          curl: `curl https://api.mzzpay.io/v1/products?is_active=true \\
  -H "Authorization: Bearer sk_test_your_key"`,
          node: `const products = await mzzpay.products.list({ is_active: true });`,
          python: `products = mzzpay.Product.list(is_active=True)`,
        }}
        response={`{
  "object": "list",
  "data": [...],
  "has_more": true,
  "total_count": 42
}`}
      />

      <ApiEndpoint
        method="PATCH"
        path="/v1/products/:id"
        title="Update a Product"
        description="Modify an existing product. Only included fields are updated."
        params={[
          { name: "name", type: "string", required: false, desc: "New name" },
          { name: "price", type: "integer", required: false, desc: "New price" },
          { name: "stock", type: "integer", required: false, desc: "New inventory level" },
          { name: "is_active", type: "boolean", required: false, desc: "Activate or deactivate" },
        ]}
        code={{
          curl: `curl -X PATCH https://api.mzzpay.io/v1/products/prod_abc123 \\
  -H "Authorization: Bearer sk_test_your_key" \\
  -d '{"price": 5499}'`,
          node: `const product = await mzzpay.products.update('prod_abc123', { price: 5499 });`,
          python: `product = mzzpay.Product.update("prod_abc123", price=5499)`,
        }}
        response={`{
  "id": "prod_abc123",
  "price": 5499,
  "updated_at": "2026-04-10T08:00:00Z"
}`}
      />

      <ApiEndpoint
        method="DELETE"
        path="/v1/products/:id"
        title="Delete a Product"
        description="Permanently remove a product from your catalog."
        params={[]}
        code={{
          curl: `curl -X DELETE https://api.mzzpay.io/v1/products/prod_abc123 \\
  -H "Authorization: Bearer sk_test_your_key"`,
          node: `await mzzpay.products.delete('prod_abc123');`,
          python: `mzzpay.Product.delete("prod_abc123")`,
        }}
        response={`{
  "id": "prod_abc123",
  "deleted": true
}`}
      />
    </div>
  );
}
