import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CodeBlock } from "@/components/docs/CodeBlock";
import { ApiEndpoint } from "@/components/docs/ApiEndpoint";
import { DocsDownloadActions } from "@/components/docs/DocsDownloadActions";
import { Callout } from "@/components/docs/Callout";

export default function DocsOpenBanking() {
  return (
    <div className="max-w-4xl mx-auto space-y-10">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <Badge variant="secondary" className="mb-3">API Reference</Badge>
          <h1 className="text-3xl font-heading font-bold tracking-tight">Open Banking API</h1>
          <p className="text-muted-foreground mt-2">
            Initiate bank-to-bank payments under PSD2 and Open Banking UK. Customers authorise
            in their banking app — funds settle in seconds via Faster Payments, SEPA Instant,
            or local instant rails. No cards, no chargebacks.
          </p>
        </div>
        <DocsDownloadActions />
      </div>

      <Callout variant="success" title="Why Open Banking">
        Open Banking transactions are <strong>cleared</strong> the moment the customer
        authorises. Cost is typically <strong>10× lower</strong> than card processing and
        settlement is real-time on supported rails (FPS in the UK, SEPA Instant in the EU).
      </Callout>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">The Bank Payment Object</CardTitle>
        </CardHeader>
        <CardContent>
          <CodeBlock
            code={`{
  "id": "obp_9QkLm2",
  "object": "open_banking_payment",
  "amount": 4999,
  "currency": "gbp",
  "status": "awaiting_authorisation",
  "rail": "fps",
  "redirect_url": "https://obp.mzzpay.io/auth/9QkLm2",
  "customer": {
    "name": "Ada Lovelace",
    "email": "ada@example.com"
  },
  "creditor": {
    "account_holder": "Acme Ltd",
    "sort_code": "20-00-00",
    "account_number": "55779911"
  },
  "reference": "INV-2026-0418",
  "expires_at": "2026-04-22T12:00:00Z"
}`}
            language="curl"
          />
        </CardContent>
      </Card>

      <ApiEndpoint
        method="POST"
        path="/v1/open-banking/payments"
        title="Initiate an Open Banking Payment"
        description="Create a Payment Initiation Request (PIS). Returns a redirect_url for the customer to authorise in their banking app."
        params={[
          { name: "amount", type: "integer", required: true, desc: "Amount in minor units" },
          { name: "currency", type: "string", required: true, desc: "gbp, eur (FPS / SEPA Instant supported)" },
          { name: "country", type: "string", required: true, desc: "ISO 3166-1 alpha-2 of the customer (e.g. GB, DE)" },
          { name: "reference", type: "string", required: true, desc: "Reference shown on the customer's bank statement" },
          { name: "return_url", type: "string", required: true, desc: "URL to redirect to after authorisation" },
          { name: "bank", type: "string", required: false, desc: "Pre-select an issuing bank (e.g. monzo, hsbc, ing). Otherwise the bank picker is shown" },
          { name: "customer_email", type: "string", required: false, desc: "Email for receipt and reconciliation" },
        ]}
        code={{
          curl: `curl -X POST https://api.mzzpay.io/v1/open-banking/payments \\
  -H "Authorization: Bearer sk_test_your_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "amount": 4999,
    "currency": "gbp",
    "country": "GB",
    "reference": "INV-2026-0418",
    "return_url": "https://shop.example.com/thanks",
    "bank": "monzo"
  }'`,
          node: `const payment = await mzzpay.openBanking.create({
  amount: 4999,
  currency: 'gbp',
  country: 'GB',
  reference: 'INV-2026-0418',
  return_url: 'https://shop.example.com/thanks',
  bank: 'monzo',
});

// Redirect the customer
window.location = payment.redirect_url;`,
          python: `payment = mzzpay.OpenBanking.create(
  amount=4999,
  currency="gbp",
  country="GB",
  reference="INV-2026-0418",
  return_url="https://shop.example.com/thanks",
  bank="monzo",
)`,
        }}
        response={`{
  "id": "obp_9QkLm2",
  "status": "awaiting_authorisation",
  "redirect_url": "https://obp.mzzpay.io/auth/9QkLm2",
  "expires_at": "2026-04-22T12:00:00Z"
}`}
      />

      <ApiEndpoint
        method="GET"
        path="/v1/open-banking/payments/:id"
        title="Retrieve an Open Banking Payment"
        description="Poll for status. Prefer the open_banking.payment.* webhooks over polling for production traffic."
        code={{
          curl: `curl https://api.mzzpay.io/v1/open-banking/payments/obp_9QkLm2 \\
  -H "Authorization: Bearer sk_test_your_key"`,
          node: `const payment = await mzzpay.openBanking.retrieve('obp_9QkLm2');`,
          python: `payment = mzzpay.OpenBanking.retrieve("obp_9QkLm2")`,
        }}
        response={`{
  "id": "obp_9QkLm2",
  "status": "completed",
  "settled_at": "2026-04-22T11:43:18Z",
  "rail_reference": "FPS-CLR-7710045"
}`}
      />

      <ApiEndpoint
        method="GET"
        path="/v1/open-banking/banks"
        title="List Supported Banks"
        description="Returns a list of Open Banking institutions available in a given country, including logos and supported features."
        params={[
          { name: "country", type: "string", required: true, desc: "ISO 3166-1 alpha-2 (GB, DE, FR, ES, IT, NL, IE)" },
        ]}
        code={{
          curl: `curl "https://api.mzzpay.io/v1/open-banking/banks?country=GB" \\
  -H "Authorization: Bearer sk_test_your_key"`,
          node: `const banks = await mzzpay.openBanking.banks.list({ country: 'GB' });`,
          python: `banks = mzzpay.OpenBanking.Banks.list(country="GB")`,
        }}
        response={`{
  "object": "list",
  "data": [
    { "id": "monzo", "name": "Monzo", "logo": "...", "instant": true },
    { "id": "hsbc", "name": "HSBC UK", "logo": "...", "instant": true },
    { "id": "barclays", "name": "Barclays", "logo": "...", "instant": true }
  ]
}`}
      />

      <ApiEndpoint
        method="POST"
        path="/v1/open-banking/refunds"
        title="Refund an Open Banking Payment"
        description="Issue a bank transfer refund back to the originating account. Refunds typically settle within 1 business day."
        params={[
          { name: "payment_id", type: "string", required: true, desc: "ID of the original Open Banking payment" },
          { name: "amount", type: "integer", required: false, desc: "Partial amount in minor units. Omit for full refund" },
          { name: "reason", type: "string", required: false, desc: "Internal reason code" },
        ]}
        code={{
          curl: `curl -X POST https://api.mzzpay.io/v1/open-banking/refunds \\
  -H "Authorization: Bearer sk_test_your_key" \\
  -d '{"payment_id": "obp_9QkLm2", "amount": 4999}'`,
          node: `const refund = await mzzpay.openBanking.refunds.create({
  payment_id: 'obp_9QkLm2',
  amount: 4999,
});`,
          python: `refund = mzzpay.OpenBanking.Refund.create(
  payment_id="obp_9QkLm2",
  amount=4999,
)`,
        }}
        response={`{
  "id": "obr_88AzQ",
  "payment_id": "obp_9QkLm2",
  "amount": 4999,
  "status": "pending"
}`}
      />
    </div>
  );
}
