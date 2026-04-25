import { useState } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Currency } from '@/lib/types';
import { resolveProvider } from '@/lib/providers';
import { Badge } from '@/components/ui/badge';
import { CreditCard, ArrowRight, Loader2, Globe, MapPin, CheckCircle2, XCircle, AlertTriangle, RotateCcw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { VGSCardForm } from '@/components/VGSCardForm';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ThreeDSecureModal } from '@/components/ThreeDSecureModal';
import { notifyError } from '@/lib/error-toast';

// Detect region from browser locale / timezone
function detectRegion(): { region: string; label: string; flag: string } {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const locale = navigator.language || 'en-US';

    if (tz.startsWith('Europe/') || locale.startsWith('en-GB') || locale.startsWith('de') || locale.startsWith('fr') || locale.startsWith('es-ES')) {
      return { region: 'EU', label: 'EU Region', flag: '🇪🇺' };
    }
    if (tz.startsWith('America/Sao_Paulo') || tz.startsWith('Brazil') || locale.startsWith('pt-BR')) {
      return { region: 'BR', label: 'Brazil', flag: '🇧🇷' };
    }
    if (tz.startsWith('America/Mexico') || locale.startsWith('es-MX')) {
      return { region: 'MX', label: 'Mexico', flag: '🇲🇽' };
    }
    if (tz.startsWith('America/Bogota') || locale.startsWith('es-CO')) {
      return { region: 'CO', label: 'Colombia', flag: '🇨🇴' };
    }
    return { region: 'US', label: 'US/Global', flag: '🌐' };
  } catch {
    return { region: 'US', label: 'US/Global', flag: '🌐' };
  }
}

// Map region to preferred currency
function regionToCurrency(region: string): Currency {
  switch (region) {
    case 'EU': return 'EUR';
    case 'BR': return 'BRL';
    case 'MX': return 'MXN';
    case 'CO': return 'COP';
    default: return 'USD';
  }
}

export default function NewPayment() {
  const detectedRegion = detectRegion();
  const defaultCurrency = regionToCurrency(detectedRegion.region);

  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<Currency>(defaultCurrency);
  const [email, setEmail] = useState('');
  const [description, setDescription] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'pix' | 'boleto' | 'apple_pay' | 'open_banking'>('card');
  const [cardNumber, setCardNumber] = useState('');
  const [expMonth, setExpMonth] = useState('');
  const [expYear, setExpYear] = useState('');
  const [cvc, setCvc] = useState('');
  const [holderName, setHolderName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [vgsToken, setVgsToken] = useState('');
  const [cardEntryMode, setCardEntryMode] = useState<'standard' | 'vgs'>('standard');
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [responseMessage, setResponseMessage] = useState<{ type: 'success' | 'error' | 'warning'; title: string; detail: string } | null>(null);

  // 3DS state
  const [show3DS, setShow3DS] = useState(false);
  const [threeDSUrl, setThreeDSUrl] = useState('');
  const [threeDSTxId, setThreeDSTxId] = useState('');

  const queryClient = useQueryClient();
  const selectedProvider = resolveProvider(currency, undefined, { paymentMethod });
  // UUID-based idempotency key generated client-side once per page load.
  // Same key on retries guarantees the backend treats them as the SAME logical
  // payment (returns the cached response with `duplicate: true`).
  const [idempotencyKey] = useState(() => `idk_${crypto.randomUUID()}`);

  const validate = (): boolean => {
    const errors: Record<string, string> = {};

    if (!amount || parseFloat(amount) <= 0) errors.amount = 'Amount must be greater than 0';
    if (parseFloat(amount) > 50000) errors.amount = 'Amount cannot exceed 50,000';

    if (paymentMethod === 'card' && cardEntryMode === 'standard') {
      if (!holderName.trim()) errors.holderName = 'Cardholder name is required';
      else if (!/^[a-zA-Z\s]+$/.test(holderName.trim())) errors.holderName = 'Name must contain only letters and spaces';
      if (!cardNumber.replace(/\s/g, '') || cardNumber.replace(/\s/g, '').length < 13) errors.cardNumber = 'Valid card number is required';
      if (!expMonth || !/^(0[1-9]|1[0-2]|[1-9])$/.test(expMonth)) errors.expMonth = 'Valid month (1-12)';
      if (!expYear || expYear.length < 2) errors.expYear = 'Valid year required';
      if (!cvc || cvc.length < 3) errors.cvc = 'Valid CVC required';
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Invalid email format';

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setResponseMessage(null);

    if (!validate()) return;

    setIsSubmitting(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setResponseMessage({ type: 'error', title: 'Authentication required', detail: 'Please sign in to create a payment' });
        return;
      }

      const payload: any = {
        amount: parseFloat(amount),
        currency,
        paymentMethod,
        customerEmail: email,
        description,
        idempotencyKey,
      };

      if (paymentMethod === 'card') {
        if (cardEntryMode === 'vgs' && vgsToken) {
          // Recurring / card-on-file path: VGS-vaulted token
          payload.vgsToken = vgsToken;
          payload.saveCard = true;
        } else if (cardNumber) {
          // One-off payment: PAN goes directly to processor, NOT through VGS
          payload.cardDetails = { number: cardNumber, expMonth, expYear, cvc, holderName: holderName.trim() };
          payload.saveCard = false;
        }
      }

      const { data, error } = await supabase.functions.invoke('process-payment', {
        body: payload,
      });

      if (error) {
        let detail = 'Edge Function returned a non-2xx status code';
        try {
          const ctx = (error as any).context;
          if (ctx && typeof ctx.json === 'function') {
            const body = await ctx.json();
            detail = body?.error || detail;
          } else if (data?.error) {
            detail = data.error;
          }
        } catch {}
        throw new Error(detail);
      }

      // Handle velocity/limit/processor errors returned as 200
      if (data?.velocityLimit || data?.limitError) {
        setResponseMessage({ type: 'error', title: 'Transaction blocked', detail: data.error });
        return;
      }

      // Strict server-side validation rejected the payload before any
      // processor call. Surface field-level reasons so the merchant fixes them.
      if (data?.error_code === 'processor_validation_error' || data?.code === 'processor_validation_error') {
        const fieldErrors = data?.validation?.fieldErrors ?? {};
        const detail = Object.entries(fieldErrors)
          .map(([k, v]) => `${k}: ${(v as string[]).join(', ')}`)
          .join('\n') || data.error;
        notifyError(
          { code: 'processor_validation_error', message: data.error },
          { description: detail },
        );
        setResponseMessage({
          type: 'error',
          title: 'Invalid payment details',
          detail: `${detail} [code: processor_validation_error]`,
        });
        return;
      }

      // Idempotency replay — backend recognized this key and returned the
      // cached response. Show "Duplicate request" instead of double-charging.
      if (data?.duplicate || data?.idempotency_replayed || data?.error_code === 'idempotency_conflict') {
        notifyError(
          { code: 'idempotency_conflict', message: 'Duplicate request' },
          {
            description:
              'This payment was already processed. We returned the original result instead of charging twice.',
          },
        );
        setResponseMessage({
          type: 'warning',
          title: 'Duplicate request',
          detail: `Already processed at ${data?.first_seen_at ?? 'a previous attempt'} [code: idempotency_conflict]`,
        });
        return;
      }

      if (data?.processorMisconfigured || data?.error_code === 'processor_misconfigured') {
        setResponseMessage({
          type: 'error',
          title: 'Processor not configured',
          detail: `${data.error} [code: processor_misconfigured]`,
        });
        return;
      }

      const providerStatus = (data?.providerResponse?.status || '').toLowerCase();
      const txStatus = (data?.providerResponse?.transaction_status || '').toLowerCase();
      if (['failed', 'declined', 'rejected', 'error'].includes(providerStatus) || ['failed', 'declined', 'rejected'].includes(txStatus)) {
        const apiError = data.providerResponse?.error?.message || data.providerResponse?.gateway_message || 'Provider declined the transaction';
        setResponseMessage({ type: 'warning', title: 'Payment declined by provider', detail: apiError });
        return;
      }

      // Handle 3DS redirect (Mondo INITIATED status)
      if (data?.providerResponse?.transaction_status === 'INITIATED' && data?.providerResponse?.['3d_secure_redirect_url']) {
        setThreeDSUrl(data.providerResponse['3d_secure_redirect_url']);
        setThreeDSTxId(data.transaction.id);
        setShow3DS(true);
        setResponseMessage({
          type: 'success',
          title: 'Payment initiated — 3D Secure required',
          detail: `${amount} ${currency} via ${selectedProvider} — TX: ${data.transaction.id.slice(0, 8)}. Complete 3DS authentication.`,
        });
        queryClient.invalidateQueries({ queryKey: ['transactions'] });
        return;
      }

      setResponseMessage({
        type: 'success',
        title: 'Payment created successfully',
        detail: `${amount} ${currency} via ${selectedProvider} — ID: ${data.transaction.id.slice(0, 8)}`,
      });

      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      setAmount(''); setEmail(''); setDescription('');
      setCardNumber(''); setExpMonth(''); setExpYear(''); setCvc(''); setHolderName('');
    } catch (error) {
      console.error('Payment error:', error);
      setResponseMessage({
        type: 'error',
        title: 'Payment failed',
        detail: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const providerRegionLabel: Record<string, { label: string; badge: string }> = {
    mondo: { label: 'EU / UK open banking', badge: '🇪🇺 Openbanking EU' },
    mzzpay: { label: 'Primary 2D card MID', badge: '🌐 US/International' },
    matrix: { label: 'Gambling / sportsbook (admin-enabled)', badge: '🎰 EU/International' },
    shieldhub: { label: 'Primary 2D card MID', badge: '🌐 US/International' },
    stripe: { label: 'Global fallback', badge: '⚡ Stripe' },
  };

  const providerInfo = providerRegionLabel[selectedProvider] || { label: '', badge: selectedProvider };

  return (
    <AppLayout>
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">Create Payment</h1>
            <p className="mt-1 text-sm text-muted-foreground">Route payment through optimal provider</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => {
              setAmount(''); setEmail(''); setDescription('');
              setCardNumber(''); setExpMonth(''); setExpYear(''); setCvc(''); setHolderName('');
              setPaymentMethod('card'); setCardEntryMode('standard');
              setValidationErrors({}); setResponseMessage(null); setVgsToken('');
            }}
          >
            <RotateCcw className="h-4 w-4" />
            Reset
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <form onSubmit={handleSubmit} className="lg:col-span-2 space-y-5 rounded-xl border border-border bg-card p-6 shadow-card">
          {/* Response Banner */}
          {responseMessage && (
            <div className={`flex items-start gap-3 rounded-lg border p-4 ${
              responseMessage.type === 'success' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' :
              responseMessage.type === 'warning' ? 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400' :
              'border-destructive/30 bg-destructive/10 text-destructive'
            }`}>
              {responseMessage.type === 'success' ? <CheckCircle2 className="h-5 w-5 mt-0.5 shrink-0" /> :
               responseMessage.type === 'warning' ? <AlertTriangle className="h-5 w-5 mt-0.5 shrink-0" /> :
               <XCircle className="h-5 w-5 mt-0.5 shrink-0" />}
              <div>
                <p className="font-medium text-sm">{responseMessage.title}</p>
                <p className="text-xs mt-0.5 opacity-90">{responseMessage.detail}</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Amount</Label>
              <Input
                type="number" placeholder="0.00" value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className={`bg-background border-border font-mono text-lg ${validationErrors.amount ? 'border-destructive' : ''}`}
                required min="0.01" step="0.01"
              />
              {validationErrors.amount && <p className="text-xs text-destructive">{validationErrors.amount}</p>}
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
                <SelectItem value="card">💳 Card</SelectItem>
                <SelectItem value="pix">🇧🇷 PIX</SelectItem>
                <SelectItem value="boleto">📄 Boleto</SelectItem>
                <SelectItem value="apple_pay">
                  <span className="inline-flex items-center gap-2">
                    <img src="/logos/apple-pay.svg" alt="Apple Pay" className="h-4 w-auto" />
                    Apple Pay
                  </span>
                </SelectItem>
                <SelectItem value="open_banking">🏦 Open Banking</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Payment Method Tabs */}
          <Tabs value={paymentMethod} onValueChange={(v: any) => setPaymentMethod(v)} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="card">💳 Card</TabsTrigger>
              <TabsTrigger value="open_banking">🏦 Open Banking</TabsTrigger>
              <TabsTrigger value="apple_pay" className="gap-1.5">
                <img src="/logos/apple-pay.svg" alt="" className="h-4 w-auto" />
                Apple Pay
              </TabsTrigger>
              <TabsTrigger value="pix">🇧🇷 PIX</TabsTrigger>
            </TabsList>

            <TabsContent value="card" className="mt-4">
              <Tabs value={cardEntryMode} onValueChange={(v: any) => setCardEntryMode(v)} className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="standard">One Time Payment</TabsTrigger>
                  <TabsTrigger value="vgs">Recurring Payment</TabsTrigger>
                </TabsList>

              <TabsContent value="standard" className="space-y-3 p-4 rounded-lg border border-border bg-muted/30">
                  <div className="space-y-2">
                    <Label>Cardholder Name</Label>
                    <Input
                      type="text" placeholder="John Doe" value={holderName}
                      onChange={(e) => setHolderName(e.target.value)}
                      className={`bg-background border-border ${validationErrors.holderName ? 'border-destructive' : ''}`}
                    />
                    {validationErrors.holderName && <p className="text-xs text-destructive">{validationErrors.holderName}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>Card Number</Label>
                    <Input
                      type="text" placeholder="4242 4242 4242 4242" value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      className={`bg-background border-border font-mono ${validationErrors.cardNumber ? 'border-destructive' : ''}`} maxLength={19}
                    />
                    {validationErrors.cardNumber && <p className="text-xs text-destructive">{validationErrors.cardNumber}</p>}
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-2">
                      <Label>Exp Month</Label>
                      <Input type="text" placeholder="12" value={expMonth} onChange={(e) => setExpMonth(e.target.value)} className={`bg-background border-border ${validationErrors.expMonth ? 'border-destructive' : ''}`} maxLength={2} />
                      {validationErrors.expMonth && <p className="text-xs text-destructive">{validationErrors.expMonth}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label>Exp Year</Label>
                      <Input type="text" placeholder="2025" value={expYear} onChange={(e) => setExpYear(e.target.value)} className={`bg-background border-border ${validationErrors.expYear ? 'border-destructive' : ''}`} maxLength={4} />
                      {validationErrors.expYear && <p className="text-xs text-destructive">{validationErrors.expYear}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label>CVC</Label>
                      <Input type="text" placeholder="123" value={cvc} onChange={(e) => setCvc(e.target.value)} className={`bg-background border-border ${validationErrors.cvc ? 'border-destructive' : ''}`} maxLength={4} />
                      {validationErrors.cvc && <p className="text-xs text-destructive">{validationErrors.cvc}</p>}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="vgs" className="mt-4">
                  <VGSCardForm onTokenReceived={setVgsToken} isSubmitting={isSubmitting} />
                </TabsContent>
              </Tabs>
            </TabsContent>

            <TabsContent value="open_banking" className="mt-4 space-y-4 p-4 rounded-lg border border-border bg-muted/30">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Globe className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-medium text-foreground">Open Banking Payment</h4>
                  <p className="text-xs text-muted-foreground">Pay directly from your bank account</p>
                </div>
              </div>
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Select your bank to initiate a secure bank transfer. You'll be redirected to your bank's authentication page.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <Badge variant="outline" className="justify-center py-2">🇬🇧 UK Banks</Badge>
                  <Badge variant="outline" className="justify-center py-2">🇪🇺 EU Banks</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Supported via Openbanking EU. Instant settlement for EUR/GBP.
                </p>
              </div>
            </TabsContent>

            <TabsContent value="apple_pay" className="mt-4 space-y-4 p-4 rounded-lg border border-border bg-muted/30">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-foreground flex items-center justify-center p-1.5">
                  <img src="/logos/apple-pay.svg" alt="Apple Pay" className="h-full w-auto invert" />
                </div>
                <div>
                  <h4 className="font-medium text-foreground">Apple Pay</h4>
                  <p className="text-xs text-muted-foreground">Fast checkout with Face ID or Touch ID</p>
                </div>
              </div>
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Use Apple Pay for a quick and secure checkout. Your card details are never shared.
                </p>
                <div className="bg-foreground text-background rounded-lg py-3 text-center font-medium cursor-pointer hover:opacity-90 transition-opacity">
                   Pay with Apple Pay
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  Available on Safari and iOS devices
                </p>
              </div>
            </TabsContent>

            <TabsContent value="pix" className="mt-4 space-y-4 p-4 rounded-lg border border-border bg-muted/30">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-[#32BCAD]/10 flex items-center justify-center">
                  <span className="text-lg">🇧🇷</span>
                </div>
                <div>
                  <h4 className="font-medium text-foreground">PIX Instant Payment</h4>
                  <p className="text-xs text-muted-foreground">Brazil's instant payment system</p>
                </div>
              </div>
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Scan the QR code with your banking app to complete the payment instantly.
                </p>
                <div className="flex justify-center py-4">
                  <div className="h-32 w-32 bg-muted rounded-lg flex items-center justify-center border border-border">
                    <span className="text-xs text-muted-foreground">QR Code</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  Available for BRL transactions only
                </p>
              </div>
            </TabsContent>
          </Tabs>

          <div className="space-y-2">
            <Label>Customer Email</Label>
            <Input
              type="email" placeholder="customer@example.com" value={email}
              onChange={(e) => setEmail(e.target.value)} className={`bg-background border-border ${validationErrors.email ? 'border-destructive' : ''}`}
            />
            {validationErrors.email && <p className="text-xs text-destructive">{validationErrors.email}</p>}
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              placeholder="Payment description..." value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="bg-background border-border resize-none" rows={3}
            />
          </div>

          <Button type="submit" className="w-full gap-2" size="lg" disabled={isSubmitting}>
            {isSubmitting ? (
              <><Loader2 className="h-4 w-4 animate-spin" />Processing...</>
            ) : (
              <><CreditCard className="h-4 w-4" />Create Payment<ArrowRight className="h-4 w-4" /></>
            )}
          </Button>
        </form>

        <div className="space-y-4">
          {/* Region Detection */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-card">
            <div className="flex items-center gap-2 mb-3">
              <MapPin className="h-4 w-4 text-primary" />
              <h3 className="font-heading text-sm font-semibold text-foreground">Region Detected</h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg">{detectedRegion.flag}</span>
              <div>
                <p className="text-sm font-medium text-foreground">{detectedRegion.label}</p>
                <p className="text-xs text-muted-foreground">Default currency: {defaultCurrency}</p>
              </div>
            </div>
          </div>

          {/* Routing Preview */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-card">
            <h3 className="font-heading text-sm font-semibold text-foreground mb-3">Routing Preview</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Provider</span>
                <Badge variant="provider">{selectedProvider}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Route</span>
                <span className="text-xs text-muted-foreground">{providerInfo.label}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Currency</span>
                <span className="text-sm font-medium text-foreground">{currency}</span>
              </div>
              {['BRL', 'MXN', 'COP'].includes(currency) && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Settlement</span>
                  <span className="text-sm text-foreground">USD (auto-convert)</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Vault</span>
                <Badge variant="outline" className="text-xs">Parallel</Badge>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ThreeDSecureModal
        open={show3DS}
        onClose={() => setShow3DS(false)}
        redirectUrl={threeDSUrl}
        transactionId={threeDSTxId}
        onComplete={() => {
          setResponseMessage({
            type: 'success',
            title: '3DS Authentication Complete',
            detail: 'Payment has been verified and is being processed.',
          });
          queryClient.invalidateQueries({ queryKey: ['transactions'] });
          setAmount(''); setEmail(''); setDescription('');
          setCardNumber(''); setExpMonth(''); setExpYear(''); setCvc(''); setHolderName('');
        }}
      />
    </AppLayout>
  );
}
