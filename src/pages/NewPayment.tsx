import { useState, useRef } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Currency } from '@/lib/types';
import { resolveProvider } from '@/lib/providers';
import { Badge } from '@/components/ui/badge';
import { CountrySelect } from '@/components/CountrySelect';
import { StateRegionSelect } from '@/components/StateRegionSelect';
import { getConfigForCountry } from '@/lib/country-routing';
import { CreditCard, ArrowRight, Loader2, Globe, MapPin } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { SecureCardForm } from '@/components/SecureCardForm';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FormValidationBanner, type FormValidationBannerData } from '@/components/FormValidationBanner';
import { notifyError } from '@/lib/error-toast';

import { usePaymentPolling } from '@/hooks/usePaymentPolling';
import { getThreeDSecureRedirectUrl } from '@/lib/three-d-secure';
import { PaymentResultBanner, type PaymentResultBannerData } from '@/components/PaymentResultBanner';
import { VGSCardForm } from '@/components/VGSCardForm';

type PaymentMethod = 'card' | 'pix' | 'boleto' | 'apple_pay' | 'open_banking' | 'crypto';

function detectRegion(): { region: string; label: string; flag: string } {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const locale = navigator.language || 'en-US';
    if (tz.startsWith('Europe/') || locale.startsWith('en-GB') || locale.startsWith('de') || locale.startsWith('fr') || locale.startsWith('es-ES'))
      return { region: 'EU', label: 'EU Region', flag: '🇪🇺' };
    if (tz.startsWith('America/Sao_Paulo') || tz.startsWith('Brazil') || locale.startsWith('pt-BR'))
      return { region: 'BR', label: 'Brazil', flag: '🇧🇷' };
    if (tz.startsWith('America/Mexico') || locale.startsWith('es-MX'))
      return { region: 'MX', label: 'Mexico', flag: '🇲🇽' };
    if (tz.startsWith('America/Bogota') || locale.startsWith('es-CO'))
      return { region: 'CO', label: 'Colombia', flag: '🇨🇴' };
    return { region: 'US', label: 'US/Global', flag: '🌐' };
  } catch { return { region: 'US', label: 'US/Global', flag: '🌐' }; }
}

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
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card');
  const [cardNumber, setCardNumber] = useState('');
  const [expMonth, setExpMonth] = useState('');
  const [expYear, setExpYear] = useState('');
  const [cvc, setCvc] = useState('');
  const [holderName, setHolderName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [billingAddress, setBillingAddress] = useState('');
  const [billingCity, setBillingCity] = useState('');
  const [billingState, setBillingState] = useState('');
  const [billingPostalCode, setBillingPostalCode] = useState('');
  const [billingCountry, setBillingCountry] = useState('US');
  const selectedCountryConfig = getConfigForCountry(billingCountry);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [vgsToken, setVgsToken] = useState('');
  const [cardEntryMode, setCardEntryMode] = useState<'standard' | 'vgs'>('standard');
  const [resultBanner, setResultBanner] = useState<PaymentResultBannerData | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]> | null>(null);
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const validationBannerData: FormValidationBannerData | null = (fieldErrors || formErrors.length > 0)
    ? { fieldErrors, formErrors }
    : null;
  const [formResetKey, setFormResetKey] = useState(0);
  const idempotencyKeyRef = useRef(`pay_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`);

  const queryClient = useQueryClient();

  const { data: routingCtx } = useQuery({
    queryKey: ['new-payment-routing-context'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { gamblingEnabled: false, rules: [] as any[] };
      const { data: merchant } = await supabase.from('merchants').select('id, gambling_enabled').eq('user_id', user.id).maybeSingle();
      if (!merchant) return { gamblingEnabled: false, rules: [] as any[] };
      const { data: rules } = await (supabase.from as any)('routing_rules')
        .select('id, name, priority, active, currency_match, amount_min, amount_max, target_provider, fallback_provider')
        .eq('merchant_id', merchant.id).eq('active', true).order('priority', { ascending: true });
      return { gamblingEnabled: !!merchant.gambling_enabled, rules: rules ?? [] };
    },
    staleTime: 60_000,
  });

  const selectedProvider = resolveProvider(currency, undefined, {
    paymentMethod,
    gamblingEnabled: routingCtx?.gamblingEnabled,
    amount: amount ? parseFloat(amount) : undefined,
    rules: routingCtx?.rules,
  });

  const idempotencyKey = idempotencyKeyRef.current;

  const { isPolling, currentStatus: pollingStatus, startPolling } = usePaymentPolling({
    transactionId: null,
    enabled: false,
    intervalMs: 2000,
    maxAttempts: 60,
    onComplete: (status) => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      setResultBanner((prev) => prev ? {
        ...prev, tone: 'success', title: 'Charge confirmed',
        description: `Card was charged. Status: ${status}. Ledger updated.`,
      } : prev);
    },
    onFailed: (status) => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      setResultBanner((prev) => prev ? {
        ...prev, tone: 'error', title: 'Charge not completed',
        description: `Card was NOT charged. Final status: ${status}.`,
      } : prev);
    },
  });

  const handlePaymentMethodChange = (value: string) => {
    if (!value) return;
    setPaymentMethod(value as PaymentMethod);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (paymentMethod === 'crypto') return;

    if (paymentMethod === 'card') {
      const digits = (cardNumber || '').replace(/\s/g, '');
      const validStandard = cardEntryMode === 'standard' && digits.length >= 13 && expMonth && expYear && cvc && cvc.length >= 3;
      const validVgs = cardEntryMode === 'vgs' && !!vgsToken;
      if (!validStandard && !validVgs) {
        setResultBanner({ tone: 'error', title: 'Card details required', description: 'Enter a valid card number, expiry (MM/YY) and CVV before submitting.' });
        return;
      }
    }

    setResultBanner(null);
    setFieldErrors(null);
    setFormErrors([]);
    setIsSubmitting(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setResultBanner({ tone: 'error', title: 'Not signed in', description: 'Please sign in to create a payment.' });
        setIsSubmitting(false);
        return;
      }

      const payload: any = {
        amount: parseFloat(amount),
        currency,
        paymentMethod,
        customerEmail: email,
        description,
        idempotencyKey,
        redirectMode: 'modal',
        customer: {
          first: firstName || 'Customer',
          last: lastName || 'User',
          phone: phone || '1234567890',
          ip: '0.0.0.0',
        },
        billing: {
          address: billingAddress || '123 Main St',
          postal_code: billingPostalCode || '12345',
          city: billingCity || 'New York',
          state: billingState || 'NY',
          country: billingCountry || 'US',
        },
      };

      if (paymentMethod === 'card') {
        if (cardEntryMode === 'vgs' && vgsToken) {
          payload.vgsToken = vgsToken;
        } else if (cardNumber) {
          payload.cardDetails = { number: cardNumber.replace(/\s/g, ''), expMonth, expYear, cvc, holderName: holderName || `${firstName} ${lastName}` };
        }
      }

      const { data, error } = await supabase.functions.invoke('process-payment', { body: payload });

      if (error) {
        const errBody = (error as any)?.context?.body || (error as any)?.message || String(error);
        throw new Error(typeof errBody === 'string' ? errBody : JSON.stringify(errBody));
      }

      if (data?.error_code === 'processor_validation_error' || data?.code === 'processor_validation_error') {
        let fErrors: Record<string, string[]> = {};
        const raw = data?.validation?.fieldErrors;
        if (Array.isArray(raw)) {
          for (const e of raw) {
            const k = e?.field ?? 'unknown';
            if (!fErrors[k]) fErrors[k] = [];
            fErrors[k].push(e?.message ?? String(e));
          }
        } else if (raw && typeof raw === 'object') {
          fErrors = raw;
        }
        const fmErrors = Array.isArray(data?.validation?.formErrors) ? data.validation.formErrors : [];
        setFieldErrors(Object.keys(fErrors).length > 0 ? fErrors : null);
        setFormErrors(fmErrors);
        // Only show the inline FormValidationBanner — no redundant toast
        setIsSubmitting(false);
        return;
      }

      if (data && data.success === false && !data.transaction) {
        const detail = data.decline_message || data.error || data.details || 'Payment could not be processed';
        setResultBanner({ tone: 'error', title: 'Payment failed', description: detail });
        setIsSubmitting(false);
        return;
      }

      const txStatus = String(data?.transaction?.status || '').toLowerCase();
      const isTerminal = txStatus === 'completed' || txStatus === 'failed';

      // 2D MID safety: if the edge function already confirmed success, NEVER
      // attempt 3DS detection — the processor approved the charge without an
      // ACS challenge. Any redirect_url in the raw providerResponse is a
      // receipt/status page, not an issuer authentication page.
      const threeDSRedirectUrl = (!isTerminal && !data?.success)
        ? getThreeDSecureRedirectUrl(data?.providerResponse, paymentMethod)
        : null;

      if (threeDSRedirectUrl) {
        // Store context for the /3ds-result callback page, then redirect to issuer OTP
        sessionStorage.setItem('3ds_transaction_id', data.transaction?.id || '');
        sessionStorage.setItem('3ds_return_to', '/payments/new');
        if (data.transaction?.id) startPolling(data.transaction.id);
        window.location.href = threeDSRedirectUrl;
        return;
      }

      // Check for declines FIRST — a failed transaction must show the decline
      // banner immediately, never the "Verifying charge…" spinner + poll.
      if (txStatus === 'failed' || data?.transaction?.status === 'failed') {
        const declineReason = data.decline_message || data.error || data.providerResponse?.error?.message || 'Transaction declined by processor';
        const declineCode = data.decline_code || data.providerResponse?.error?.code || '';
        const is004 = String(declineCode) === '004' || /processor not found/i.test(declineReason);
        const resolvedDescriptor = data.providerResponse?.descriptor || (data.transaction?.processor_raw_response as any)?.descriptor || undefined;
        const resolvedClientId = data.providerResponse?.shieldhub_client_id || undefined;
        setResultBanner(is004
          ? { tone: 'error', title: 'Acquirer configuration error', description: 'ShieldHub rejected — no processor enabled for this merchant. Card NOT charged.', code: '004', txId: data.transaction?.id, descriptor: resolvedDescriptor, clientId: resolvedClientId }
          : { tone: 'error', title: 'Payment declined', description: `${declineReason}${declineCode ? ` (code ${declineCode})` : ''}`, code: declineCode || undefined, txId: data.transaction?.id, descriptor: resolvedDescriptor, clientId: resolvedClientId }
        );
      } else if (data?.success) {
        setFieldErrors(null);
        setFormErrors([]);
        idempotencyKeyRef.current = `pay_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const desc = `${amount} ${currency} via ${selectedProvider} — ${data.transaction.id.slice(0, 8)}. Verifying ledger...`;
        setResultBanner({ tone: 'info', title: 'Verifying charge', description: desc, txId: data.transaction.id });
        if (data.transaction?.id) startPolling(data.transaction.id);
      } else if (data?.transaction?.status === 'pending') {
        if (data.transaction?.id) startPolling(data.transaction.id);
        setResultBanner({ tone: 'info', title: 'Payment processing', description: `Checking status for ${data.transaction.id.slice(0, 8)}...`, txId: data.transaction.id });
      } else {
        setResultBanner({ tone: 'warning', title: 'Payment pending', description: `Status: ${data?.transaction?.status || 'unknown'}`, txId: data?.transaction?.id });
      }

      queryClient.invalidateQueries({ queryKey: ['transactions'] });

      if (data && (data.success || data.transaction)) {
        setAmount(''); setEmail(''); setDescription('');
        setCardNumber(''); setExpMonth(''); setExpYear(''); setCvc('');
        setHolderName(''); setFirstName(''); setLastName(''); setPhone('');
        setBillingAddress(''); setBillingCity(''); setBillingState(''); setBillingPostalCode('');
        setVgsToken('');
        setFormResetKey((k) => k + 1);
        idempotencyKeyRef.current = `pay_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      }
    } catch (error) {
      console.error('Payment error:', error);
      const msg = error instanceof Error ? error.message : 'Unknown error occurred';
      setResultBanner({ tone: 'error', title: 'Payment failed', description: msg });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AppLayout>
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">Create Payment</h1>
        <p className="mt-1 text-sm text-muted-foreground">Route payment through optimal provider</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <form onSubmit={handleSubmit} className="lg:col-span-2 space-y-5 rounded-xl border border-border bg-card p-6 shadow-card">
          {/* Payment result banner (success/error/info) */}
          <PaymentResultBanner banner={resultBanner} onDismiss={() => setResultBanner(null)} />
          {/* Field-level validation errors from the processor */}
          <FormValidationBanner data={validationBannerData} onDismiss={() => { setFieldErrors(null); setFormErrors([]); }} />

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Amount</Label>
              <Input
                type="number" placeholder="0.00" value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="bg-background border-border font-mono text-lg"
                required min="0.01" step="0.01"
              />
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
            <Select value={paymentMethod} onValueChange={handlePaymentMethodChange}>
              <SelectTrigger className="bg-background border-border"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="card">💳 Card</SelectItem>
                <SelectItem value="pix">🇧🇷 PIX</SelectItem>
                <SelectItem value="boleto">📄 Boleto</SelectItem>
                <SelectItem value="apple_pay"><span className="inline-flex items-center gap-1.5"><img src="/logos/apple-pay.svg" alt="" className="h-4 w-auto" /> Apple Pay</span></SelectItem>
                <SelectItem value="open_banking">🏦 Open Banking</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Tabs value={paymentMethod} onValueChange={handlePaymentMethodChange} className="w-full">
            <TabsContent value="card" className="mt-4">
              <SecureCardForm
                showHolderName
                disabled={isSubmitting}
                resetKey={formResetKey}
                onCardData={(data) => {
                  setCardNumber(data.cardNumber);
                  setExpMonth(data.expMonth);
                  setExpYear(data.expYear);
                  setCvc(data.cvc);
                  if (data.holderName) setHolderName(data.holderName);
                }}
              />
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
                <p className="text-sm text-muted-foreground">Select your bank to initiate a secure bank transfer.</p>
                <div className="grid grid-cols-2 gap-2">
                  <Badge variant="outline" className="justify-center py-2">🇬🇧 UK Banks</Badge>
                  <Badge variant="outline" className="justify-center py-2">🇪🇺 EU Banks</Badge>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="apple_pay" className="mt-4 space-y-4 p-4 rounded-lg border border-border bg-muted/30">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-foreground flex items-center justify-center p-1.5">
                  <img src="/logos/apple-pay.svg" alt="Apple Pay" className="h-full w-auto brightness-0 invert" />
                </div>
                <div>
                  <h4 className="font-medium text-foreground">Apple Pay</h4>
                  <p className="text-xs text-muted-foreground">Fast checkout with Face ID or Touch ID</p>
                </div>
              </div>
              <div className="bg-foreground text-background rounded-lg py-3 text-center font-medium cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => document.querySelector<HTMLFormElement>('form')?.requestSubmit()}>
                 Pay with Apple Pay
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
              <p className="text-sm text-muted-foreground">Scan the QR code with your banking app.</p>
            </TabsContent>
          </Tabs>

          {/* Customer Details */}
          <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-4">
            <h4 className="text-sm font-medium text-foreground">Customer Details</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>First Name</Label>
                <Input type="text" placeholder="Joe" value={firstName} onChange={(e) => setFirstName(e.target.value)} className="bg-background border-border" />
              </div>
              <div className="space-y-2">
                <Label>Last Name</Label>
                <Input type="text" placeholder="Doe" value={lastName} onChange={(e) => setLastName(e.target.value)} className="bg-background border-border" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" placeholder="customer@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="bg-background border-border" />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input type="text" placeholder="(702)486-5000" value={phone} onChange={(e) => setPhone(e.target.value)} className="bg-background border-border" />
              </div>
            </div>
          </div>

          {/* Billing Address */}
          <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-4">
            <h4 className="text-sm font-medium text-foreground">Billing Address</h4>
            <div className="space-y-2">
              <Label>Street Address</Label>
              <Input type="text" placeholder="123 Main St" value={billingAddress} onChange={(e) => setBillingAddress(e.target.value)} className="bg-background border-border" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label>City</Label>
                <Input type="text" placeholder="Las Vegas" value={billingCity} onChange={(e) => setBillingCity(e.target.value)} className="bg-background border-border" />
              </div>
              <div className="space-y-2">
                <Label>State / Province / Region</Label>
                <StateRegionSelect countryCode={billingCountry} value={billingState} onValueChange={setBillingState} />
              </div>
              <div className="space-y-2">
                <Label>Zip Code</Label>
                <Input type="text" placeholder="89101" value={billingPostalCode} onChange={(e) => setBillingPostalCode(e.target.value)} className="bg-background border-border" maxLength={10} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Country</Label>
              <CountrySelect value={billingCountry} onValueChange={(v) => { setBillingCountry(v); setBillingState(''); }} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea placeholder="Payment description..." value={description} onChange={(e) => setDescription(e.target.value)} className="bg-background border-border resize-none" rows={3} />
          </div>

          <Button type="submit" className="w-full gap-2" size="lg" disabled={isSubmitting}>
            {isSubmitting ? (
              <><Loader2 className="h-4 w-4 animate-spin" />Processing...</>
            ) : (
              <><CreditCard className="h-4 w-4" />Create Payment<ArrowRight className="h-4 w-4" /></>
            )}
          </Button>
        </form>

        {/* Sidebar */}
        <div className="space-y-4">
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

          <div className="rounded-xl border border-border bg-card p-5 shadow-card">
            <h3 className="font-heading text-sm font-semibold text-foreground mb-3">Routing Preview</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Provider</span>
                <Badge variant="provider">{selectedProvider}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Currency</span>
                <span className="text-sm font-medium text-foreground">{currency}</span>
              </div>
              {selectedCountryConfig && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Country</span>
                  <span className="text-sm text-foreground">{selectedCountryConfig.flag} {selectedCountryConfig.name}</span>
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

    </AppLayout>
  );
}
