import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CodeBlock } from "@/components/docs/CodeBlock";
import { ApiEndpoint } from "@/components/docs/ApiEndpoint";
import { DocsDownloadActions } from "@/components/docs/DocsDownloadActions";
import { Callout } from "@/components/docs/Callout";

export default function DocsFx() {
  return (
    <div className="max-w-4xl mx-auto space-y-10">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <Badge variant="secondary" className="mb-3">API Reference</Badge>
          <h1 className="text-3xl font-heading font-bold tracking-tight">FX &amp; Currency Conversion</h1>
          <p className="text-muted-foreground mt-2">
            Quote and execute currency conversions between supported wallet currencies. Quotes
            are valid for 60 seconds.
          </p>
        </div>
        <DocsDownloadActions />
      </div>

      <Callout variant="info" title="Quotes lock the rate">
        Always create a quote first, then execute it within the validity window. Direct
        conversion without a quote applies the spot rate at execution time, which may be less
        favourable.
      </Callout>

      <ApiEndpoint
        method="GET"
        path="/v1/fx/rate"
        title="Get a Spot Rate"
        description="Indicative mid-market rate. Not guaranteed for execution — use POST /v1/fx/quotes to lock a price."
        params={[
          { name: "from", type: "string", required: true, desc: "Source currency (e.g. usd)" },
          { name: "to", type: "string", required: true, desc: "Destination currency (e.g. eur)" },
        ]}
        code={{
          curl: `curl "https://api.mzzpay.io/v1/fx/rate?from=usd&to=eur" \\
  -H "Authorization: Bearer sk_test_your_key"`,
          node: `const rate = await mzzpay.fx.rate({ from: 'usd', to: 'eur' });`,
          python: `rate = mzzpay.FX.rate(**{"from": "usd", "to": "eur"})`,
        }}
        response={`{
  "from": "usd",
  "to": "eur",
  "rate": 0.9241,
  "as_of": "2026-04-22T10:14:00Z"
}`}
      />

      <ApiEndpoint
        method="POST"
        path="/v1/fx/quotes"
        title="Create a Quote"
        description="Locks an FX rate for 60 seconds. Execute via POST /v1/fx/quotes/:id/execute."
        params={[
          { name: "from", type: "string", required: true, desc: "Source currency" },
          { name: "to", type: "string", required: true, desc: "Destination currency" },
          { name: "amount", type: "integer", required: true, desc: "Amount in minor units of the source currency" },
        ]}
        code={{
          curl: `curl -X POST https://api.mzzpay.io/v1/fx/quotes \\
  -H "Authorization: Bearer sk_test_your_key" \\
  -d '{"from":"usd","to":"eur","amount":100000}'`,
          node: `const quote = await mzzpay.fx.quotes.create({
  from: 'usd', to: 'eur', amount: 100000,
});`,
          python: `quote = mzzpay.FX.Quote.create(
  **{"from": "usd"}, to="eur", amount=100000,
)`,
        }}
        response={`{
  "id": "fxq_3yPp",
  "from": "usd", "to": "eur",
  "rate": 0.9238,
  "source_amount": 100000,
  "target_amount": 92380,
  "expires_at": "2026-04-22T10:15:00Z"
}`}
      />

      <ApiEndpoint
        method="POST"
        path="/v1/fx/quotes/:id/execute"
        title="Execute a Quote"
        description="Atomically debits the source wallet and credits the destination wallet at the locked rate."
        code={{
          curl: `curl -X POST https://api.mzzpay.io/v1/fx/quotes/fxq_3yPp/execute \\
  -H "Authorization: Bearer sk_test_your_key"`,
          node: `const conversion = await mzzpay.fx.quotes.execute('fxq_3yPp');`,
          python: `conversion = mzzpay.FX.Quote.execute("fxq_3yPp")`,
        }}
        response={`{
  "id": "fx_8821",
  "quote_id": "fxq_3yPp",
  "status": "settled",
  "source_amount": 100000,
  "target_amount": 92380
}`}
      />
    </div>
  );
}
