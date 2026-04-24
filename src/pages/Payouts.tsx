import { useState, useEffect, useMemo } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatDate } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Banknote, Building2, ArrowRight, ArrowLeft, CheckCircle2, Clock, AlertCircle, CreditCard, RefreshCcw, TrendingDown } from 'lucide-react';
import { useAccounts } from '@/hooks/useAccounts';
import { useCreateMonetoPayout } from '@/hooks/useMoneto';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useProviderFees, usePlatformMarkup, calculateTotalFee } from '@/hooks/useFees';
import { useFxRates, convertAmount } from '@/hooks/useFxRates';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { PayoutSettlementTimeline } from '@/components/PayoutSettlementTimeline';
import { notifyError, notifySuccess } from '@/lib/error-toast';

interface PayoutRecord {
  id: string;
  amount: number;
  currency: string;
  status: 'processing' | 'completed' | 'failed';
  bank_name: string;
  account_last4: string;
  created_at: string;
}

const deliveryMethods = [
  { id: 'eft', label: 'Bank Transfer (EFT)', description: '1-2 business days', icon: Building2, currencies: ['CAD'] },
  { id: 'ach', label: 'ACH Transfer', description: '1-3 business days', icon: Building2, currencies: ['USD'] },
  { id: 'sepa', label: 'SEPA Transfer', description: '1 business day', icon: Building2, currencies: ['EUR'] },
  { id: 'wire', label: 'Wire Transfer', description: '1-2 business days', icon: Banknote, currencies: ['USD', 'EUR', 'GBP', 'CAD'] },
];

export default function Payouts() {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(1);

  // Step 1 state
  const [amount, setAmount] = useState('');
  const [sourceCurrency, setSourceCurrency] = useState('CAD');
  const [destinationCurrency, setDestinationCurrency] = useState('CAD');
  const [deliveryMethod, setDeliveryMethod] = useState('eft');

  // Step 2 state
  const [institutionNumber, setInstitutionNumber] = useState('');
  const [transitNumber, setTransitNumber] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountHolderName, setAccountHolderName] = useState('');
  const [saveAccount, setSaveAccount] = useState(true);
  const [selectedSavedAccount, setSelectedSavedAccount] = useState<string>('');

  const [payouts, setPayouts] = useState<PayoutRecord[]>([]);
  const [selectedPayout, setSelectedPayout] = useState<PayoutRecord | null>(null);

  // Fetch provider_events for the selected payout (matched by metadata.payout_id)
  const { data: payoutEvents = [] } = useQuery({
    queryKey: ['payout-events', selectedPayout?.id],
    enabled: !!selectedPayout,
    queryFn: async () => {
      if (!selectedPayout) return [];
      const { data, error } = await supabase
        .from('provider_events')
        .select('id, event_type, provider, created_at, payload')
        .or(
          `payload->>payout_id.eq.${selectedPayout.id},transaction_id.eq.${selectedPayout.id}`,
        )
        .order('created_at', { ascending: true })
        .limit(50);
      if (error) {
        console.warn('payout events fetch', error);
        return [];
      }
      return data ?? [];
    },
  });

  const { data: accounts = [] } = useAccounts();
  const createPayout = useCreateMonetoPayout();
  const { data: fxRates = {}, isLoading: fxLoading, refetch: refetchRates } = useFxRates(sourceCurrency);
  const { data: providerFees = [] } = useProviderFees('mzzpay');
  const { data: markups = [] } = usePlatformMarkup();

  // Find applicable fees
  const payoutFee = useMemo(() => {
    return providerFees.find(f => f.fee_type === 'payout' && f.rail === deliveryMethod);
  }, [providerFees, deliveryMethod]);

  const markup = useMemo(() => {
    return markups.find(m => m.rail === deliveryMethod);
  }, [markups, deliveryMethod]);

  const feeCalc = useMemo(() => {
    const amt = parseFloat(amount) || 0;
    return calculateTotalFee(amt, payoutFee, markup);
  }, [amount, payoutFee, markup]);

  const fxRate = fxRates[destinationCurrency] || 1;
  const convertedAmount = (parseFloat(amount) || 0) * (sourceCurrency !== destinationCurrency ? fxRate : 1);
  const recipientGets = convertedAmount - feeCalc.totalFee;

  // Saved bank accounts
  const { data: savedBankAccounts = [] } = useQuery({
    queryKey: ['saved-bank-accounts'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const { data: merchant } = await supabase.from('merchants').select('id').eq('user_id', user.id).single();
      if (!merchant) throw new Error('Merchant not found');
      const { data, error } = await supabase.from('saved_bank_accounts').select('*').eq('merchant_id', merchant.id).order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (selectedSavedAccount) {
      const account = savedBankAccounts.find(a => a.id === selectedSavedAccount);
      if (account) {
        setInstitutionNumber(account.institution_number);
        setTransitNumber(account.transit_number);
        setAccountNumber('');
        setAccountHolderName(account.account_holder_name);
        setDestinationCurrency(account.currency);
      }
    }
  }, [selectedSavedAccount, savedBankAccounts]);

  const selectedAccount = accounts.find(a => a.currency === sourceCurrency);
  const availableBalance = selectedAccount?.available_balance || 0;

  const availableDeliveryMethods = deliveryMethods.filter(m => m.currencies.includes(destinationCurrency));

  useEffect(() => {
    if (!availableDeliveryMethods.find(m => m.id === deliveryMethod)) {
      setDeliveryMethod(availableDeliveryMethods[0]?.id || 'wire');
    }
  }, [destinationCurrency]);

  const handleCreatePayout = async () => {
    if (!amount || parseFloat(amount) <= 0) { notifyError({ message: 'Enter a valid amount' }); return; }
    if (parseFloat(amount) > availableBalance) { notifyError({ message: 'Insufficient balance' }); return; }
    if (!institutionNumber || !transitNumber || !accountNumber || !accountHolderName) {
      notifyError({ message: 'Fill in all bank details' }); return;
    }

    try {
      const result = await createPayout.mutateAsync({
        amount: parseFloat(amount),
        currency_code: destinationCurrency,
        country_code: destinationCurrency === 'CAD' ? 'CA' : destinationCurrency === 'EUR' ? 'EU' : 'US',
        bank_account: {
          institution_number: institutionNumber,
          transit_number: transitNumber,
          account_number: accountNumber,
          account_holder_name: accountHolderName,
        },
      });

      if (saveAccount && !selectedSavedAccount && accountNumber.length >= 4) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: merchant } = await supabase.from('merchants').select('id').eq('user_id', user.id).single();
          if (merchant) {
            const exists = savedBankAccounts.find(a => a.institution_number === institutionNumber && a.transit_number === transitNumber && a.account_last4 === accountNumber.slice(-4));
            if (!exists) {
              await supabase.from('saved_bank_accounts').insert({
                merchant_id: merchant.id, institution_number: institutionNumber,
                transit_number: transitNumber, account_last4: accountNumber.slice(-4),
                account_holder_name: accountHolderName, currency: destinationCurrency,
              });
              queryClient.invalidateQueries({ queryKey: ['saved-bank-accounts'] });
            }
          }
        }
      }

      setPayouts(prev => [{ id: result.payout_id, amount: parseFloat(amount), currency: destinationCurrency, status: 'processing', bank_name: `Bank ${institutionNumber}`, account_last4: accountNumber.slice(-4), created_at: new Date().toISOString() }, ...prev]);

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.email) {
          await supabase.functions.invoke('send-transactional-email', {
            body: { type: 'payout_confirmation', to: user.email, data: { amount: parseFloat(amount), currency: destinationCurrency, account_last4: accountNumber.slice(-4), date: new Date().toISOString() } },
          });
        }
      } catch {}

      notifySuccess('Payout initiated successfully');
      setIsOpen(false);
      resetForm();
    } catch (error) {
      notifyError(error, { fallback: 'Failed to create payout' });
    }
  };

  const resetForm = () => {
    setStep(1);
    setAmount('');
    setInstitutionNumber('');
    setTransitNumber('');
    setAccountNumber('');
    setAccountHolderName('');
    setSelectedSavedAccount('');
    setSaveAccount(true);
    setDeliveryMethod('eft');
  };

  const getStatusIcon = (status: PayoutRecord['status']) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="h-4 w-4 text-success" />;
      case 'processing': return <Clock className="h-4 w-4 text-warning" />;
      case 'failed': return <AlertCircle className="h-4 w-4 text-destructive" />;
    }
  };

  const getStatusBadge = (status: PayoutRecord['status']) => {
    switch (status) {
      case 'completed': return <Badge className="bg-success/10 text-success border-success/20">Completed</Badge>;
      case 'processing': return <Badge className="bg-warning/10 text-warning border-warning/20">Processing</Badge>;
      case 'failed': return <Badge variant="destructive">Failed</Badge>;
    }
  };

  return (
    <AppLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">Payouts</h1>
          <p className="mt-1 text-sm text-muted-foreground">Withdraw funds to your bank accounts</p>
        </div>
        <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" /> New Payout</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {step === 1 && 'How much are you sending?'}
                {step === 2 && 'Where are we sending it?'}
                {step === 3 && 'Review & Confirm'}
              </DialogTitle>
              <DialogDescription>
                Step {step} of 3
              </DialogDescription>
            </DialogHeader>

            {/* ── STEP 1: Amount + Delivery Method ── */}
            {step === 1 && (
              <div className="space-y-5 py-2">
                {/* Source Currency */}
                <div className="space-y-2">
                  <Label>You send from</Label>
                  <Select value={sourceCurrency} onValueChange={setSourceCurrency}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CAD">🇨🇦 CAD</SelectItem>
                      <SelectItem value="USD">🇺🇸 USD</SelectItem>
                      <SelectItem value="EUR">🇪🇺 EUR</SelectItem>
                      <SelectItem value="GBP">🇬🇧 GBP</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">Available: {formatCurrency(availableBalance, sourceCurrency as any)}</p>
                </div>

                <div className="space-y-2">
                  <Label>Amount</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">{sourceCurrency}</span>
                    <Input type="number" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} className="pl-14" step="0.01" min="0" />
                  </div>
                </div>

                {/* Destination Currency */}
                <div className="space-y-2">
                  <Label>Recipient gets</Label>
                  <Select value={destinationCurrency} onValueChange={setDestinationCurrency}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CAD">🇨🇦 CAD</SelectItem>
                      <SelectItem value="USD">🇺🇸 USD</SelectItem>
                      <SelectItem value="EUR">🇪🇺 EUR</SelectItem>
                      <SelectItem value="GBP">🇬🇧 GBP</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* FX Rate Display */}
                {sourceCurrency !== destinationCurrency && (
                  <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <TrendingDown className="h-4 w-4 text-primary" />
                        <span className="text-sm font-medium text-primary">Exchange Rate</span>
                      </div>
                      <button onClick={() => refetchRates()} className="text-xs text-primary/70 hover:text-primary flex items-center gap-1">
                        <RefreshCcw className="h-3 w-3" /> Refresh
                      </button>
                    </div>
                    <p className="mt-1 text-lg font-heading font-bold text-foreground">
                      1 {sourceCurrency} = {fxLoading ? '...' : fxRate.toFixed(4)} {destinationCurrency}
                    </p>
                    {amount && parseFloat(amount) > 0 && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {formatCurrency(parseFloat(amount), sourceCurrency as any)} ≈ {formatCurrency(convertedAmount, destinationCurrency as any)}
                      </p>
                    )}
                  </div>
                )}

                {/* Delivery Method */}
                <div className="space-y-2">
                  <Label>Delivery method</Label>
                  <div className="grid gap-2">
                    {availableDeliveryMethods.map((method) => {
                      const Icon = method.icon;
                      return (
                        <button
                          key={method.id}
                          type="button"
                          onClick={() => setDeliveryMethod(method.id)}
                          className={`flex items-center gap-3 rounded-lg border p-3 text-left transition-colors ${
                            deliveryMethod === method.id
                              ? 'border-primary bg-primary/5 text-foreground'
                              : 'border-border hover:border-primary/30 text-muted-foreground'
                          }`}
                        >
                          <Icon className="h-5 w-5 shrink-0" />
                          <div className="flex-1">
                            <p className="text-sm font-medium">{method.label}</p>
                            <p className="text-xs opacity-70">{method.description}</p>
                          </div>
                          {deliveryMethod === method.id && <CheckCircle2 className="h-4 w-4 text-primary" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <Button className="w-full gap-2" onClick={() => setStep(2)} disabled={!amount || parseFloat(amount) <= 0}>
                  Continue <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            )}

            {/* ── STEP 2: Bank Details ── */}
            {step === 2 && (
              <div className="space-y-4 py-2">
                <button type="button" onClick={() => setStep(1)} className="flex items-center gap-1 text-xs text-primary hover:underline">
                  <ArrowLeft className="h-3 w-3" /> Back
                </button>

                {savedBankAccounts.length > 0 && (
                  <div className="space-y-2">
                    <Label>Saved Bank Accounts</Label>
                    <Select value={selectedSavedAccount} onValueChange={setSelectedSavedAccount}>
                      <SelectTrigger><SelectValue placeholder="Select a saved account or enter new" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Enter new account details</SelectItem>
                        {savedBankAccounts.map((account) => (
                          <SelectItem key={account.id} value={account.id}>
                            {account.nickname || account.account_holder_name} •••• {account.account_last4} ({account.currency})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-3 pt-2">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Building2 className="h-4 w-4" /> Bank Account Details
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-xs">Institution #</Label>
                      <Input placeholder="003" value={institutionNumber} onChange={(e) => setInstitutionNumber(e.target.value)} maxLength={3} />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Transit #</Label>
                      <Input placeholder="12345" value={transitNumber} onChange={(e) => setTransitNumber(e.target.value)} maxLength={5} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Account Number</Label>
                    <Input placeholder="1234567890" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Account Holder Name</Label>
                    <Input placeholder="John Doe" value={accountHolderName} onChange={(e) => setAccountHolderName(e.target.value)} />
                  </div>
                  {!selectedSavedAccount && (
                    <div className="flex items-center gap-2 pt-2">
                      <input type="checkbox" id="save-account" checked={saveAccount} onChange={(e) => setSaveAccount(e.target.checked)} className="h-4 w-4 rounded border-input" />
                      <Label htmlFor="save-account" className="text-xs cursor-pointer">Save for future payouts</Label>
                    </div>
                  )}
                </div>

                <Button className="w-full gap-2" onClick={() => setStep(3)} disabled={!institutionNumber || !transitNumber || !accountNumber || !accountHolderName}>
                  Review Payout <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            )}

            {/* ── STEP 3: Review + Fee Breakdown + Confirm ── */}
            {step === 3 && (
              <div className="space-y-4 py-2">
                <button type="button" onClick={() => setStep(2)} className="flex items-center gap-1 text-xs text-primary hover:underline">
                  <ArrowLeft className="h-3 w-3" /> Back
                </button>

                {/* Transfer summary */}
                <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">You send</span>
                    <span className="font-heading font-bold text-lg">{formatCurrency(parseFloat(amount), sourceCurrency as any)}</span>
                  </div>

                  {sourceCurrency !== destinationCurrency && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Exchange rate</span>
                      <span className="font-medium text-primary">1 {sourceCurrency} = {fxRate.toFixed(4)} {destinationCurrency}</span>
                    </div>
                  )}

                  <div className="border-t border-border pt-2 space-y-1.5">
                    {payoutFee && (payoutFee.rate_percent > 0 || payoutFee.flat_fee > 0) && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Provider fee ({payoutFee.description})</span>
                        <span className="font-medium">
                          {payoutFee.rate_percent > 0 ? `${payoutFee.rate_percent}%` : ''}
                          {payoutFee.rate_percent > 0 && payoutFee.flat_fee > 0 ? ' + ' : ''}
                          {payoutFee.flat_fee > 0 ? formatCurrency(payoutFee.flat_fee, payoutFee.flat_fee_currency as any) : ''}
                        </span>
                      </div>
                    )}

                    {markup && (markup.markup_percent > 0 || markup.markup_flat > 0) && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Processing fee</span>
                        <span className="font-medium">
                          {markup.markup_percent > 0 ? `${markup.markup_percent}%` : ''}
                          {markup.markup_percent > 0 && markup.markup_flat > 0 ? ' + ' : ''}
                          {markup.markup_flat > 0 ? formatCurrency(markup.markup_flat, markup.markup_flat_currency as any) : ''}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Total fees</span>
                      <span className="font-medium text-destructive">{formatCurrency(feeCalc.totalFee, sourceCurrency as any)}</span>
                    </div>
                  </div>

                  <div className="border-t border-border pt-3 flex items-center justify-between">
                    <span className="font-semibold">Recipient gets</span>
                    <span className="font-heading font-bold text-xl text-success">
                      {formatCurrency(
                        sourceCurrency !== destinationCurrency ? recipientGets : feeCalc.totalDeducted,
                        destinationCurrency as any
                      )}
                    </span>
                  </div>
                </div>

                {/* Bank summary */}
                <div className="rounded-lg border border-border p-3 flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-muted">
                    <Building2 className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{accountHolderName}</p>
                    <p className="text-xs text-muted-foreground">
                      Inst. {institutionNumber} • Transit {transitNumber} • ••••{accountNumber.slice(-4)}
                    </p>
                  </div>
                </div>

                {/* Delivery estimate */}
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>
                    Delivers in {deliveryMethods.find(m => m.id === deliveryMethod)?.description || '1-2 business days'}
                    {' via '}{deliveryMethods.find(m => m.id === deliveryMethod)?.label}
                  </span>
                </div>

                <Button className="w-full gap-2" onClick={handleCreatePayout} disabled={createPayout.isPending}>
                  {createPayout.isPending ? 'Processing...' : (
                    <><Banknote className="h-4 w-4" /> Confirm & Send</>
                  )}
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {/* Recent Payouts */}
      {payouts.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 rounded-xl border border-border bg-card">
          <div className="p-4 rounded-full bg-muted mb-4">
            <Banknote className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground mb-2">No payouts yet</p>
          <p className="text-sm text-muted-foreground mb-4">Create your first payout to withdraw funds</p>
          <Button onClick={() => setIsOpen(true)} variant="outline" className="gap-2">
            <Plus className="h-4 w-4" /> Create First Payout
          </Button>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="p-4 border-b border-border">
            <h2 className="font-heading font-semibold">Recent Payouts</h2>
          </div>
          <div className="divide-y divide-border">
            {payouts.map((payout) => (
              <button
                type="button"
                key={payout.id}
                onClick={() => setSelectedPayout(payout)}
                className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors text-left"
              >
                <div className="flex items-center gap-4">
                  <div className="p-2 rounded-lg bg-muted">{getStatusIcon(payout.status)}</div>
                  <div>
                    <p className="font-medium text-foreground">{formatCurrency(payout.amount, payout.currency as any)}</p>
                    <p className="text-sm text-muted-foreground">To •••• {payout.account_last4} • {payout.bank_name}</p>
                  </div>
                </div>
                <div className="text-right">
                  {getStatusBadge(payout.status)}
                  <p className="text-xs text-muted-foreground mt-1">{formatDate(payout.created_at)}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Payout detail dialog with settlement timeline */}
      <Dialog open={!!selectedPayout} onOpenChange={(o) => !o && setSelectedPayout(null)}>
        <DialogContent className="sm:max-w-lg">
          {selectedPayout && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {getStatusIcon(selectedPayout.status)}
                  Payout {formatCurrency(selectedPayout.amount, selectedPayout.currency as any)}
                </DialogTitle>
                <DialogDescription>
                  To •••• {selectedPayout.account_last4} · {selectedPayout.bank_name}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-5 pt-2">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="rounded-md border border-border bg-background p-2.5">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Payout ID</p>
                    <p className="font-mono text-[11px] text-foreground truncate">{selectedPayout.id}</p>
                  </div>
                  <div className="rounded-md border border-border bg-background p-2.5">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Status</p>
                    <div className="mt-0.5">{getStatusBadge(selectedPayout.status)}</div>
                  </div>
                </div>
                <PayoutSettlementTimeline
                  payout={selectedPayout}
                  events={payoutEvents as any}
                />
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <div className="mt-8 rounded-xl border border-border bg-card/50 p-6">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-lg bg-primary/10">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="font-heading font-semibold text-foreground mb-1">Bank Payouts via MzzPay</h3>
            <p className="text-sm text-muted-foreground mb-3">
              Fast, secure payouts to bank accounts worldwide. Funds typically arrive within 1-2 business days.
            </p>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">1-2 Day Settlement</Badge>
              <Badge variant="outline">CAD, USD, EUR & GBP</Badge>
              <Badge variant="outline">Live FX Rates</Badge>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
