import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { DocsDownloadActions } from "@/components/docs/DocsDownloadActions";
import { CodeBlock } from "@/components/docs/CodeBlock";
import { OPENAPI_SPEC, buildPostmanCollection } from "@/lib/openapi-spec";
import { CURL_EXAMPLES } from "@/lib/api-curl-examples";
import { Download, FileJson, ExternalLink, Copy, Check, Code2, Terminal } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

export default function DocsApiReference() {
  const swaggerRef = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css";
    document.head.appendChild(link);

    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js";
    script.onload = () => {
      if (swaggerRef.current && (window as any).SwaggerUIBundle) {
        (window as any).SwaggerUIBundle({
          spec: OPENAPI_SPEC,
          domNode: swaggerRef.current,
          deepLinking: true,
          presets: [
            (window as any).SwaggerUIBundle.presets.apis,
            (window as any).SwaggerUIBundle.SwaggerUIStandalonePreset,
          ],
          layout: "BaseLayout",
          defaultModelsExpandDepth: 1,
          defaultModelExpandDepth: 2,
          docExpansion: "list",
          filter: true,
          tryItOutEnabled: false,
        });
        setLoaded(true);
      }
    };
    document.body.appendChild(script);

    return () => {
      document.head.removeChild(link);
      document.body.removeChild(script);
    };
  }, []);

  const downloadOpenAPI = () => {
    const blob = new Blob([JSON.stringify(OPENAPI_SPEC, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "mzzpay-openapi.json"; a.click();
    URL.revokeObjectURL(url);
    toast.success("OpenAPI spec downloaded");
  };

  const downloadPostman = () => {
    const collection = buildPostmanCollection();
    const blob = new Blob([JSON.stringify(collection, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "MzzPay.postman_collection.json"; a.click();
    URL.revokeObjectURL(url);
    toast.success("Postman collection downloaded");
  };

  const downloadSdk = async () => {
    const mod = await import("@/lib/mzzpay-sdk?raw");
    const blob = new Blob([mod.default], { type: "text/typescript" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "mzzpay-sdk.ts"; a.click();
    URL.revokeObjectURL(url);
    toast.success("TypeScript SDK downloaded");
  };

  const copySpec = () => {
    navigator.clipboard.writeText(JSON.stringify(OPENAPI_SPEC, null, 2));
    setCopied(true);
    toast.success("OpenAPI spec copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  // Group curl examples by tag
  const curlByTag: Record<string, { operationId: string; title: string; curl: string; description: string }[]> = {};
  for (const [opId, ex] of Object.entries(CURL_EXAMPLES)) {
    // Determine tag from operationId prefix
    let tag = "Other";
    if (opId.toLowerCase().includes("payment") && !opId.toLowerCase().includes("link")) tag = "Payments";
    else if (opId.toLowerCase().includes("customer") || opId.toLowerCase().includes("attach")) tag = "Customers";
    else if (opId.toLowerCase().includes("invoice")) tag = "Invoices";
    else if (opId.toLowerCase().includes("product")) tag = "Products";
    else if (opId.toLowerCase().includes("refund") && !opId.toLowerCase().includes("payment")) tag = "Refunds";
    else if (opId.toLowerCase().includes("payout")) tag = "Payouts";
    else if (opId.toLowerCase().includes("subscription")) tag = "Subscriptions";
    else if (opId.toLowerCase().includes("dispute") || opId.toLowerCase().includes("evidence")) tag = "Disputes";
    else if (opId.toLowerCase().includes("wallet") || opId.toLowerCase().includes("ledger")) tag = "Wallets & Balances";
    else if (opId.toLowerCase().includes("fx") || opId.toLowerCase().includes("convert")) tag = "FX";
    else if (opId.toLowerCase().includes("webhook")) tag = "Webhooks";
    else if (opId.toLowerCase().includes("link")) tag = "Payment Links";
    else if (opId.toLowerCase().includes("reconcil")) tag = "Reconciliation";

    if (!curlByTag[tag]) curlByTag[tag] = [];
    curlByTag[tag].push({ operationId: opId, ...ex });
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <Badge variant="secondary" className="mb-3">Interactive</Badge>
          <h1 className="text-3xl font-heading font-bold tracking-tight">API Reference</h1>
          <p className="text-muted-foreground mt-2">
            Explore every endpoint interactively with Swagger UI, copy-paste cURL commands,
            or download the typed TypeScript SDK to integrate in minutes.
          </p>
        </div>
        <DocsDownloadActions />
      </div>

      {/* Download actions */}
      <div className="flex flex-wrap gap-3">
        <Button variant="outline" size="sm" onClick={downloadOpenAPI}>
          <FileJson className="h-4 w-4 mr-2" /> Download OpenAPI JSON
        </Button>
        <Button variant="outline" size="sm" onClick={downloadPostman}>
          <Download className="h-4 w-4 mr-2" /> Download Postman Collection
        </Button>
        <Button variant="outline" size="sm" onClick={downloadSdk}>
          <Code2 className="h-4 w-4 mr-2" /> Download TypeScript SDK
        </Button>
        <Button variant="outline" size="sm" onClick={copySpec}>
          {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
          {copied ? "Copied!" : "Copy Spec"}
        </Button>
        <Button variant="ghost" size="sm" asChild>
          <a href="https://editor.swagger.io" target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-4 w-4 mr-2" /> Swagger Editor
          </a>
        </Button>
      </div>

      {/* Quick-start cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 space-y-2">
          <p className="text-sm font-semibold">Base URL</p>
          <code className="text-xs bg-muted px-2 py-1 rounded block break-all">https://api.mzzpay.io/v1</code>
        </Card>
        <Card className="p-4 space-y-2">
          <p className="text-sm font-semibold">Authentication</p>
          <code className="text-xs bg-muted px-2 py-1 rounded block">Authorization: Bearer sk_live_…</code>
        </Card>
        <Card className="p-4 space-y-2">
          <p className="text-sm font-semibold">Idempotency</p>
          <code className="text-xs bg-muted px-2 py-1 rounded block">Idempotency-Key: uuid-v4</code>
        </Card>
      </div>

      <Tabs defaultValue="swagger">
        <TabsList>
          <TabsTrigger value="swagger">Swagger UI</TabsTrigger>
          <TabsTrigger value="curl">cURL Examples</TabsTrigger>
          <TabsTrigger value="sdk">TypeScript SDK</TabsTrigger>
        </TabsList>

        {/* ── Swagger UI ─────────────────────────────── */}
        <TabsContent value="swagger" className="mt-6">
          <Card className="overflow-hidden">
            {!loaded && (
              <div className="flex items-center justify-center h-64">
                <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            <div ref={swaggerRef} className="swagger-ui-container" />
          </Card>
        </TabsContent>

        {/* ── cURL Examples ──────────────────────────── */}
        <TabsContent value="curl" className="mt-6 space-y-8">
          {Object.entries(curlByTag).map(([tag, examples]) => (
            <div key={tag} className="space-y-4">
              <h2 className="text-xl font-heading font-semibold flex items-center gap-2">
                <Terminal className="h-5 w-5 text-primary" />
                {tag}
              </h2>
              {examples.map((ex) => (
                <Card key={ex.operationId}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{ex.title}</CardTitle>
                    <CardDescription className="text-xs">{ex.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <CodeBlock code={ex.curl} language="curl" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ))}
        </TabsContent>

        {/* ── TypeScript SDK ─────────────────────────── */}
        <TabsContent value="sdk" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Start — TypeScript SDK</CardTitle>
              <CardDescription>
                Download the typed client and start integrating in under 5 minutes. 
                Zero dependencies — just <code>fetch</code>.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <CodeBlock
                code={`// 1. Download the SDK (click "Download TypeScript SDK" above)
// 2. Copy mzzpay-sdk.ts into your project
// 3. Import and use:

import { MzzPay } from './mzzpay-sdk';

const mzz = new MzzPay('sk_test_YOUR_KEY');

// Create a payment
const payment = await mzz.payments.create({
  amount: 5000,        // $50.00 in cents
  currency: 'usd',
  payment_method: 'pm_card_visa',
  description: 'Order #1234',
});
console.log(payment.status); // 'succeeded' | 'requires_action' | 'failed'

// List customers
const customers = await mzz.customers.list({ limit: 25 });
customers.data.forEach(c => console.log(c.email));

// Create a subscription
const sub = await mzz.subscriptions.create({
  customer_id: 'cus_abc123',
  plan_name: 'Pro Monthly',
  amount: 4900,
  currency: 'usd',
  interval: 'month',
});

// Check wallet balance
const wallets = await mzz.wallets.list('usd');
console.log(wallets[0].available_balance);

// FX conversion
const fx = await mzz.fx.convert({ amount: 100, from: 'USD', to: 'EUR' });
console.log(fx.converted, fx.rate);`}
                language="curl"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Available Resources</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                {[
                  { name: "payments", methods: "create, list, retrieve, capture, refund, cancel" },
                  { name: "customers", methods: "create, list, retrieve, update, del, attachPaymentMethod" },
                  { name: "invoices", methods: "create, list, retrieve, send, void" },
                  { name: "products", methods: "create, list, retrieve, update, del" },
                  { name: "refunds", methods: "list, retrieve" },
                  { name: "payouts", methods: "create, list, retrieve" },
                  { name: "subscriptions", methods: "create, list, retrieve, update, cancel" },
                  { name: "disputes", methods: "list, retrieve, submitEvidence" },
                  { name: "wallets", methods: "list, balanceTransactions" },
                  { name: "paymentLinks", methods: "create, list" },
                  { name: "fx", methods: "rates, convert" },
                  { name: "webhooks", methods: "create, list, del" },
                ].map(r => (
                  <div key={r.name} className="bg-muted/40 rounded-lg p-3">
                    <code className="font-mono text-xs font-semibold text-primary">mzz.{r.name}</code>
                    <p className="text-[11px] text-muted-foreground mt-1">{r.methods}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Error Handling</CardTitle>
            </CardHeader>
            <CardContent>
              <CodeBlock
                code={`import { MzzPay, MzzPayApiError } from './mzzpay-sdk';

const mzz = new MzzPay('sk_test_YOUR_KEY');

try {
  const payment = await mzz.payments.create({
    amount: 5000,
    currency: 'usd',
    payment_method: 'pm_card_declined',
  });
} catch (err) {
  if (err instanceof MzzPayApiError) {
    console.error(err.error.code);         // 'card_declined'
    console.error(err.error.decline_code); // 'insufficient_funds'
    console.error(err.error.message);      // 'Your card has insufficient funds.'
    console.error(err.error.request_id);   // 'req_2QHv7K...'
  }
}`}
                language="curl"
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Override Swagger UI styles to match dark theme */}
      <style>{`
        .swagger-ui-container .swagger-ui {
          font-family: var(--font-body, Inter, system-ui, sans-serif);
        }
        .swagger-ui-container .swagger-ui .topbar { display: none; }
        .swagger-ui-container .swagger-ui .info { margin: 0; padding: 1rem; }
        .swagger-ui-container .swagger-ui .scheme-container { display: none; }
        .dark .swagger-ui-container .swagger-ui {
          filter: invert(0.88) hue-rotate(180deg);
        }
        .dark .swagger-ui-container .swagger-ui img {
          filter: invert(1) hue-rotate(180deg);
        }
      `}</style>
    </div>
  );
}
