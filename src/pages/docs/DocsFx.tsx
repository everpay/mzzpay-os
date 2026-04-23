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
          <h1 className="text-3xl font-heading font-bold tracking-tight">FX &amp; Conversions API</h1>
          <p className="text-muted-foreground mt-2">
            Convert between fiat currencies using MzzPay's mid-market rates. Rates are refreshed
            every 60 seconds by the <code>fx-rate-updater</code> worker and cached in the{" "}
            <code>fx_rates</code> table.
          </p>
        </div>
        <DocsDownloadActions />
      </div>

      <Callout variant="info" title="Mid-market quote, no spread">
        <code>fx-convert</code> returns the latest cached mid-market rate. The merchant FX
        spread (default 1.5%, configurable via <code>custom_markup_percentage</code> on the
        merchant) is applied at settlement, never on quotes.
      </Callout>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">The FX Rate Object</CardTitle>
        </CardHeader>
        <CardContent>
          <CodeBlock
            code={`{
  "id": "f1a2b3c4-...",
  "base_currency": "usd",
  "quote_currency": "eur",
  "rate": 0.9215,
  "source": "ecb",
  "fetched_at": "2026-04-22T10:00:03Z"
}`}
            language="curl"
          />
        </CardContent>
      </Card>

      <ApiEndpoint
        method="POST"
        path="/functions/v1/fx-convert"
        title="Convert an Amount"
        description="Returns the converted amount and the rate used. If base equals quote, rate is 1 and converted equals amount."
        params={[
          { name: "amount", type: "number", required: true, desc: "Amount in the base currency, major units" },
          { name: "from", type: "string", required: true, desc: "ISO 4217 base currency code" },
          { name: "to", type: "string", required: true, desc: "ISO 4217 quote currency code" },
        ]}
        code={{
          curl: `curl -X POST https://api.mzzpay.io/functions/v1/fx-convert \\
  -H "Authorization: Bearer <user_jwt>" \\
  -H "Content-Type: application/json" \\
  -d '{ "amount": 100, "from": "usd", "to": "eur" }'`,
          node: `const { data } = await supabase.functions.invoke('fx-convert', {
  body: { amount: 100, from: 'usd', to: 'eur' },
});`,
          python: `data = supabase.functions.invoke("fx-convert", body={"amount": 100, "from": "usd", "to": "eur"})`,
        }}
        response={`{
  "amount": 100,
  "converted": 92.15,
  "rate": 0.9215,
  "from": "usd",
  "to": "eur"
}`}
      />

      <ApiEndpoint
        method="GET"
        path="/rest/v1/fx_rates"
        title="List Recent Rates"
        description="Query the rate cache directly via PostgREST. Useful for displaying rate history charts or auditing settlement conversions."
        params={[
          { name: "base_currency", type: "string", required: false, desc: "eq.usd to filter base" },
          { name: "quote_currency", type: "string", required: false, desc: "eq.eur to filter quote" },
          { name: "order", type: "string", required: false, desc: "fetched_at.desc recommended" },
          { name: "limit", type: "integer", required: false, desc: "Default 1000 cap" },
        ]}
        code={{
          curl: `curl "https://api.mzzpay.io/rest/v1/fx_rates?base_currency=eq.usd&order=fetched_at.desc&limit=24" \\
  -H "Authorization: Bearer <user_jwt>" \\
  -H "apikey: <publishable_key>"`,
          node: `const { data } = await supabase
  .from('fx_rates')
  .select('*')
  .eq('base_currency', 'usd')
  .order('fetched_at', { ascending: false })
  .limit(24);`,
          python: `data = supabase.table("fx_rates").select("*").eq("base_currency", "usd").order("fetched_at", desc=True).limit(24).execute()`,
        }}
        response={`[
  {
    "base_currency": "usd",
    "quote_currency": "eur",
    "rate": 0.9215,
    "source": "ecb",
    "fetched_at": "2026-04-22T10:00:03Z"
  }
]`}
      />
    </div>
  );
}
