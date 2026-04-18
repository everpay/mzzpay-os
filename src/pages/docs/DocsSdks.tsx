import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, ExternalLink } from "lucide-react";
import { CodeBlock } from "@/components/docs/CodeBlock";

const sdks = [
  { name: "Node.js", pkg: "@mzzpay/node", version: "1.0.0", install: "npm install @mzzpay/node" },
  { name: "Python", pkg: "mzzpay", version: "1.0.0", install: "pip install mzzpay" },
  { name: "PHP", pkg: "mzzpay/mzzpay-php", version: "1.0.0", install: "composer require mzzpay/mzzpay-php" },
  { name: "Ruby", pkg: "mzzpay", version: "1.0.0", install: "gem install mzzpay" },
  { name: "Go", pkg: "github.com/mzzpay/mzzpay-go", version: "1.0.0", install: "go get github.com/mzzpay/mzzpay-go" },
  { name: "Java", pkg: "com.mzzpay:mzzpay-java", version: "1.0.0", install: "implementation 'com.mzzpay:mzzpay-java:1.0.0'" },
];

export default function DocsSdks() {
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <Badge variant="secondary" className="mb-3">SDKs & Libraries</Badge>
        <h1 className="text-3xl font-heading font-bold tracking-tight">SDK Downloads</h1>
        <p className="text-muted-foreground mt-2">Official client libraries for every major language.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sdks.map((sdk) => (
          <Card key={sdk.name} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{sdk.name}</Badge>
                  <span className="text-xs text-muted-foreground">v{sdk.version}</span>
                </div>
              </div>
              <CardTitle className="text-sm font-mono mt-2">{sdk.pkg}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="bg-muted/30 border border-border rounded px-3 py-2 text-xs font-mono">
                {sdk.install}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                  <ExternalLink className="w-3 h-3" /> Docs
                </Button>
                <Button variant="ghost" size="sm" className="gap-1.5 text-xs">
                  <Download className="w-3 h-3" /> GitHub
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Checkout.js (Browser)</CardTitle>
          <CardDescription>Drop-in payment form for web applications.</CardDescription>
        </CardHeader>
        <CardContent>
          <CodeBlock
            code={`<!-- Add to your HTML -->
<script src="https://js.mzzpay.io/v1/checkout.js"></script>

<script>
  const checkout = MzzPay.checkout({
    publishableKey: 'pk_test_your_key',
    amount: 5000,
    currency: 'usd',
    onSuccess: (result) => {
      console.log('Payment succeeded:', result.payment_id);
    },
    onError: (error) => {
      console.error('Payment failed:', error.message);
    }
  });

  checkout.mount('#payment-form');
</script>`}
            language="curl"
          />
        </CardContent>
      </Card>
    </div>
  );
}
