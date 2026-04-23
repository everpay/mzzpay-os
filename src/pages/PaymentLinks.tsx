import { useState, useEffect, useRef, useCallback } from 'react';
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
import {
  Link2, Copy, ExternalLink, Mail, MessageSquare, QrCode, Check, Code, Globe,
  Download, Trash2, Pencil, Save, Plus, Loader2, ShieldCheck, ShieldAlert, ShieldQuestion,
} from 'lucide-react';
import { toast } from 'sonner';
import { QRCodeSVG } from 'qrcode.react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { Switch } from '@/components/ui/switch';
import { formatCurrency } from '@/lib/format';
import { buildCheckoutUrl, currentCheckoutHost, CHECKOUT_HOSTS } from '@/lib/checkout-url';

interface SavedLink {
  id: string;
  merchant_id: string;
  amount: number | null;
  currency: string;
  description: string | null;
  customer_email: string | null;
  customer_name: string | null;
  order_id: string | null;
  payment_method: string | null;
  success_url: string | null;
  cancel_url: string | null;
  url: string;
  status: string;
  created_at: string;
}

export default function PaymentLinks() {
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<Currency>('USD');
  const [description, setDescription] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [orderId, setOrderId] = useState(`ORD-${Date.now().toString(36).toUpperCase()}`);
  const [paymentMethod, setPaymentMethod] = useState<'all' | 'card' | 'openbanking' | 'crypto'>('all');
  const [successUrl, setSuccessUrl] = useState('');
  const [cancelUrl, setCancelUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [merchantId, setMerchantId] = useState('');
  const [editingLinkId, setEditingLinkId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    const fetchMerchantId = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: merchant } = await supabase
        .from('merchants')
        .select('id')
        .eq('user_id', user.id)
        .single();
      if (merchant) setMerchantId(merchant.id);
    };
    fetchMerchantId();
  }, []);

  const { data: savedLinks = [], isLoading: linksLoading } = useQuery({
    queryKey: ['payment-links', merchantId],
    queryFn: async () => {
      if (!merchantId) return [];
      const { data, error } = await supabase
        .from('payment_links' as any)
        .select('*')
        .eq('merchant_id', merchantId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as SavedLink[];
    },
    enabled: !!merchantId,
  });

  const generatePaymentLink = () => {
    return buildCheckoutUrl({
      amount: amount || undefined,
      currency,
      description: description || undefined,
      email: customerEmail || undefined,
      name: customerName || undefined,
      ref: orderId,
      method: paymentMethod,
      merchantId: merchantId || undefined,
      successUrl: successUrl || undefined,
      cancelUrl: cancelUrl || undefined,
    });
  };

  const paymentLink = generatePaymentLink();

  const copyToClipboard = async (link?: string) => {
    await navigator.clipboard.writeText(link || paymentLink);
    setCopied(true);
    toast.success('Payment link copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const savePaymentLink = async () => {
    if (!merchantId) { toast.error('Merchant not found'); return; }
    setSaving(true);
    try {
      const linkData = {
        merchant_id: merchantId,
        amount: amount ? parseFloat(amount) : null,
        currency,
        description: description || null,
        customer_email: customerEmail || null,
        customer_name: customerName || null,
        order_id: orderId,
        payment_method: paymentMethod,
        success_url: successUrl || null,
        cancel_url: cancelUrl || null,
        url: paymentLink,
        status: 'active',
      };

      if (editingLinkId) {
        const { error } = await supabase
          .from('payment_links' as any)
          .update({ ...linkData, updated_at: new Date().toISOString() })
          .eq('id', editingLinkId);
        if (error) throw error;
        toast.success('Payment link updated');
        setEditingLinkId(null);
      } else {
        const { error } = await supabase.from('payment_links' as any).insert(linkData);
        if (error) throw error;
        toast.success('Payment link saved');
      }
      queryClient.invalidateQueries({ queryKey: ['payment-links'] });
      resetForm();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const deleteLink = async (id: string) => {
    try {
      const { error } = await supabase.from('payment_links' as any).delete().eq('id', id);
      if (error) throw error;
      toast.success('Payment link deleted');
      queryClient.invalidateQueries({ queryKey: ['payment-links'] });
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete');
    }
  };

  const loadLinkForEditing = (link: SavedLink) => {
    setEditingLinkId(link.id);
    setAmount(link.amount?.toString() || '');
    setCurrency((link.currency || 'USD') as Currency);
    setDescription(link.description || '');
    setCustomerEmail(link.customer_email || '');
    setCustomerName(link.customer_name || '');
    setOrderId(link.order_id || '');
    setPaymentMethod((link.payment_method || 'all') as any);
    setSuccessUrl(link.success_url || '');
    setCancelUrl(link.cancel_url || '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetForm = () => {
    setAmount(''); setDescription(''); setCustomerEmail(''); setCustomerName('');
    setOrderId(`ORD-${Date.now().toString(36).toUpperCase()}`);
    setPaymentMethod('all'); setSuccessUrl(''); setCancelUrl(''); setEditingLinkId(null);
  };

  const generateEmbedCode = () => `<iframe
  src="${paymentLink}&embed=true"
  width="100%"
  height="600"
  frameborder="0"
  allow="payment"
  style="border-radius: 12px; border: 1px solid #e5e7eb;"
></iframe>`;

  const qrRef = useRef<HTMLDivElement>(null);

  const downloadQR = useCallback(() => {
    const svg = qrRef.current?.querySelector('svg');
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    canvas.width = 400; canvas.height = 400;
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      ctx?.drawImage(img, 0, 0, 400, 400);
      const a = document.createElement('a');
      a.download = 'payment-qr.png';
      a.href = canvas.toDataURL('image/png');
      a.click();
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  }, []);

  return (
    <AppLayout>
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">Payment Links</h1>
        <p className="mt-1 text-sm text-muted-foreground">Create, save, and share branded payment links</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Configuration Panel */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Link2 className="h-5 w-5 text-primary" />
                {editingLinkId ? 'Edit Payment Link' : 'Link Configuration'}
              </CardTitle>
              <CardDescription>
                {editingLinkId ? 'Update your payment link and save changes' : 'Configure your payment link parameters'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Amount</Label>
                  <Input
                    type="number" placeholder="0.00" value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="bg-background border-border font-mono text-lg"
                    min="0.01" step="0.01"
                  />
                  <p className="text-xs text-muted-foreground">Leave empty for customer to enter</p>
                </div>
                <div className="space-y-2">
                  <Label>Currency</Label>
                  <Select value={currency} onValueChange={(v) => setCurrency(v as Currency)}>
                    <SelectTrigger className="bg-background border-border"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">🇺🇸 USD</SelectItem>
                      <SelectItem value="EUR">🇪🇺 EUR</SelectItem>
                      <SelectItem value="GBP">🇬🇧 GBP</SelectItem>
                      <SelectItem value="BRL">🇧🇷 BRL</SelectItem>
                      <SelectItem value="MXN">🇲🇽 MXN</SelectItem>
                      <SelectItem value="COP">🇨🇴 COP</SelectItem>
                      <SelectItem value="CAD">🇨🇦 CAD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Payment Method</Label>
                <Select value={paymentMethod} onValueChange={(v: any) => setPaymentMethod(v)}>
                  <SelectTrigger className="bg-background border-border"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Methods</SelectItem>
                    <SelectItem value="card">💳 Card Only</SelectItem>
                    <SelectItem value="openbanking">🏦 Open Banking</SelectItem>
                    <SelectItem value="crypto">₿ Crypto</SelectItem>
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
                    placeholder="John Doe" value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="bg-background border-border"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Customer Email (optional)</Label>
                  <Input
                    type="email" placeholder="customer@example.com" value={customerEmail}
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

              <div className="flex gap-3 pt-2">
                <Button onClick={savePaymentLink} disabled={saving} className="gap-2">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {editingLinkId ? 'Update Link' : 'Save Link'}
                </Button>
                {editingLinkId && (
                  <Button variant="outline" onClick={resetForm}>
                    <Plus className="h-4 w-4 mr-1" /> New Link
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

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
                    <Input value={paymentLink} readOnly className="bg-muted/50 border-border font-mono text-xs" />
                    <Button onClick={() => copyToClipboard()} variant="outline" className="shrink-0">
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                    <Button asChild variant="outline" className="shrink-0">
                      <a href={paymentLink} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="embed" className="mt-4 space-y-4">
                  <div className="rounded-lg bg-muted/50 p-4 overflow-x-auto">
                    <pre className="text-xs font-mono text-foreground whitespace-pre-wrap break-all">{generateEmbedCode()}</pre>
                  </div>
                  <Button onClick={() => { navigator.clipboard.writeText(generateEmbedCode()); toast.success('Embed code copied'); }} variant="outline" className="gap-2">
                    <Copy className="h-4 w-4" /> Copy Embed Code
                  </Button>
                </TabsContent>

                <TabsContent value="qr" className="mt-4 space-y-4">
                  <div className="flex flex-col items-center gap-4">
                    <div ref={qrRef} className="rounded-lg border border-border bg-white p-4">
                      <QRCodeSVG value={paymentLink} size={200} />
                    </div>
                    <Button onClick={downloadQR} variant="outline" className="gap-2">
                      <Download className="h-4 w-4" /> Download QR Code
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="share" className="mt-4 space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <Button variant="outline" className="gap-2 justify-start" asChild>
                      <a href={`mailto:${customerEmail}?subject=Payment%20Request&body=Please%20complete%20your%20payment%20here:%20${encodeURIComponent(paymentLink)}`}>
                        <Mail className="h-4 w-4" /> Send via Email
                      </a>
                    </Button>
                    <Button variant="outline" className="gap-2 justify-start" asChild>
                      <a href={`https://wa.me/?text=Complete%20your%20payment%20here:%20${encodeURIComponent(paymentLink)}`} target="_blank" rel="noopener noreferrer">
                        <MessageSquare className="h-4 w-4" /> WhatsApp
                      </a>
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Saved Payment Links */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Link2 className="h-5 w-5 text-primary" />
                Saved Payment Links
              </CardTitle>
              <CardDescription>Reuse, edit, or delete your previously saved links</CardDescription>
            </CardHeader>
            <CardContent>
              {linksLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : savedLinks.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  No saved payment links yet. Create and save one above.
                </div>
              ) : (
                <div className="space-y-3">
                  {savedLinks.map((link) => (
                    <div
                      key={link.id}
                      className={`rounded-lg border p-4 space-y-2 transition-colors ${
                        editingLinkId === link.id ? 'border-primary bg-primary/5' : 'border-border bg-background'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <Badge variant={link.status === 'active' ? 'default' : 'secondary'} className="text-[10px] shrink-0">
                            {link.status}
                          </Badge>
                          <span className="font-medium text-sm text-foreground truncate">
                            {link.description || link.order_id || 'Payment Link'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => copyToClipboard(link.url)}>
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => loadLinkForEditing(link)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => deleteLink(link.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>
                          {link.amount ? formatCurrency(link.amount, link.currency as Currency) : 'Custom amount'} · {link.currency}
                        </span>
                        <span>{new Date(link.created_at).toLocaleDateString()}</span>
                      </div>
                      <div className="font-mono text-[10px] text-muted-foreground truncate">{link.url}</div>
                    </div>
                  ))}
                </div>
              )}
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
                    <p className="text-xs text-muted-foreground">mzzpay.io</p>
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
                    <Badge variant="outline" className="text-xs capitalize">
                      {paymentMethod === 'all' ? 'All' : paymentMethod}
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
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Security</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground space-y-2">
              <p>• All payment links use HTTPS encryption</p>
              <p>• Card data is tokenized via PCI-compliant vault</p>
              <p>• Real-time webhook notifications</p>
              <p>• 3D Secure authentication when required</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
