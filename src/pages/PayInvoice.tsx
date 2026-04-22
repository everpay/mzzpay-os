import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CreditCard, ArrowRight, Loader2, Shield, Lock, CheckCircle, Globe, Building2, FileText, Download, Bitcoin } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { ThreeDSecureModal } from '@/components/ThreeDSecureModal';
import { formatCurrency } from '@/lib/format';
import { generateInvoicePDF } from '@/lib/invoice-pdf';
import { CryptoPaymentPanel } from '@/components/CryptoPaymentPanel';

export default function PayInvoice() {
  const { invoiceId } = useParams<{ invoiceId: string }>();
  const [invoice, setInvoice] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'openbanking' | 'apple_pay' | 'crypto'>('card');
  const [cardNumber, setCardNumber] = useState('');
  const [expMonth, setExpMonth] = useState('');
  const [expYear, setExpYear] = useState('');
  const [cvc, setCvc] = useState('');
  const [holderName, setHolderName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentComplete, setPaymentComplete] = useState(false);

  // 3DS state
  const [show3DS, setShow3DS] = useState(false);
  const [threeDSUrl, setThreeDSUrl] = useState('');
  const [threeDSTxId, setThreeDSTxId] = useState('');

  useEffect(() => {
    if (!invoiceId) return;
    loadInvoice();
  }, [invoiceId]);

  const loadInvoice = async () => {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('id', invoiceId)
        .single();

      if (error) throw error;
      setInvoice(data);
    } catch (error) {
      console.error('Failed to load invoice:', error);
      toast.error('Invoice not found');
    } finally {
      setLoading(false);
    }
  };

  const formatCardNumber = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    const groups = cleaned.match(/.{1,4}/g);
    return groups ? groups.join(' ') : cleaned;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoice) return;
    setIsSubmitting(true);

    try {
      const payload: any = {
        amount: invoice.amount,
        currency: invoice.currency,
        paymentMethod: paymentMethod === 'openbanking' ? 'open_banking' : paymentMethod,
        customerEmail: invoice.customer_email,
        description: `Invoice ${invoice.invoice_number}`,
        idempotencyKey: `inv_${invoice.id}_${Date.now()}`,
      };

      if (paymentMethod === 'card' && cardNumber) {
        payload.cardDetails = {
          number: cardNumber.replace(/\s/g, ''),
          expMonth,
          expYear,
          cvc,
          holderName: holderName.trim(),
        };
      }

      const { data, error } = await supabase.functions.invoke('process-payment', {
        body: payload,
      });

      if (error) throw error;

      // Check for 3DS redirect
      if (data?.providerResponse?.transaction_status === 'INITIATED' && data?.providerResponse?.['3d_secure_redirect_url']) {
        setThreeDSUrl(data.providerResponse['3d_secure_redirect_url']);
        setThreeDSTxId(data.transaction.id);
        setShow3DS(true);
        return;
      }

      // Check for failure
      if (data?.providerResponse?.status === 'Failed' || data?.providerResponse?.transaction_status === 'FAILED') {
        const msg = data.providerResponse?.error?.message || data.providerResponse?.gateway_message || 'Payment declined';
        toast.error(msg);
        return;
      }

      // Mark invoice as paid
      await supabase.from('invoices').update({
        status: 'paid',
        paid_at: new Date().toISOString(),
        transaction_id: data.transaction.id,
      }).eq('id', invoice.id);

      setPaymentComplete(true);
    } catch (error) {
      console.error('Payment error:', error);
      toast.error(error instanceof Error ? error.message : 'Payment failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handle3DSComplete = async () => {
    if (invoice && threeDSTxId) {
      await supabase.from('invoices').update({
        status: 'paid',
        paid_at: new Date().toISOString(),
        transaction_id: threeDSTxId,
      }).eq('id', invoice.id);
    }
    setPaymentComplete(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-xl font-bold text-foreground mb-2">Invoice Not Found</h1>
          <p className="text-muted-foreground">This invoice may have expired or does not exist.</p>
        </div>
      </div>
    );
  }

  if (invoice.status === 'paid' || paymentComplete) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center space-y-6">
          <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <CheckCircle className="h-10 w-10 text-primary" />
          </div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Payment Successful</h1>
          <p className="text-muted-foreground">
            Your payment of <span className="font-semibold text-foreground">{formatCurrency(invoice.amount, invoice.currency)}</span> for invoice <span className="font-mono">{invoice.invoice_number}</span> has been processed.
          </p>
          <p className="text-sm text-muted-foreground">You can close this window.</p>
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
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <CreditCard className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-heading text-lg font-bold text-foreground">MZZPay</span>
          </div>
          <Badge variant="outline" className="mb-2">{invoice.invoice_number}</Badge>
          <p className="text-4xl font-bold text-foreground">
            {formatCurrency(invoice.amount, invoice.currency)}
          </p>
          {invoice.description && (
            <p className="text-sm text-muted-foreground">{invoice.description}</p>
          )}
          {Array.isArray(invoice.items) && invoice.items.length > 0 && (
            <div className="w-full max-w-xs mx-auto text-left space-y-1 rounded-lg border border-border bg-muted/30 p-3">
              {invoice.items.map((item: any, i: number) => (
                <div key={i} className="flex justify-between text-xs">
                  <span className="text-muted-foreground">{item.description || 'Item'} × {item.quantity || 1}</span>
                  <span className="text-foreground font-medium">{formatCurrency((item.quantity || 1) * (item.unit_price || 0), invoice.currency)}</span>
                </div>
              ))}
            </div>
          )}
          {invoice.due_date && (
            <p className="text-xs text-muted-foreground">
              Due by {new Date(invoice.due_date).toLocaleDateString()}
            </p>
          )}
        </div>

        {/* Payment Form */}
        <form onSubmit={handleSubmit} className="rounded-xl border border-border bg-card p-6 shadow-card space-y-5">
          <Tabs value={paymentMethod} onValueChange={(v: any) => setPaymentMethod(v)} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="card" className="gap-1 text-xs">
                <CreditCard className="h-3.5 w-3.5" /> Card
              </TabsTrigger>
              <TabsTrigger value="openbanking" className="gap-1 text-xs">
                <Building2 className="h-3.5 w-3.5" /> Bank
              </TabsTrigger>
              <TabsTrigger value="apple_pay" className="gap-1 text-xs">
                🍎 Apple Pay
              </TabsTrigger>
              <TabsTrigger value="crypto" className="gap-1 text-xs">
                <Bitcoin className="h-3.5 w-3.5" /> Crypto
              </TabsTrigger>
            </TabsList>

            <TabsContent value="card" className="mt-4 space-y-3">
              <div className="space-y-2">
                <Label className="text-xs">Cardholder Name</Label>
                <Input value={holderName} onChange={(e) => setHolderName(e.target.value)} placeholder="John Doe" className="bg-background border-border" required />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Card Number</Label>
                <Input
                  value={formatCardNumber(cardNumber)}
                  onChange={(e) => setCardNumber(e.target.value.replace(/\s/g, ''))}
                  placeholder="4242 4242 4242 4242"
                  className="bg-background border-border font-mono"
                  maxLength={19}
                  required
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs">Month</Label>
                  <Input value={expMonth} onChange={(e) => setExpMonth(e.target.value)} placeholder="12" className="bg-background border-border" maxLength={2} required />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Year</Label>
                  <Input value={expYear} onChange={(e) => setExpYear(e.target.value)} placeholder="2030" className="bg-background border-border" maxLength={4} required />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">CVC</Label>
                  <Input value={cvc} onChange={(e) => setCvc(e.target.value)} placeholder="123" className="bg-background border-border" maxLength={4} required />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="openbanking" className="mt-4 space-y-3">
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-primary" />
                <p className="text-sm font-medium text-foreground">Select your bank</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {['Revolut', 'Monzo', 'Barclays', 'HSBC'].map((bank) => (
                  <button key={bank} type="button" className="flex items-center gap-2 rounded-lg border border-border bg-background p-3 text-sm text-foreground hover:border-primary hover:bg-primary/5 transition-colors text-left">
                    🏦 {bank}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">You'll be redirected to your bank to authorize payment.</p>
            </TabsContent>

            <TabsContent value="apple_pay" className="mt-4 space-y-3 text-center">
              <div className="bg-foreground text-background rounded-lg py-3 font-medium cursor-pointer hover:opacity-90 transition-opacity">
                 Pay with Apple Pay
              </div>
              <p className="text-xs text-muted-foreground">Available on Safari and iOS devices</p>
            </TabsContent>

            <TabsContent value="crypto" className="mt-4">
              <CryptoPaymentPanel
                amount={Number(invoice.amount)}
                currency={invoice.currency}
                description={`Invoice ${invoice.invoice_number}`}
                reference={invoice.id}
                invoiceId={invoice.id}
                onComplete={async (txId) => {
                  await supabase.from('invoices').update({
                    status: 'paid',
                    paid_at: new Date().toISOString(),
                    transaction_id: txId,
                  }).eq('id', invoice.id);
                  setPaymentComplete(true);
                }}
              />
            </TabsContent>
          </Tabs>

          <Button type="submit" className="w-full gap-2" size="lg" disabled={isSubmitting || paymentMethod === 'crypto'}>
            {isSubmitting ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Processing...</>
            ) : paymentMethod === 'crypto' ? (
              <>Use the crypto panel above</>
            ) : (
              <>Pay {formatCurrency(invoice.amount, invoice.currency)} <ArrowRight className="h-4 w-4" /></>
            )}
          </Button>

          <div className="flex items-center justify-center gap-4 pt-2 border-t border-border">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Lock className="h-3 w-3" /> SSL Encrypted
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Shield className="h-3 w-3" /> PCI Compliant
            </div>
          </div>
        </form>

        {invoice.notes && (
          <div className="rounded-lg border border-border bg-muted/30 p-4">
            <p className="text-xs text-muted-foreground">{invoice.notes}</p>
          </div>
        )}

        <div className="flex justify-center">
          <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={() => generateInvoicePDF(invoice)}>
            <Download className="h-3 w-3" /> Download Invoice PDF
          </Button>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Secured by <span className="font-medium text-foreground">MZZPay</span>
        </p>
      </div>

      <ThreeDSecureModal
        open={show3DS}
        onClose={() => setShow3DS(false)}
        redirectUrl={threeDSUrl}
        transactionId={threeDSTxId}
        onComplete={handle3DSComplete}
      />
    </div>
  );
}
