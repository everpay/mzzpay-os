import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CodeBlock } from "@/components/docs/CodeBlock";
import { ApiEndpoint } from "@/components/docs/ApiEndpoint";
import { DocsDownloadActions } from "@/components/docs/DocsDownloadActions";

export default function DocsPaymentLinks() {
  return (
    <div className="max-w-4xl mx-auto space-y-10">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <Badge variant="secondary" className="mb-3">API Reference</Badge>
          <h1 className="text-3xl font-heading font-bold tracking-tight">Payment Links API</h1>
          <p className="text-muted-foreground mt-2">
            Shareable hosted-checkout URLs. Send via email, SMS, QR code, or embed in any
            channel without writing front-end code.
          </p>
        </div>
        <DocsDownloadActions />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">The Payment Link Object</CardTitle>
        </CardHeader>
        <CardContent>
          <CodeBlock
            code={`{
  "id": "plink_4Mz9k",
  "object": "payment_link",
  "url": "https://checkout.mzzpay.io/c/4Mz9k",
  "amount": 4999,
  "currency": "gbp",
  "active": true,
  "single_use": true,
  "redirect_url": "https://shop.example.com/thanks",
  "methods": ["card", "open_banking", "apple_pay"],
  "expires_at": null,
  "created_at": "2026-04-22T09:00:00Z"
}`}
            language="curl"
          />
        </CardContent>
      </Card>

      <ApiEndpoint
        method="POST"
        path="/v1/payment-links"
        title="Create a Payment Link"
        description="Create a hosted checkout link. Returns a URL you can share with the customer."
        params={[
          { name: "amount", type: "integer", required: true, desc: "Amount in minor units" },
          { name: "currency", type: "string", required: true, desc: "ISO currency code" },
          { name: "description", type: "string", required: false, desc: "Shown on the checkout page" },
          { name: "methods", type: "array", required: false, desc: "Allowed payment methods (card, open_banking, apple_pay, google_pay, crypto)" },
          { name: "single_use", type: "boolean", required: false, desc: "Deactivate after first successful payment. Defaults to true" },
          { name: "redirect_url", type: "string", required: false, desc: "Where to send the customer after payment" },
          { name: "expires_at", type: "string", required: false, desc: "ISO timestamp when the link expires" },
        ]}
        code={{
          curl: `curl -X POST https://api.mzzpay.io/v1/payment-links \\
  -H "Authorization: Bearer sk_test_your_key" \\
  -d '{
    "amount": 4999,
    "currency": "gbp",
    "description": "Premium plan — annual",
    "methods": ["card","open_banking","apple_pay"]
  }'`,
          node: `const link = await mzzpay.paymentLinks.create({
  amount: 4999,
  currency: 'gbp',
  description: 'Premium plan — annual',
  methods: ['card', 'open_banking', 'apple_pay'],
});`,
          python: `link = mzzpay.PaymentLink.create(
  amount=4999, currency="gbp",
  description="Premium plan — annual",
  methods=["card", "open_banking", "apple_pay"],
)`,
        }}
        response={`{
  "id": "plink_4Mz9k",
  "url": "https://checkout.mzzpay.io/c/4Mz9k",
  "active": true
}`}
      />

      <ApiEndpoint
        method="POST"
        path="/v1/payment-links/:id/deactivate"
        title="Deactivate a Payment Link"
        description="Disable a link so it can no longer accept payments. Existing pending sessions complete normally."
        code={{
          curl: `curl -X POST https://api.mzzpay.io/v1/payment-links/plink_4Mz9k/deactivate \\
  -H "Authorization: Bearer sk_test_your_key"`,
          node: `await mzzpay.paymentLinks.deactivate('plink_4Mz9k');`,
          python: `mzzpay.PaymentLink.deactivate("plink_4Mz9k")`,
        }}
        response={`{ "id": "plink_4Mz9k", "active": false }`}
      />

      <ApiEndpoint
        method="GET"
        path="/v1/payment-links"
        title="List Payment Links"
        description="Paginated list of links. Filter by active state."
        params={[
          { name: "active", type: "boolean", required: false, desc: "Filter to active or inactive links" },
        ]}
        code={{
          curl: `curl "https://api.mzzpay.io/v1/payment-links?active=true" \\
  -H "Authorization: Bearer sk_test_your_key"`,
          node: `const links = await mzzpay.paymentLinks.list({ active: true });`,
          python: `links = mzzpay.PaymentLink.list(active=True)`,
        }}
        response={`{ "object": "list", "data": [...], "has_more": false }`}
      />
    </div>
  );
}
