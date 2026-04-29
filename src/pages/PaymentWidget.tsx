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
import { Copy, Code2, Eye, Palette, CreditCard, Globe, Zap, ExternalLink, Check } from 'lucide-react';

export default function PaymentWidget() {
  const [widgetConfig, setWidgetConfig] = useState({
    amount: '',
    currency: 'USD',
    description: '',
    brandColor: '#0A0A0A',
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
  const [copied, setCopied] = useState(false);

  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;

  const embedCode = `<!-- Everpay Payment Widget -->
<script src="https://${projectId}.supabase.co/functions/v1/payment-widget-sdk"></script>
<div id="everpay-payment-container"></div>
<script>
  EverPay.init({
    containerId: 'everpay-payment-container',
    publicKey: 'YOUR_PUBLIC_KEY',
    amount: ${widgetConfig.amount || '0'},
    currency: '${widgetConfig.currency}',
    description: '${widgetConfig.description || 'Payment'}',
    theme: {
      primaryColor: '${widgetConfig.brandColor}',
      buttonText: '${widgetConfig.buttonText}',
      companyName: '${widgetConfig.companyName}',
      ${widgetConfig.logoUrl ? `logoUrl: '${widgetConfig.logoUrl}',` : ''}
    },
    options: {
      showCardBrands: ${widgetConfig.showCardBrands},
      enableAPMs: ${widgetConfig.enableAPMs},
      testMode: ${widgetConfig.testMode},
      locale: '${widgetConfig.locale}',
    },
    callbacks: {
      onSuccess: function(result) {
        ${widgetConfig.successUrl ? `window.location.href = '${widgetConfig.successUrl}';` : "console.log('Payment successful:', result);"}
      },
      onError: function(error) {
        console.error('Payment failed:', error);
      },
      onClose: function() {
        console.log('Widget closed');
      }
    }
  });
</script>`;

  const reactCode = `import { useEffect } from 'react';

function PaymentForm({ amount, currency }) {
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://${projectId}.supabase.co/functions/v1/payment-widget-sdk';
    script.onload = () => {
      window.EverPay.init({
        containerId: 'everpay-payment',
        publicKey: 'YOUR_PUBLIC_KEY',
        amount,
        currency,
        theme: { primaryColor: '${widgetConfig.brandColor}' },
      });
    };
    document.body.appendChild(script);
    return () => script.remove();
  }, [amount, currency]);

  return <div id="everpay-payment" />;
}`;

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <AppLayout>
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">Payment Widget</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Embed a Stripe-style payment form on your website — no PCI DSS required
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Configuration Panel */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Palette className="h-5 w-5 text-primary" />
                Widget Configuration
              </CardTitle>
              <CardDescription>Customize the look and feel of your payment widget</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Default Amount</Label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={widgetConfig.amount}
                    onChange={(e) => setWidgetConfig(c => ({ ...c, amount: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Currency</Label>
                  <Select value={widgetConfig.currency} onValueChange={(v) => setWidgetConfig(c => ({ ...c, currency: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                      <SelectItem value="GBP">GBP</SelectItem>
                      <SelectItem value="CAD">CAD</SelectItem>
                      <SelectItem value="BRL">BRL</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Input
                  placeholder="Payment for order #123"
                  value={widgetConfig.description}
                  onChange={(e) => setWidgetConfig(c => ({ ...c, description: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label>Company Name</Label>
                <Input
                  value={widgetConfig.companyName}
                  onChange={(e) => setWidgetConfig(c => ({ ...c, companyName: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label>Logo URL (optional)</Label>
                <Input
                  placeholder="https://example.com/logo.png"
                  value={widgetConfig.logoUrl}
                  onChange={(e) => setWidgetConfig(c => ({ ...c, logoUrl: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Brand Color</Label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="color"
                      value={widgetConfig.brandColor}
                      onChange={(e) => setWidgetConfig(c => ({ ...c, brandColor: e.target.value }))}
                      className="h-10 w-10 rounded-md border border-input cursor-pointer"
                    />
                    <Input
                      value={widgetConfig.brandColor}
                      onChange={(e) => setWidgetConfig(c => ({ ...c, brandColor: e.target.value }))}
                      className="font-mono text-sm"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Button Text</Label>
                  <Input
                    value={widgetConfig.buttonText}
                    onChange={(e) => setWidgetConfig(c => ({ ...c, buttonText: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Success Redirect URL</Label>
                  <Input
                    placeholder="https://example.com/success"
                    value={widgetConfig.successUrl}
                    onChange={(e) => setWidgetConfig(c => ({ ...c, successUrl: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Cancel Redirect URL</Label>
                  <Input
                    placeholder="https://example.com/cancel"
                    value={widgetConfig.cancelUrl}
                    onChange={(e) => setWidgetConfig(c => ({ ...c, cancelUrl: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <Label>Show Card Brand Icons</Label>
                  <Switch checked={widgetConfig.showCardBrands} onCheckedChange={(v) => setWidgetConfig(c => ({ ...c, showCardBrands: v }))} />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Enable Alternative Payment Methods</Label>
                  <Switch checked={widgetConfig.enableAPMs} onCheckedChange={(v) => setWidgetConfig(c => ({ ...c, enableAPMs: v }))} />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Test Mode</Label>
                  <Switch checked={widgetConfig.testMode} onCheckedChange={(v) => setWidgetConfig(c => ({ ...c, testMode: v }))} />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Preview & Code Panel */}
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
                {/* Mock Widget Preview */}
                <div className="text-center space-y-1">
                  {widgetConfig.logoUrl ? (
                    <img src={widgetConfig.logoUrl} alt="Logo" className="h-8 mx-auto mb-2" />
                  ) : (
                    <p className="font-heading font-bold text-foreground">{widgetConfig.companyName}</p>
                  )}
                  {widgetConfig.amount && (
                    <p className="text-2xl font-heading font-bold text-foreground">
                      {new Intl.NumberFormat('en-US', { style: 'currency', currency: widgetConfig.currency }).format(Number(widgetConfig.amount))}
                    </p>
                  )}
                  {widgetConfig.description && (
                    <p className="text-sm text-muted-foreground">{widgetConfig.description}</p>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Card Number</Label>
                    <div className="flex h-10 w-full rounded-md border border-input bg-muted/30 px-3 py-2 text-sm text-muted-foreground items-center gap-2">
                      <CreditCard className="h-4 w-4" />
                      4242 4242 4242 4242
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Expiry</Label>
                      <div className="h-10 rounded-md border border-input bg-muted/30 px-3 py-2 text-sm text-muted-foreground">MM / YY</div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">CVC</Label>
                      <div className="h-10 rounded-md border border-input bg-muted/30 px-3 py-2 text-sm text-muted-foreground">123</div>
                    </div>
                   </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Country</Label>
                    <div className="h-10 rounded-md border border-input bg-muted/30 px-3 py-2 text-sm text-muted-foreground flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      Select country
                    </div>
                  </div>
                </div>

                {widgetConfig.showCardBrands && (
                  <div className="flex justify-center gap-2">
                    <img src="/logos/visa.svg" alt="Visa" className="h-6" />
                    <img src="/logos/mastercard.svg" alt="Mastercard" className="h-6" />
                    <img src="/logos/amex.svg" alt="Amex" className="h-6" />
                  </div>
                )}

                <button
                  className="w-full h-11 rounded-full text-sm font-medium transition-colors"
                  style={{ backgroundColor: widgetConfig.brandColor, color: '#fff' }}
                >
                  {widgetConfig.buttonText}
                </button>

                {widgetConfig.enableAPMs && (
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

                <p className="text-[10px] text-center text-muted-foreground/70">
                  Powered by Everpay • PCI DSS Compliant
                </p>
              </div>

              {widgetConfig.testMode && (
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
                Embed Code
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="html">
                <TabsList className="w-full">
                  <TabsTrigger value="html" className="flex-1">HTML</TabsTrigger>
                  <TabsTrigger value="react" className="flex-1">React</TabsTrigger>
                </TabsList>
                <TabsContent value="html">
                  <div className="relative">
                    <pre className="rounded-lg bg-muted p-4 text-xs overflow-x-auto font-mono max-h-64 overflow-y-auto border border-border">
                      <code>{embedCode}</code>
                    </pre>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-2 right-2 h-8 w-8"
                      onClick={() => handleCopy(embedCode)}
                    >
                      {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </TabsContent>
                <TabsContent value="react">
                  <div className="relative">
                    <pre className="rounded-lg bg-muted p-4 text-xs overflow-x-auto font-mono max-h-64 overflow-y-auto border border-border">
                      <code>{reactCode}</code>
                    </pre>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-2 right-2 h-8 w-8"
                      onClick={() => handleCopy(reactCode)}
                    >
                      {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </TabsContent>
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
                  <p className="text-[10px] text-muted-foreground">Visa, MC, Amex</p>
                </div>
                <div>
                  <Globe className="h-5 w-5 mx-auto mb-1 text-primary" />
                  <p className="text-xs font-medium text-foreground">APMs</p>
                  <p className="text-[10px] text-muted-foreground">Apple/Google Pay</p>
                </div>
                <div>
                  <Zap className="h-5 w-5 mx-auto mb-1 text-primary" />
                  <p className="text-xs font-medium text-foreground">PacoPay</p>
                  <p className="text-[10px] text-muted-foreground">Card & APM Processing</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
