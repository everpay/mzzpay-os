import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CreditCard, ArrowRight, Loader2, Shield, Lock, CheckCircle, Globe, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

const DOMAIN = 'everpayinc.com';

export default function Checkout() {
  const [searchParams] = useSearchParams();

  const amount = searchParams.get('amount') || '';
  const currency = searchParams.get('currency') || 'USD';
  const description = searchParams.get('description') ? decodeURIComponent(searchParams.get('description')!) : '';
  const email = searchParams.get('email') ? decodeURIComponent(searchParams.get('email')!) : '';
  const name = searchParams.get('name') ? decodeURIComponent(searchParams.get('name')!) : '';
  const ref = searchParams.get('ref') || '';
  const method = searchParams.get('method') || 'all';
  const successUrl = searchParams.get('success_url') ? decodeURIComponent(searchParams.get('success_url')!) : '';
  const cancelUrl = searchParams.get('cancel_url') ? decodeURIComponent(searchParams.get('cancel_url')!) : '';

  const [customAmount, setCustomAmount] = useState(amount);
  const [customerEmail, setCustomerEmail] = useState(email);
  const [customerName, setCustomerName] = useState(name);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'openbanking'>(
    method === 'openbanking' ? 'openbanking' : 'card'
  );
  const [cardNumber, setCardNumber] = useState('');
  const [expMonth, setExpMonth] = useState('');
  const [expYear, setExpYear] = useState('');
  const [cvc, setCvc] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentComplete, setPaymentComplete] = useState(false);

  const displayAmount = amount || customAmount;

  const formatCardNumber = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    const groups = cleaned.match(/.{1,4}/g);
    return groups ? groups.join(' ') : cleaned;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const payload: any = {
        amount: parseFloat(displayAmount),
        currency,
        paymentMethod,
        customerEmail: customerEmail,
        description: description || `Payment ${ref}`,
        idempotencyKey: `link_${ref}_${Date.now()}`,
      };

      if (paymentMethod === 'card' && cardNumber) {
        payload.cardDetails = {
          number: cardNumber.replace(/\s/g, ''),
          expMonth,
          expYear,
          cvc,
        };
      }

      const { data, error } = await supabase.functions.invoke('process-payment', {
        body: payload,
      });

      if (error) throw error;

      // Send payment receipt email to customer
      if (customerEmail && data.transaction) {
        try {
          await supabase.functions.invoke('send-transactional-email', {
            body: {
              type: 'payment_receipt',
              to: customerEmail,
              data: {
                amount: parseFloat(displayAmount),
                currency,
                transaction_id: data.transaction.id,
                description: description || `Payment ${ref}`,
                date: new Date().toISOString(),
              },
            },
          });
          console.log('Payment receipt email sent to:', customerEmail);
        } catch (emailError) {
          console.error('Failed to send payment receipt email:', emailError);
          // Don't fail the payment if email fails
        }
      }

      setPaymentComplete(true);

      if (successUrl) {
        const redirectUrl = new URL(successUrl);
        redirectUrl.searchParams.set('TRANSACTION_ID', data.transaction?.id || '');
        redirectUrl.searchParams.set('PARTNER_SESSION_ID', ref);
        setTimeout(() => {
          window.location.href = redirectUrl.toString();
        }, 2000);
      }
    } catch (error) {
      console.error('Payment error:', error);
      toast.error('Payment failed', {
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
          {successUrl && (
            <p className="text-sm text-muted-foreground">Redirecting you back...</p>
          )}
          {!successUrl && (
            <p className="text-sm text-muted-foreground">You can close this window.</p>
          )}
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
            <span className="font-heading text-lg font-bold text-foreground">Everpay</span>
          </div>
          {displayAmount && (
            <p className="text-4xl font-bold text-foreground">
              {new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(parseFloat(displayAmount))}
            </p>
          )}
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>

        {/* Payment Form */}
        <form onSubmit={handleSubmit} className="rounded-xl border border-border bg-card p-6 shadow-card space-y-5">
          {/* Customer Info */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-xs">Name</Label>
              <Input
                placeholder="John Doe"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="bg-background border-border"
                disabled={!!name}
                required
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Email</Label>
              <Input
                type="email"
                placeholder="john@example.com"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                className="bg-background border-border"
                disabled={!!email}
                required
              />
            </div>
          </div>

          {!amount && (
            <div className="space-y-2">
              <Label className="text-xs">Amount ({currency})</Label>
              <Input
                type="number"
                placeholder="0.00"
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                className="bg-background border-border font-mono text-lg"
                min="0.01"
                step="0.01"
                required
              />
            </div>
          )}

          {/* Payment Method Tabs */}
          {method === 'all' ? (
            <Tabs value={paymentMethod} onValueChange={(v: any) => setPaymentMethod(v)} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="card" className="gap-2">
                  <CreditCard className="h-3.5 w-3.5" /> Card
                </TabsTrigger>
                <TabsTrigger value="openbanking" className="gap-2">
                  <Building2 className="h-3.5 w-3.5" /> Bank
                </TabsTrigger>
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
            </Tabs>
          ) : method === 'openbanking' ? (
            <OpenBankingSection currency={currency} />
          ) : (
            <CardFields
              cardNumber={cardNumber} setCardNumber={setCardNumber}
              expMonth={expMonth} setExpMonth={setExpMonth}
              expYear={expYear} setExpYear={setExpYear}
              cvc={cvc} setCvc={setCvc}
              formatCardNumber={formatCardNumber}
            />
          )}

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

          {/* Security Footer */}
          <div className="flex items-center justify-center gap-4 pt-2 border-t border-border">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Lock className="h-3 w-3" /> SSL Encrypted
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Shield className="h-3 w-3" /> PCI Compliant
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="text-center space-y-1">
          <p className="text-xs text-muted-foreground">
            Secured by <span className="font-medium text-foreground">Everpay</span> · {DOMAIN}
          </p>
          {ref && (
            <p className="text-[10px] font-mono text-muted-foreground">Ref: {ref}</p>
          )}
          {cancelUrl && (
            <a href={cancelUrl} className="text-xs text-primary hover:underline">
              Cancel and return
            </a>
          )}
        </div>
      </div>
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
          type="text"
          placeholder="4242 4242 4242 4242"
          value={formatCardNumber(cardNumber)}
          onChange={(e) => setCardNumber(e.target.value.replace(/\s/g, ''))}
          className="bg-background border-border font-mono"
          maxLength={19}
          required
        />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-2">
          <Label className="text-xs">Month</Label>
          <Input type="text" placeholder="12" value={expMonth} onChange={(e) => setExpMonth(e.target.value)} className="bg-background border-border" maxLength={2} required />
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Year</Label>
          <Input type="text" placeholder="2025" value={expYear} onChange={(e) => setExpYear(e.target.value)} className="bg-background border-border" maxLength={4} required />
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
    ? [
        { name: 'Revolut', icon: '🏦' },
        { name: 'Monzo', icon: '🏦' },
        { name: 'Barclays', icon: '🏦' },
        { name: 'HSBC', icon: '🏦' },
        { name: 'Deutsche Bank', icon: '🏦' },
        { name: 'ING', icon: '🏦' },
      ]
    : [
        { name: 'Chase', icon: '🏦' },
        { name: 'Bank of America', icon: '🏦' },
        { name: 'Wells Fargo', icon: '🏦' },
        { name: 'Citi', icon: '🏦' },
      ];

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
            <span>{bank.icon}</span>
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
