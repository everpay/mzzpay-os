import { useState } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Copy, Code2, Eye, Palette, CreditCard, Globe, Zap, ExternalLink, Check, Shield, Lock, Terminal } from 'lucide-react';

const JS_CDN_HOST = 'js.mzzpay.io';

export default function HostedPayment() {
  const [config, setConfig] = useState({
    amount: '',
    currency: 'USD',
    description: '',
    brandColor: 'hsl(172, 72%, 48%)',
    buttonText: 'Pay Now',
    showCardBrands: true,
    enableAPMs: true,
    testMode: true,
    companyName: 'My Business',
    logoUrl: '',
    locale: 'en',
    successUrl: '',
    cancelUrl: '',
  });
  const [copied, setCopied] = useState<string | null>(null);

  const embedCode = `<!-- MzzPay Hosted Payment Widget -->
<script src="https://${JS_CDN_HOST}/mzzpay.js"></script>
<div id="mzzpay-payment"></div>
<script>
  var widget = MzzPay.init({
    // Required parameters
    containerId: 'mzzpay-payment',
    publicKey: 'pk_live_YOUR_KEY',       // Replace with your API key
    amount: ${config.amount || '0'},
    currency: '${config.currency}',
    merchantId: 'YOUR_MERCHANT_UUID',    // Your merchant ID from Settings

    // Optional parameters
    description: '${config.description || 'Payment'}',
    testMode: ${config.testMode},         // Toggle: true = sandbox, false = live
    // invoiceId: 'inv_xxxx',            // Pre-fill from an existing invoice
    // successUrl: '${config.successUrl || 'https://yoursite.com/thank-you'}',
    // cancelUrl: '${config.cancelUrl || 'https://yoursite.com/cancel'}',
    // metadata: { orderId: '12345' },   // Forwarded to the transaction

    theme: {
      primaryColor: '${config.brandColor}',
      buttonText: '${config.buttonText}',
      companyName: '${config.companyName}',${config.logoUrl ? `\n      logoUrl: '${config.logoUrl}',` : ''}
    },
    options: {
      showCardBrands: ${config.showCardBrands},
      enableAPMs: ${config.enableAPMs},
      locale: '${config.locale}',
    },

    // Callbacks — all optional
    callbacks: {
      onSuccess: function(result) {
        // result = { transactionId, status, amount, currency }
        console.log('Payment successful:', result);
        ${config.successUrl ? `window.location.href = '${config.successUrl}';` : ''}
      },
      onError: function(error) {
        // error = { code, message, errorCode, processorMessage }
        console.error('Payment failed:', error);
      },
      onReady: function() {
        console.log('Widget loaded and ready');
      },
      onClose: function() {
        console.log('Widget closed by user');
      }
    }
  });

  // widget.destroy() — removes the iframe and cleans up listeners
</script>`;

  const reactCode = `import { useEffect } from 'react';

function MzzPayForm({ amount, currency }) {
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://${JS_CDN_HOST}/mzzpay.js';
    script.onload = () => {
      window.MzzPay.init({
        containerId: 'mzzpay-payment',
        publicKey: 'pk_live_YOUR_KEY',
        amount,
        currency,
        theme: { primaryColor: '${config.brandColor}' },
      });
    };
    document.body.appendChild(script);
    return () => script.remove();
  }, [amount, currency]);

  return <div id="mzzpay-payment" />;
}`;

  const npmCode = `npm install @mzzpay/js

// Then in your code:
import { MzzPay } from '@mzzpay/js';

const mzz = new MzzPay('pk_live_YOUR_KEY');
const { paymentIntent } = await mzz.createPayment({
  amount: ${config.amount || '1000'},
  currency: '${config.currency}',
  description: '${config.description || 'Payment'}',
});

// Mount the payment form
mzz.mount('#mzzpay-payment', { paymentIntent });`;

  const handleCopy = (code: string, label: string) => {
    navigator.clipboard.writeText(code);
    setCopied(label);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <AppLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">Hosted Payment</h1>
            <Badge variant="secondary" className="text-[10px] px-2 py-0.5">Drop-in</Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Embed a PCI-compliant payment form on any website with a single script tag
          </p>
        </div>
        <Badge className="bg-primary/10 text-primary border-primary/20 gap-1.5">
          <Globe className="h-3.5 w-3.5" />
          {JS_CDN_HOST}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ---- Left: Configuration ---- */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Palette className="h-5 w-5 text-primary" />
                Widget Configuration
              </CardTitle>
              <CardDescription>Customize your drop-in payment form</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Default Amount</Label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={config.amount}
                    onChange={(e) => setConfig(c => ({ ...c, amount: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Currency</Label>
                  <Select value={config.currency} onValueChange={(v) => setConfig(c => ({ ...c, currency: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                      <SelectItem value="GBP">GBP</SelectItem>
                      <SelectItem value="CAD">CAD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Input
                  placeholder="Payment for order #123"
                  value={config.description}
                  onChange={(e) => setConfig(c => ({ ...c, description: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label>Company Name</Label>
                <Input
                  value={config.companyName}
                  onChange={(e) => setConfig(c => ({ ...c, companyName: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label>Logo URL (optional)</Label>
                <Input
                  placeholder="https://example.com/logo.png"
                  value={config.logoUrl}
                  onChange={(e) => setConfig(c => ({ ...c, logoUrl: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Brand Color</Label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="color"
                      value={config.brandColor.startsWith('hsl') ? '#14B8A6' : config.brandColor}
                      onChange={(e) => setConfig(c => ({ ...c, brandColor: e.target.value }))}
                      className="h-10 w-10 rounded-md border border-input cursor-pointer"
                    />
                    <Input
                      value={config.brandColor}
                      onChange={(e) => setConfig(c => ({ ...c, brandColor: e.target.value }))}
                      className="font-mono text-sm"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Button Text</Label>
                  <Input
                    value={config.buttonText}
                    onChange={(e) => setConfig(c => ({ ...c, buttonText: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Success URL</Label>
                  <Input
                    placeholder="https://example.com/success"
                    value={config.successUrl}
                    onChange={(e) => setConfig(c => ({ ...c, successUrl: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Cancel URL</Label>
                  <Input
                    placeholder="https://example.com/cancel"
                    value={config.cancelUrl}
                    onChange={(e) => setConfig(c => ({ ...c, cancelUrl: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <Label>Show Card Brand Icons</Label>
                  <Switch checked={config.showCardBrands} onCheckedChange={(v) => setConfig(c => ({ ...c, showCardBrands: v }))} />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Enable Apple Pay / Google Pay</Label>
                  <Switch checked={config.enableAPMs} onCheckedChange={(v) => setConfig(c => ({ ...c, enableAPMs: v }))} />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Test Mode</Label>
                  <Switch checked={config.testMode} onCheckedChange={(v) => setConfig(c => ({ ...c, testMode: v }))} />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ---- Right: Preview & Code ---- */}
        <div className="space-y-6">
          {/* Live Preview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Eye className="h-5 w-5 text-primary" />
                Widget Preview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-xl border border-border bg-background p-6 space-y-5">
                <div className="text-center space-y-1">
                  {config.logoUrl ? (
                    <img src={config.logoUrl} alt="Logo" className="h-8 mx-auto mb-2" />
                  ) : (
                    <p className="font-heading font-bold text-foreground">{config.companyName}</p>
                  )}
                  {config.amount && (
                    <p className="text-2xl font-heading font-bold text-foreground">
                      {new Intl.NumberFormat('en-US', { style: 'currency', currency: config.currency }).format(Number(config.amount))}
                    </p>
                  )}
                  {config.description && (
                    <p className="text-sm text-muted-foreground">{config.description}</p>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Card Number</Label>
                    <div className="flex h-10 w-full rounded-2xl border border-input bg-muted/30 px-3 py-2 text-sm text-muted-foreground items-center gap-2">
                      <CreditCard className="h-4 w-4" />
                      4242 4242 4242 4242
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Expiry</Label>
                      <div className="h-10 rounded-2xl border border-input bg-muted/30 px-3 py-2 text-sm text-muted-foreground">MM / YY</div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">CVC</Label>
                      <div className="h-10 rounded-2xl border border-input bg-muted/30 px-3 py-2 text-sm text-muted-foreground">123</div>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Cardholder Name</Label>
                    <div className="h-10 rounded-2xl border border-input bg-muted/30 px-3 py-2 text-sm text-muted-foreground">John Doe</div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Billing Address</Label>
                    <div className="h-10 rounded-2xl border border-input bg-muted/30 px-3 py-2 text-sm text-muted-foreground flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      123 Main St, City, State
                    </div>
                  </div>
                </div>

                {config.showCardBrands && (
                  <div className="flex justify-center gap-2">
                    <img src="/logos/visa.svg" alt="Visa" className="h-6" />
                    <img src="/logos/mastercard.svg" alt="Mastercard" className="h-6" />
                    <img src="/logos/amex.svg" alt="Amex" className="h-6" />
                    <img src="/logos/discover.svg" alt="Discover" className="h-5" />
                  </div>
                )}

                <button
                  className="w-full h-11 rounded-full text-sm font-medium transition-colors"
                  style={{ backgroundColor: config.brandColor.startsWith('hsl') ? '#14B8A6' : config.brandColor, color: '#fff' }}
                >
                  <Lock className="inline h-3.5 w-3.5 mr-1.5 -mt-0.5" />
                  {config.buttonText}
                </button>

                {config.enableAPMs && (
                  <div className="space-y-2 pt-2 border-t border-border">
                    <p className="text-xs text-center text-muted-foreground">Or pay with</p>
                    <div className="grid grid-cols-3 gap-2">
                      <button className="h-10 rounded-lg border border-border bg-background flex items-center justify-center hover:bg-muted/50 transition-colors">
                        <img src="/logos/apple-pay.svg" alt="Apple Pay" className="h-5" />
                      </button>
                      <button className="h-10 rounded-lg border border-border bg-background flex items-center justify-center hover:bg-muted/50 transition-colors">
                        <img src="/logos/google-pay.svg" alt="Google Pay" className="h-5" />
                      </button>
                      <button className="h-10 rounded-lg border border-border bg-background flex items-center justify-center hover:bg-muted/50 transition-colors gap-1.5 px-2">
                        <img src="/logos/crypto.svg" alt="Crypto" className="h-5" />
                        <span className="text-xs font-medium text-muted-foreground">USDC</span>
                      </button>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground/70">
                  <Shield className="h-3 w-3" />
                  Powered by MzzPay • PCI DSS Level 1
                </div>
              </div>

              {config.testMode && (
                <div className="mt-3 flex items-center gap-2 p-2 rounded-lg bg-warning/10 border border-warning/20">
                  <Zap className="h-4 w-4 text-warning" />
                  <span className="text-xs text-warning font-medium">Test mode — no real charges</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Embed Code */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Code2 className="h-5 w-5 text-primary" />
                Integration Code
              </CardTitle>
              <CardDescription>
                Serve from <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">{JS_CDN_HOST}</code>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="html">
                <TabsList className="w-full">
                  <TabsTrigger value="html" className="flex-1">HTML</TabsTrigger>
                  <TabsTrigger value="react" className="flex-1">React</TabsTrigger>
                  <TabsTrigger value="npm" className="flex-1">npm</TabsTrigger>
                </TabsList>
                {[
                  { key: 'html', code: embedCode },
                  { key: 'react', code: reactCode },
                  { key: 'npm', code: npmCode },
                ].map(({ key, code }) => (
                  <TabsContent key={key} value={key}>
                    <div className="relative">
                      <pre className="rounded-lg bg-muted p-4 text-xs overflow-x-auto font-mono max-h-64 overflow-y-auto border border-border">
                        <code>{code}</code>
                      </pre>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-2 right-2 h-8 w-8"
                        onClick={() => handleCopy(code, key)}
                      >
                        {copied === key ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            </CardContent>
          </Card>

          {/* Supported Methods */}
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <CreditCard className="h-5 w-5 mx-auto mb-1 text-primary" />
                  <p className="text-xs font-medium text-foreground">Cards</p>
                  <p className="text-[10px] text-muted-foreground">Visa, MC, Amex, Discover</p>
                </div>
                <div>
                  <Globe className="h-5 w-5 mx-auto mb-1 text-primary" />
                  <p className="text-xs font-medium text-foreground">Wallets</p>
                  <p className="text-[10px] text-muted-foreground">Apple / Google Pay</p>
                </div>
                <div>
                  <Shield className="h-5 w-5 mx-auto mb-1 text-primary" />
                  <p className="text-xs font-medium text-foreground">3D Secure</p>
                  <p className="text-[10px] text-muted-foreground">SCA compliant</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
