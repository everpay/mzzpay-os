import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CodeBlock } from "@/components/docs/CodeBlock";
import { DocsContentSection } from "@/components/docs/DocsContentSection";
import { DocsDownloadActions } from "@/components/docs/DocsDownloadActions";
import { Callout } from "@/components/docs/Callout";
import { Shield, AlertTriangle } from "lucide-react";

export default function DocsAuthentication() {
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <Badge variant="secondary" className="mb-3">API Reference</Badge>
          <h1 className="text-3xl font-heading font-bold tracking-tight">Authentication</h1>
          <p className="text-muted-foreground mt-2">Authenticate API requests with bearer tokens or HMAC-signed payloads.</p>
        </div>
        <DocsDownloadActions />
      </div>

      <Callout variant="warning" title="Never embed secret keys client-side">
        <code>sk_live_…</code> and <code>sk_test_…</code> keys must stay server-side. If a key
        leaks, rotate it from the dashboard immediately — old keys keep working for 24 hours
        after rotation to give you a clean cutover.
      </Callout>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg">Bearer Token Authentication</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Include your API key in the <code className="text-xs bg-muted px-1.5 py-0.5 rounded">Authorization</code> header of every request.
          </p>
          <CodeBlock
            code={{
              curl: `curl https://api.mzzpay.io/v1/payments \\
  -H "Authorization: Bearer sk_test_your_api_key"`,
              node: `const MzzPay = require('@mzzpay/node');
const mzzpay = new MzzPay('sk_test_your_api_key');

// All subsequent calls are authenticated
const payments = await mzzpay.payments.list();`,
              python: `import mzzpay
mzzpay.api_key = "sk_test_your_api_key"

# All subsequent calls are authenticated
payments = mzzpay.Payment.list()`,
            }}
          />
        </CardContent>
      </Card>

      <Card className="border-destructive/30 bg-destructive/5">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            <CardTitle className="text-lg">Key Security</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p><strong>Secret keys</strong> (<code className="text-xs bg-muted px-1 rounded">sk_</code>) must only be used server-side. Never expose them in client-side code.</p>
          <p><strong>Publishable keys</strong> (<code className="text-xs bg-muted px-1 rounded">pk_</code>) can be used in browser or mobile apps for checkout widgets.</p>
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div className="p-3 rounded-lg bg-accent/10 border border-accent/20">
              <p className="font-semibold text-foreground text-xs mb-1">Sandbox Keys</p>
              <p className="text-xs">Prefix: <code>sk_test_</code> / <code>pk_test_</code></p>
            </div>
            <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
              <p className="font-semibold text-foreground text-xs mb-1">Production Keys</p>
              <p className="text-xs">Prefix: <code>sk_live_</code> / <code>pk_live_</code></p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Error Responses</CardTitle>
        </CardHeader>
        <CardContent>
          <CodeBlock
            code={`// 401 Unauthorized
{
  "error": {
    "type": "authentication_error",
    "message": "Invalid API key provided.",
    "code": "invalid_api_key"
  }
}

// 403 Forbidden
{
  "error": {
    "type": "authorization_error",
    "message": "This key does not have permission for this resource.",
    "code": "insufficient_permissions"
  }
}`}
            language="curl"
          />
        </CardContent>
      </Card>

      <section className="space-y-4 pt-4 border-t border-border">
        <h2 className="text-2xl font-heading font-semibold tracking-tight">
          Bearer tokens & HMAC request signing
        </h2>
        <DocsContentSection sectionId="authentication" />
      </section>
    </div>
  );
}
