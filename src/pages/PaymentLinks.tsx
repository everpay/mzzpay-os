import { useState } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Currency } from '@/lib/types';
import { Link2, Copy, ExternalLink, Mail, MessageSquare, QrCode, Check, Code, Globe } from 'lucide-react';
import { toast } from 'sonner';

const DOMAIN = 'mzzpay.io';

export default function PaymentLinks() {
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<Currency>('USD');
  const [description, setDescription] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [orderId, setOrderId] = useState(`ORD-${Date.now().toString(36).toUpperCase()}`);
  const [paymentMethod, setPaymentMethod] = useState<'all' | 'card' | 'openbanking'>('all');
  const [successUrl, setSuccessUrl] = useState('');
  const [cancelUrl, setCancelUrl] = useState('');
  const [copied, setCopied] = useState(false);

  const generatePaymentLink = () => {
    const params = new URLSearchParams();
    if (amount) params.set('amount', amount);
    params.set('currency', currency);
    if (description) params.set('description', encodeURIComponent(description));
    if (customerEmail) params.set('email', encodeURIComponent(customerEmail));
    if (customerName) params.set('name', encodeURIComponent(customerName));
    params.set('ref', orderId);
    if (paymentMethod !== 'all') params.set('method', paymentMethod);
    if (successUrl) params.set('success_url', encodeURIComponent(successUrl));
    if (cancelUrl) params.set('cancel_url', encodeURIComponent(cancelUrl));
    
    return `https://${DOMAIN}/checkout?${params.toString()}`;
  };

  const paymentLink = generatePaymentLink();

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(paymentLink);
    setCopied(true);
    toast.success('Payment link copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const generateEmbedCode = () => {
    return `<iframe
  src="${paymentLink}&embed=true"
  width="100%"
  height="600"
  frameborder="0"
  allow="payment"
  style="border-radius: 12px; border: 1px solid #e5e7eb;"
></iframe>`;
  };

  const generateQRUrl = () => {
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(paymentLink)}`;
  };

  return (
    <AppLayout>
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">Payment Links</h1>
        <p className="mt-1 text-sm text-muted-foreground">Create shareable payment links for your customers</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Configuration Panel */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Link2 className="h-5 w-5 text-primary" />
                Link Configuration
              </CardTitle>
              <CardDescription>Configure your payment link parameters</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Amount</Label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="bg-background border-border font-mono text-lg"
                    min="0.01"
                    step="0.01"
                  />
                  <p className="text-xs text-muted-foreground">Leave empty for customer to enter</p>
                </div>
                <div className="space-y-2">
                  <Label>Currency</Label>
                  <Select value={currency} onValueChange={(v) => setCurrency(v as Currency)}>
                    <SelectTrigger className="bg-background border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">🇺🇸 USD</SelectItem>
                      <SelectItem value="EUR">🇪🇺 EUR</SelectItem>
                      <SelectItem value="GBP">🇬🇧 GBP</SelectItem>
                      <SelectItem value="BRL">🇧🇷 BRL</SelectItem>
                      <SelectItem value="MXN">🇲🇽 MXN</SelectItem>
                      <SelectItem value="COP">🇨🇴 COP</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Payment Method</Label>
                <Select value={paymentMethod} onValueChange={(v: any) => setPaymentMethod(v)}>
                  <SelectTrigger className="bg-background border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Methods</SelectItem>
                    <SelectItem value="card">💳 Card Only</SelectItem>
                    <SelectItem value="openbanking">🏦 Open Banking Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Description / Invoice Reference</Label>
                <Textarea
                  placeholder="Payment for Order #123..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="bg-background border-border resize-none"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Customer Name (optional)</Label>
                  <Input
                    placeholder="John Doe"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="bg-background border-border"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Customer Email (optional)</Label>
                  <Input
                    type="email"
                    placeholder="customer@example.com"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    className="bg-background border-border"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Order / Reference ID</Label>
                <Input
                  value={orderId}
                  onChange={(e) => setOrderId(e.target.value)}
                  className="bg-background border-border font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Success Redirect URL</Label>
                  <Input
                    placeholder="https://yoursite.com/success"
                    value={successUrl}
                    onChange={(e) => setSuccessUrl(e.target.value)}
                    className="bg-background border-border text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Cancel Redirect URL</Label>
                  <Input
                    placeholder="https://yoursite.com/cancel"
                    value={cancelUrl}
                    onChange={(e) => setCancelUrl(e.target.value)}
                    className="bg-background border-border text-sm"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Integration Methods */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code className="h-5 w-5 text-primary" />
                Integration Methods
              </CardTitle>
              <CardDescription>Choose how to share your payment link</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="link" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="link">Direct Link</TabsTrigger>
                  <TabsTrigger value="embed">Embed</TabsTrigger>
                  <TabsTrigger value="qr">QR Code</TabsTrigger>
                  <TabsTrigger value="share">Share</TabsTrigger>
                </TabsList>

                <TabsContent value="link" className="mt-4 space-y-4">
                  <div className="flex gap-2">
                    <Input
                      value={paymentLink}
                      readOnly
                      className="bg-muted/50 border-border font-mono text-xs"
                    />
                    <Button onClick={copyToClipboard} variant="outline" className="shrink-0">
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                    <Button asChild variant="outline" className="shrink-0">
                      <a href={paymentLink} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Share this link directly with your customer via email, SMS, or any messaging platform.
                  </p>
                </TabsContent>

                <TabsContent value="embed" className="mt-4 space-y-4">
                  <div className="rounded-lg bg-muted/50 p-4 overflow-x-auto">
                    <pre className="text-xs font-mono text-foreground whitespace-pre-wrap break-all">
                      {generateEmbedCode()}
                    </pre>
                  </div>
                  <Button onClick={() => { navigator.clipboard.writeText(generateEmbedCode()); toast.success('Embed code copied'); }} variant="outline" className="gap-2">
                    <Copy className="h-4 w-4" />
                    Copy Embed Code
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Embed the payment widget directly on your website. The iframe will adapt to your container width.
                  </p>
                </TabsContent>

                <TabsContent value="qr" className="mt-4 space-y-4">
                  <div className="flex flex-col items-center gap-4">
                    <div className="rounded-lg border border-border bg-white p-4">
                      <img
                        src={generateQRUrl()}
                        alt="Payment QR Code"
                        className="h-[200px] w-[200px]"
                      />
                    </div>
                    <Button asChild variant="outline" className="gap-2">
                      <a href={generateQRUrl()} download="payment-qr.png">
                        <QrCode className="h-4 w-4" />
                        Download QR Code
                      </a>
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground text-center">
                    Display this QR code for in-person payments or print it on invoices.
                  </p>
                </TabsContent>

                <TabsContent value="share" className="mt-4 space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <Button variant="outline" className="gap-2 justify-start" asChild>
                      <a href={`mailto:${customerEmail}?subject=Payment%20Request&body=Please%20complete%20your%20payment%20here:%20${encodeURIComponent(paymentLink)}`}>
                        <Mail className="h-4 w-4" />
                        Send via Email
                      </a>
                    </Button>
                    <Button variant="outline" className="gap-2 justify-start" asChild>
                      <a href={`https://wa.me/?text=Complete%20your%20payment%20here:%20${encodeURIComponent(paymentLink)}`} target="_blank">
                        <MessageSquare className="h-4 w-4" />
                        WhatsApp
                      </a>
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* Preview Panel */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-primary" />
                Link Preview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border border-border bg-muted/30 p-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-10 w-10 rounded-lg gradient-primary flex items-center justify-center">
                    <Link2 className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">MZZPay Checkout</p>
                    <p className="text-xs text-muted-foreground">pay.{DOMAIN}</p>
                  </div>
                </div>

                {amount && (
                  <div className="text-center py-4 border-y border-border">
                    <p className="text-3xl font-bold text-foreground">
                      {new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(parseFloat(amount) || 0)}
                    </p>
                    {description && (
                      <p className="text-sm text-muted-foreground mt-1">{description}</p>
                    )}
                  </div>
                )}

                <div className="mt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Reference</span>
                    <span className="font-mono text-foreground">{orderId}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Methods</span>
                    <Badge variant="outline" className="text-xs">
                      {paymentMethod === 'all' ? 'Card, Open Banking' : paymentMethod === 'card' ? 'Card' : 'Open Banking'}
                    </Badge>
                  </div>
                  {customerEmail && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Customer</span>
                      <span className="text-foreground truncate max-w-[150px]">{customerEmail}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-medium text-foreground">Payment Methods Available</h4>
                <div className="flex flex-wrap gap-2">
                  {(paymentMethod === 'all' || paymentMethod === 'card') && (
                    <>
                      <Badge variant="secondary">💳 Card</Badge>
                      <Badge variant="secondary">🍎 Apple Pay</Badge>
                      <Badge variant="secondary">G Google Pay</Badge>
                    </>
                  )}
                  {(paymentMethod === 'all' || paymentMethod === 'openbanking') && (
                    <Badge variant="secondary">🏦 Open Banking</Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Security</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground space-y-2">
              <p>• All payment links use HTTPS encryption</p>
              <p>• Card data is tokenized via PCI-compliant vault</p>
              <p>• Links expire after 24 hours for security</p>
              <p>• Webhook notifications for payment status</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
