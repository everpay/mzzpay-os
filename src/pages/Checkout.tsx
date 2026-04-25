import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CreditCard, ArrowRight, Loader2, Shield, Lock, CheckCircle, Globe, Building2, Bitcoin, AlertTriangle, RefreshCw, HelpCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

import { supabase } from '@/integrations/supabase/client';
import { ThreeDSecureModal } from '@/components/ThreeDSecureModal';
import { CryptoPaymentPanel } from '@/components/CryptoPaymentPanel';
import { CountrySelect } from '@/components/CountrySelect';
import { validateCheckoutParams } from '@/lib/checkout-params';
import { notifyError } from '@/lib/error-toast';

const DOMAIN = 'mzzpay.io';

export default function Checkout() {
  const [searchParams] = useSearchParams();

  // Validate + normalize all incoming query parameters in one place. Any error
  // is surfaced via a banner above the form so the merchant/customer knows
  // why checkout cannot proceed instead of seeing a silently-broken page.
  const validation = validateCheckoutParams(searchParams);
  const {
    amount, currency, description, email, name, ref, orderId,
    method, merchantId, successUrl, cancelUrl,
  } = validation.values;
  const blockingIssues = validation.issues.filter((i) => i.severity === 'error');
  const warningIssues = validation.issues.filter((i) => i.severity === 'warn');
  const checkoutBlocked = blockingIssues.length > 0;

  const [customAmount, setCustomAmount] = useState(amount);
  const [customerEmail, setCustomerEmail] = useState(email);
  const [customerName, setCustomerName] = useState(name);
  const [customerPhone, setCustomerPhone] = useState('');
  const [billingAddress, setBillingAddress] = useState('');
  const [billingCity, setBillingCity] = useState('');
  const [billingState, setBillingState] = useState('');
  const [billingZip, setBillingZip] = useState('');
  const [billingCountry, setBillingCountry] = useState('US');
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'openbanking' | 'crypto'>(
    method === 'openbanking' ? 'openbanking' : method === 'crypto' ? 'crypto' : 'card'
  );
  const [cardNumber, setCardNumber] = useState('');
  const [expMonth, setExpMonth] = useState('');
  const [expYear, setExpYear] = useState('');
  const [cvc, setCvc] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentComplete, setPaymentComplete] = useState(false);

  // 3DS state
  const [show3DS, setShow3DS] = useState(false);
  const [threeDSUrl, setThreeDSUrl] = useState('');
  const [threeDSTxId, setThreeDSTxId] = useState('');

  // Retry / processor-error UI state
  const [retryCount, setRetryCount] = useState(0);
  const [lastFailedProvider, setLastFailedProvider] = useState('');
  const [lastProcessorError, setLastProcessorError] = useState('');
  const [showRetryPanel, setShowRetryPanel] = useState(false);
  // Matrix credential-format banner (code 3 = invalid public/secret key format)
  const [matrixCredIssue, setMatrixCredIssue] = useState<{
    field: string;
    expected: string;
    actual: string;
    raw: string;
  } | null>(null);
  const [matrixHelpOpen, setMatrixHelpOpen] = useState(false);
  const [matrixRetrying, setMatrixRetrying] = useState(false);
  // Stable idempotency key for the lifetime of this checkout session.
  // Reusing the same key on retry guarantees the processor (and our DB) treats
  // attempts as the SAME logical payment instead of new ones. We always
  // generate a UUID v4 client-side so that even links without a `ref` get a
  // collision-resistant key.
  const [idempotencyKey] = useState(
    () => `chk_${ref ? `${ref}_` : ''}${crypto.randomUUID()}`
  );

  const displayAmount = amount || customAmount;

  const formatCardNumber = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    const groups = cleaned.match(/.{1,4}/g);
    return groups ? groups.join(' ') : cleaned;
  };

  const redirectToOutcome = (outcome: 'success' | 'failed', transactionId?: string) => {
    const target = outcome === 'success' ? successUrl : cancelUrl;
    if (!target) return;
    const url = new URL(target, window.location.origin);
    if (transactionId) url.searchParams.set('TRANSACTION_ID', transactionId);
    if (ref) url.searchParams.set('PARTNER_SESSION_ID', ref);
    setTimeout(() => { window.location.href = url.toString(); }, 1500);
  };

  const handleSubmit = async (e?: React.FormEvent, opts?: { isRetry?: boolean }) => {
    e?.preventDefault();
    if (checkoutBlocked) {
      notifyError('This checkout link is incomplete', {
        description: blockingIssues.map((i) => i.message).join(' '),
      });
      return;
    }
    if (paymentMethod === 'crypto') return; // handled by CryptoPaymentPanel
    setIsSubmitting(true);
    setMatrixCredIssue(null);
    try {
      const payload: any = {
        amount: parseFloat(displayAmount),
        currency,
        paymentMethod,
        customerEmail,
        description: description || `Payment ${ref}`,
        // Stable idempotency key — same key on first attempt AND retries.
        idempotencyKey,
        retry: !!opts?.isRetry,
        merchantId,
        orderId,
        successUrl: successUrl || undefined,
        cancelUrl: cancelUrl || undefined,
        customer: {
          first: customerName.split(' ')[0] || '',
          last: customerName.split(' ').slice(1).join(' ') || '',
          phone: customerPhone,
        },
        billing: {
          address: billingAddress,
          city: billingCity,
          state: billingState,
          postal_code: billingZip,
          country: billingCountry,
        },
      };

      if (paymentMethod === 'card' && cardNumber) {
        payload.cardDetails = {
          number: cardNumber.replace(/\s/g, ''),
          expMonth, expYear, cvc,
          holderName: customerName,
        };
      }

      const { data, error } = await supabase.functions.invoke('process-payment', { body: payload });
      if (error) throw error;

      // Strict server-side payload validation rejected the request before any
      // processor call. Surface the field-level details so the merchant knows
      // exactly what to fix.
      if (data?.error_code === 'processor_validation_error' || data?.code === 'processor_validation_error') {
        const fieldErrors = data?.validation?.fieldErrors ?? {};
        const detail = Object.entries(fieldErrors)
          .map(([k, v]) => `${k}: ${(v as string[]).join(', ')}`)
          .join('\n');
        notifyError(
          { code: 'processor_validation_error', message: data.error },
          { description: detail || data.error },
        );
        return;
      }

      // Idempotency replay — backend recognized this key from a previous
      // request and returned the cached response instead of charging twice.
      // Treat as success but inform the customer.
      if (data?.duplicate || data?.idempotency_replayed || data?.error_code === 'idempotency_conflict') {
        notifyError(
          { code: 'idempotency_conflict', message: 'Duplicate request' },
          {
            description:
              'This payment was already processed. We returned the original result instead of charging twice.',
          },
        );
        if (data?.transaction?.status === 'completed') {
          setPaymentComplete(true);
          redirectToOutcome('success', data.transaction?.id || '');
        }
        return;
      }

      // Processor not configured — surface the real reason instead of a decline.
      if (data?.processorMisconfigured || data?.error_code === 'processor_misconfigured') {
        notifyError(
          { code: 'processor_misconfigured', message: data.error },
          { description: data.error },
        );
        return;
      }

      // Matrix credential-format issue. Matrix returns either:
      //   { code: 3, reason: "Invalid public_key format", details: { field: "public_key", expected_length: 35, actual_length: 32 } }
      // or a flatter shape with `field` / `param` and a free-form `reason`.
      // Parse defensively so we always know which key is wrong + expected length.
      const provResp0 = data?.providerResponse || {};
      const matrixCode = provResp0?.code ?? data?.code;
      const matrixReason: string =
        provResp0?.reason || provResp0?.message || data?.error || '';
      const matrixDetails = provResp0?.details || provResp0?.error?.details || {};
      const matrixField: string =
        matrixDetails?.field || matrixDetails?.param || provResp0?.field || '';
      const isMatrixCredErr =
        (data?.transaction?.provider === 'matrix' || provResp0?.provider === 'matrix' ||
          /matrix/i.test(String(matrixReason))) &&
        (matrixCode === 3 || matrixCode === '3' ||
          /invalid (public|secret)[_ ]?key|key.*format|must be \d+ characters/i.test(matrixReason));
      if (isMatrixCredErr) {
        // Prefer structured `field` from details; fall back to keyword match in reason.
        const fieldLc = String(matrixField || matrixReason).toLowerCase();
        const isSecret = /secret/.test(fieldLc);
        const isPublic = /public/.test(fieldLc) || !isSecret;
        const expectedLen: number =
          Number(matrixDetails?.expected_length) ||
          Number((matrixReason.match(/must be (\d+) characters/i) || [])[1]) ||
          35;
        const actualLen: number | undefined =
          Number(matrixDetails?.actual_length) || undefined;
        setMatrixCredIssue({
          field: isSecret ? 'MATRIX_SECRET_KEY' : 'MATRIX_PUBLIC_KEY',
          expected: `Exactly ${expectedLen} characters — sandbox ${isSecret ? 'secret' : 'public'} key from Matrix dashboard`,
          actual: actualLen ? `${actualLen} characters provided` : 'Malformed or missing key',
          raw: matrixReason || `Matrix code ${matrixCode}`,
        });
        notifyError('Matrix credential format issue', {
          description: `Update ${isSecret ? 'MATRIX_SECRET_KEY' : 'MATRIX_PUBLIC_KEY'} in your processor settings to continue.`,
        });
        return;
      }

      // 3DS redirect
      const provResp = data?.providerResponse || {};
      const threeDsRedirect = provResp['3d_secure_redirect_url'] || provResp.redirect_url;
      if (provResp.transaction_status === 'INITIATED' && threeDsRedirect) {
        setThreeDSUrl(threeDsRedirect);
        setThreeDSTxId(data.transaction?.id || '');
        setShow3DS(true);
        return;
      }

      // Processor decline — surface raw provider message
      const isFailed =
        provResp.status === 'Failed' ||
        provResp.transaction_status === 'FAILED' ||
        data?.transaction?.status === 'failed' ||
        !data?.success;

      if (isFailed) {
        const procMsg =
          provResp?.error?.message ||
          provResp?.gateway_message ||
          provResp?.message ||
          data?.error ||
          'Payment declined';
        const procCode = provResp?.error?.code || provResp?.code || '';

        setRetryCount((c) => c + 1);
        setLastFailedProvider(data?.transaction?.provider || provResp?.provider || '');
        setLastProcessorError(procCode ? `${procMsg} [${procCode}]` : procMsg);

        if (retryCount < 2) {
          notifyError(procCode ? `${procMsg} [${procCode}]` : procMsg, {
            description: 'Try again or use a different payment method.',
          });
          setShowRetryPanel(true);
        } else {
          notifyError('Payment declined after multiple attempts');
          redirectToOutcome('failed', data?.transaction?.id);
        }
        return;
      }

      // Receipt email (best-effort). Only fired for completed payments so the
      // template's "Save as PDF" / "Copy link" buttons always have valid
      // receipt + PDF URLs to point at. We import the URL builder lazily so a
      // future move to a tenant-specific receipt domain only touches one file.
      const txStatus = data?.transaction?.status;
      const isCompleted =
        txStatus === 'completed' || (data?.success === true && txStatus !== 'failed');
      if (customerEmail && data.transaction && isCompleted) {
        try {
          const { buildReceiptUrls } = await import('@/lib/receipt-urls');
          const { receiptUrl, pdfUrl } = buildReceiptUrls(data.transaction.id);
          await supabase.functions.invoke('send-transactional-email', {
            body: {
              templateName: 'payment-confirmation',
              recipientEmail: customerEmail,
              idempotencyKey: `payment-confirmation-${data.transaction.id}`,
              templateData: {
                amount: parseFloat(displayAmount).toFixed(2),
                currency,
                transactionId: data.transaction.id,
                orderId: orderId || undefined,
                type: paymentMethod === 'openbanking' ? 'Open Banking' : 'Card payment',
                date: new Date().toISOString().replace('T', ' ').slice(0, 19),
                status: 'Approved',
                method: paymentMethod === 'openbanking' ? 'Open Banking' : 'Card',
                description: description || `Payment ${ref}`,
                receiptUrl,
                pdfUrl,
              },
            },
          });
        } catch (emailError) {
          console.error('Failed to send receipt:', emailError);
        }
      }

      setPaymentComplete(true);
      redirectToOutcome('success', data.transaction?.id || '');
    } catch (error) {
      console.error('Payment error:', error);
      notifyError('Payment failed', {
        description: error instanceof Error ? error.message : 'Please try again',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (paymentComplete) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center space-y-6">
          <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <CheckCircle className="h-10 w-10 text-primary" />
          </div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Payment Successful</h1>
          <p className="text-muted-foreground">
            Your payment of{' '}
            <span className="font-semibold text-foreground">
              {new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(parseFloat(displayAmount))}
            </span>{' '}
            has been processed.
          </p>
          {ref && (
            <p className="text-sm text-muted-foreground">Reference: <span className="font-mono">{ref}</span></p>
          )}
          {successUrl
            ? <p className="text-sm text-muted-foreground">Redirecting you back...</p>
            : <p className="text-sm text-muted-foreground">You can close this window.</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="h-8 w-8 rounded-lg gradient-primary flex items-center justify-center">
              <CreditCard className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-heading text-lg font-bold text-foreground">MZZPay</span>
          </div>
          {displayAmount && (
            <p className="text-4xl font-bold text-foreground">
              {new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(parseFloat(displayAmount))}
            </p>
          )}
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>

        {/* Validation banner — shown when the inbound payment-link query string
            is incomplete or malformed. We deliberately show this BEFORE the
            form so a customer never enters card data into a broken link. */}
        {checkoutBlocked && (
          <div
            data-testid="checkout-error-banner"
            role="alert"
            className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive"
          >
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <div className="space-y-1">
                <p className="font-semibold">This payment link is incomplete</p>
                <ul className="list-disc pl-5 space-y-0.5 text-destructive/90">
                  {blockingIssues.map((i) => (
                    <li key={`${i.field}-${i.message}`}>
                      <span className="font-mono text-xs">{i.field}</span>: {i.message}
                    </li>
                  ))}
                </ul>
                <p className="text-destructive/80 pt-1">
                  Please contact the merchant for an updated link.
                </p>
              </div>
            </div>
          </div>
        )}

        {!checkoutBlocked && warningIssues.length > 0 && (
          <div
            data-testid="checkout-warning-banner"
            role="status"
            className="rounded-xl border border-warning/40 bg-warning/5 p-3 text-xs text-warning-foreground"
          >
            <p className="font-medium mb-1">Heads up</p>
            <ul className="list-disc pl-5 space-y-0.5">
              {warningIssues.map((i) => (
                <li key={`${i.field}-${i.message}`}>{i.message}</li>
              ))}
            </ul>
          </div>
        )}

        {matrixCredIssue && (
          <div
            data-testid="matrix-credential-banner"
            role="alert"
            className="rounded-xl border border-warning/50 bg-warning/10 p-4 text-sm"
          >
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0 text-warning" />
              <div className="space-y-2 flex-1">
                <p className="font-semibold text-foreground">Matrix credential format issue</p>
                <p className="text-muted-foreground">
                  The Matrix processor rejected the request because{' '}
                  <span className="font-mono text-xs px-1 py-0.5 rounded bg-muted">{matrixCredIssue.field}</span>{' '}
                  is not in the expected format.
                </p>
                <ul className="list-disc pl-5 space-y-0.5 text-xs text-muted-foreground">
                  <li><span className="font-medium">Expected:</span> {matrixCredIssue.expected}</li>
                  <li><span className="font-medium">Detected:</span> {matrixCredIssue.actual}</li>
                </ul>
                <p className="text-xs text-muted-foreground pt-1">
                  Fix: open your Matrix dashboard, copy a fresh sandbox key, and update it in
                  Admin → Processors → Matrix. Then retry this payment.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Payment Form */}
        <form onSubmit={handleSubmit} className="rounded-xl border border-border bg-card p-6 shadow-card space-y-5">
          {/* Customer Info */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-xs">Full Name</Label>
              <Input placeholder="John Doe" value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="bg-background border-border" disabled={!!name} required />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Email</Label>
              <Input type="email" placeholder="john@example.com" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} className="bg-background border-border" disabled={!!email} required />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Phone Number</Label>
            <Input type="tel" placeholder="+1 (555) 000-0000" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} className="bg-background border-border" required />
          </div>

          {/* Billing Address */}
          <div className="space-y-3">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Billing Address</Label>
            <Input placeholder="Street address" value={billingAddress} onChange={(e) => setBillingAddress(e.target.value)} className="bg-background border-border" required />
            <div className="grid grid-cols-2 gap-3">
              <Input placeholder="City" value={billingCity} onChange={(e) => setBillingCity(e.target.value)} className="bg-background border-border" required />
              <Input placeholder="State / Province" value={billingState} onChange={(e) => setBillingState(e.target.value)} className="bg-background border-border" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Zip / Postal code</Label>
                <Input placeholder="ZIP" value={billingZip} onChange={(e) => setBillingZip(e.target.value)} className="bg-background border-border" required />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Country</Label>
                <CountrySelect value={billingCountry} onValueChange={setBillingCountry} />
              </div>
            </div>
          </div>

          {!amount && (
            <div className="space-y-2">
              <Label className="text-xs">Amount ({currency})</Label>
              <Input type="number" placeholder="0.00" value={customAmount} onChange={(e) => setCustomAmount(e.target.value)} className="bg-background border-border font-mono text-lg" min="0.01" step="0.01" required />
            </div>
          )}

          {/* Payment Method Tabs */}
          {method === 'all' ? (
            <Tabs value={paymentMethod} onValueChange={(v: any) => setPaymentMethod(v)} className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="card" className="gap-2"><CreditCard className="h-3.5 w-3.5" /> Card</TabsTrigger>
                <TabsTrigger value="openbanking" className="gap-2"><Building2 className="h-3.5 w-3.5" /> Bank</TabsTrigger>
                <TabsTrigger value="crypto" className="gap-2"><Bitcoin className="h-3.5 w-3.5" /> Crypto</TabsTrigger>
              </TabsList>

              <TabsContent value="card" className="mt-4">
                <CardFields
                  cardNumber={cardNumber} setCardNumber={setCardNumber}
                  expMonth={expMonth} setExpMonth={setExpMonth}
                  expYear={expYear} setExpYear={setExpYear}
                  cvc={cvc} setCvc={setCvc}
                  formatCardNumber={formatCardNumber}
                />
              </TabsContent>

              <TabsContent value="openbanking" className="mt-4">
                <OpenBankingSection currency={currency} />
              </TabsContent>

              <TabsContent value="crypto" className="mt-4">
                <CryptoPaymentPanel
                  amount={parseFloat(displayAmount) || 0}
                  currency={currency}
                  description={description}
                  reference={ref}
                  merchantId={merchantId}
                  onComplete={() => setPaymentComplete(true)}
                />
              </TabsContent>
            </Tabs>
          ) : method === 'openbanking' ? (
            <OpenBankingSection currency={currency} />
          ) : method === 'crypto' ? (
            <CryptoPaymentPanel
              amount={parseFloat(displayAmount) || 0}
              currency={currency}
              description={description}
              reference={ref}
              merchantId={merchantId}
              onComplete={() => setPaymentComplete(true)}
            />
          ) : (
            <CardFields
              cardNumber={cardNumber} setCardNumber={setCardNumber}
              expMonth={expMonth} setExpMonth={setExpMonth}
              expYear={expYear} setExpYear={setExpYear}
              cvc={cvc} setCvc={setCvc}
              formatCardNumber={formatCardNumber}
            />
          )}

          {paymentMethod !== 'crypto' && (
            <Button type="submit" className="w-full gap-2" size="lg" disabled={isSubmitting}>
              {isSubmitting ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Processing...</>
              ) : (
                <>
                  Pay {displayAmount ? new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(parseFloat(displayAmount)) : ''}
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          )}

          <div className="flex items-center justify-center gap-4 pt-2 border-t border-border">
            <div className="flex items-center gap-1 text-xs text-muted-foreground"><Lock className="h-3 w-3" /> SSL Encrypted</div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground"><Shield className="h-3 w-3" /> PCI Compliant</div>
          </div>
        </form>

        <div className="text-center space-y-1">
          <p className="text-xs text-muted-foreground">
            Secured by <span className="font-medium text-foreground">MZZPay</span> · {DOMAIN}
          </p>
          {ref && <p className="text-[10px] font-mono text-muted-foreground">Ref: {ref}</p>}
          {cancelUrl && <a href={cancelUrl} className="text-xs text-primary hover:underline">Cancel and return</a>}
        </div>
      </div>

      {/* Processor-error retry overlay */}
      {showRetryPanel && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl space-y-5">
            <div className="mx-auto h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>
            <h2 className="text-xl font-bold text-foreground text-center">Payment Failed</h2>
            <p className="text-sm text-muted-foreground text-center">
              {lastProcessorError || `Your payment couldn't be processed${lastFailedProvider ? ` via ${lastFailedProvider}` : ''}.`}
            </p>
            <div className="space-y-3">
              <Button className="w-full gap-2" onClick={() => { setShowRetryPanel(false); handleSubmit(undefined, { isRetry: true }); }}>
                <RefreshCw className="h-4 w-4" /> Retry Payment (same idempotency key)
              </Button>
              <Button
                variant="outline" className="w-full gap-2"
                onClick={() => {
                  setShowRetryPanel(false);
                  setPaymentMethod(paymentMethod === 'card' ? 'openbanking' : 'card');
                }}
              >
                <Building2 className="h-4 w-4" /> Try {paymentMethod === 'card' ? 'Bank Transfer' : 'Card'} Instead
              </Button>
              {cancelUrl && (
                <Button variant="ghost" className="w-full text-muted-foreground" asChild>
                  <a href={cancelUrl}>Cancel and return</a>
                </Button>
              )}
            </div>
            <div className="space-y-1 text-center">
              <p className="text-xs text-muted-foreground">
                Attempt {retryCount} of 3 · Secured by MZZPay
              </p>
              <p className="text-[10px] font-mono text-muted-foreground/70 break-all">
                key: {idempotencyKey}
              </p>
            </div>
          </div>
        </div>
      )}

      <ThreeDSecureModal
        open={show3DS}
        onClose={() => setShow3DS(false)}
        redirectUrl={threeDSUrl}
        transactionId={threeDSTxId}
        onComplete={() => {
          setPaymentComplete(true);
          redirectToOutcome('success', threeDSTxId);
        }}
      />
    </div>
  );
}

function CardFields({
  cardNumber, setCardNumber, expMonth, setExpMonth, expYear, setExpYear, cvc, setCvc, formatCardNumber,
}: {
  cardNumber: string; setCardNumber: (v: string) => void;
  expMonth: string; setExpMonth: (v: string) => void;
  expYear: string; setExpYear: (v: string) => void;
  cvc: string; setCvc: (v: string) => void;
  formatCardNumber: (v: string) => string;
}) {
  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label className="text-xs">Card Number</Label>
        <Input
          type="text" placeholder="4242 4242 4242 4242"
          value={formatCardNumber(cardNumber)}
          onChange={(e) => setCardNumber(e.target.value.replace(/\s/g, ''))}
          className="bg-background border-border font-mono"
          maxLength={19} required
        />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-2">
          <Label className="text-xs">Month</Label>
          <Input type="text" placeholder="12" value={expMonth} onChange={(e) => setExpMonth(e.target.value)} className="bg-background border-border" maxLength={2} required />
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Year</Label>
          <Input type="text" placeholder="2026" value={expYear} onChange={(e) => setExpYear(e.target.value)} className="bg-background border-border" maxLength={4} required />
        </div>
        <div className="space-y-2">
          <Label className="text-xs">CVC</Label>
          <Input type="text" placeholder="123" value={cvc} onChange={(e) => setCvc(e.target.value)} className="bg-background border-border" maxLength={4} required />
        </div>
      </div>
    </div>
  );
}

function OpenBankingSection({ currency }: { currency: string }) {
  const banks = ['EUR', 'GBP'].includes(currency)
    ? [{ name: 'Revolut' }, { name: 'Monzo' }, { name: 'Barclays' }, { name: 'HSBC' }, { name: 'Deutsche Bank' }, { name: 'ING' }]
    : [{ name: 'Chase' }, { name: 'Bank of America' }, { name: 'Wells Fargo' }, { name: 'Citi' }];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Globe className="h-4 w-4 text-primary" />
        <p className="text-sm font-medium text-foreground">Select your bank</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {banks.map((bank) => (
          <button
            key={bank.name}
            type="button"
            className="flex items-center gap-2 rounded-lg border border-border bg-background p-3 text-sm text-foreground hover:border-primary hover:bg-primary/5 transition-colors text-left"
          >
            <Building2 className="h-4 w-4 text-primary" />
            <span>{bank.name}</span>
          </button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        You'll be redirected to your bank to authorize the payment securely.
      </p>
    </div>
  );
}
