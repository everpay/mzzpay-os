import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatDate } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Banknote, Building2, ArrowRight, CheckCircle2, Clock, AlertCircle, Save } from 'lucide-react';
import { useAccounts } from '@/hooks/useAccounts';
import { useCreateMonetoPayout } from '@/hooks/useMoneto';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface PayoutRecord {
  id: string;
  amount: number;
  currency: string;
  status: 'processing' | 'completed' | 'failed';
  bank_name: string;
  account_last4: string;
  created_at: string;
}

// Mock recent payouts for demo
const mockPayouts: PayoutRecord[] = [];

export default function Payouts() {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('CAD');
  const [institutionNumber, setInstitutionNumber] = useState('');
  const [transitNumber, setTransitNumber] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountHolderName, setAccountHolderName] = useState('');
  const [saveAccount, setSaveAccount] = useState(true);
  const [selectedSavedAccount, setSelectedSavedAccount] = useState<string>('');
  const [payouts, setPayouts] = useState<PayoutRecord[]>(mockPayouts);

  const { data: accounts = [] } = useAccounts();
  const createPayout = useCreateMonetoPayout();

  // Fetch saved bank accounts
  const { data: savedBankAccounts = [] } = useQuery({
    queryKey: ['saved-bank-accounts'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: merchant } = await supabase
        .from('merchants')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!merchant) throw new Error('Merchant not found');

      const { data, error } = await supabase
        .from('saved_bank_accounts')
        .select('*')
        .eq('merchant_id', merchant.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // When a saved account is selected, populate the form
  useEffect(() => {
    if (selectedSavedAccount) {
      const account = savedBankAccounts.find(a => a.id === selectedSavedAccount);
      if (account) {
        setInstitutionNumber(account.institution_number);
        setTransitNumber(account.transit_number);
        setAccountNumber(''); // Don't populate full account number for security
        setAccountHolderName(account.account_holder_name);
        setCurrency(account.currency);
      }
    }
  }, [selectedSavedAccount, savedBankAccounts]);

  const selectedAccount = accounts.find(a => a.currency === currency);
  const availableBalance = selectedAccount?.available_balance || 0;

  const handleCreatePayout = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (parseFloat(amount) > availableBalance) {
      toast.error('Insufficient available balance');
      return;
    }

    if (!institutionNumber || !transitNumber || !accountNumber || !accountHolderName) {
      toast.error('Please fill in all bank account details');
      return;
    }

    try {
      const result = await createPayout.mutateAsync({
        amount: parseFloat(amount),
        currency_code: currency,
        country_code: currency === 'CAD' ? 'CA' : 'US',
        bank_account: {
          institution_number: institutionNumber,
          transit_number: transitNumber,
          account_number: accountNumber,
          account_holder_name: accountHolderName,
        },
      });

      // Save bank account if requested and not using a saved account
      if (saveAccount && !selectedSavedAccount && accountNumber.length >= 4) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: merchant } = await supabase
            .from('merchants')
            .select('id')
            .eq('user_id', user.id)
            .single();

          if (merchant) {
            // Check if account already exists
            const existingAccount = savedBankAccounts.find(
              a => a.institution_number === institutionNumber && 
                   a.transit_number === transitNumber && 
                   a.account_last4 === accountNumber.slice(-4)
            );

            if (!existingAccount) {
              await supabase.from('saved_bank_accounts').insert({
                merchant_id: merchant.id,
                institution_number: institutionNumber,
                transit_number: transitNumber,
                account_last4: accountNumber.slice(-4),
                account_holder_name: accountHolderName,
                currency: currency,
              });
              queryClient.invalidateQueries({ queryKey: ['saved-bank-accounts'] });
            }
          }
        }
      }

      // Add to local payouts list
      setPayouts(prev => [{
        id: result.payout_id,
        amount: parseFloat(amount),
        currency,
        status: 'processing',
        bank_name: `Bank ${institutionNumber}`,
        account_last4: accountNumber.slice(-4),
        created_at: new Date().toISOString(),
      }, ...prev]);

      toast.success('Payout initiated successfully');
      setIsOpen(false);
      resetForm();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create payout');
    }
  };

  const resetForm = () => {
    setAmount('');
    setInstitutionNumber('');
    setTransitNumber('');
    setAccountNumber('');
    setAccountHolderName('');
    setSelectedSavedAccount('');
    setSaveAccount(true);
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
          <p className="mt-1 text-sm text-muted-foreground">Withdraw funds to your bank accounts via Moneto</p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              New Payout
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Create Payout</DialogTitle>
              <DialogDescription>
                Withdraw funds from your Moneto wallet to your bank account.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              {/* Currency Selection */}
              <div className="space-y-2">
                <Label>Currency</Label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CAD">🇨🇦 CAD - Canadian Dollar</SelectItem>
                    <SelectItem value="USD">🇺🇸 USD - US Dollar</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Available: {formatCurrency(availableBalance, currency as any)}
                </p>
              </div>

              {/* Amount */}
              <div className="space-y-2">
                <Label>Amount</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="pl-7"
                    step="0.01"
                    min="0"
                    max={availableBalance}
                  />
                </div>
              </div>

              {/* Saved Bank Accounts */}
              {savedBankAccounts.length > 0 && (
                <div className="space-y-2">
                  <Label>Saved Bank Accounts</Label>
                  <Select value={selectedSavedAccount} onValueChange={setSelectedSavedAccount}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a saved account or enter new details" />
                    </SelectTrigger>
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

              {/* Bank Details */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Building2 className="h-4 w-4" />
                  Bank Account Details
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-xs">Institution #</Label>
                    <Input
                      placeholder="003"
                      value={institutionNumber}
                      onChange={(e) => setInstitutionNumber(e.target.value)}
                      maxLength={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Transit #</Label>
                    <Input
                      placeholder="12345"
                      value={transitNumber}
                      onChange={(e) => setTransitNumber(e.target.value)}
                      maxLength={5}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Account Number</Label>
                  <Input
                    placeholder="1234567890"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Account Holder Name</Label>
                  <Input
                    placeholder="John Doe"
                    value={accountHolderName}
                    onChange={(e) => setAccountHolderName(e.target.value)}
                  />
                </div>

                {/* Save account checkbox */}
                {!selectedSavedAccount && (
                  <div className="flex items-center gap-2 pt-2">
                    <input
                      type="checkbox"
                      id="save-account"
                      checked={saveAccount}
                      onChange={(e) => setSaveAccount(e.target.checked)}
                      className="h-4 w-4 rounded border-input"
                    />
                    <Label htmlFor="save-account" className="text-xs cursor-pointer">
                      Save this account for future payouts
                    </Label>
                  </div>
                )}
              </div>

              {/* Summary */}
              {amount && parseFloat(amount) > 0 && (
                <div className="rounded-lg border border-border bg-muted/50 p-4 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Payout Amount</span>
                    <span className="font-medium">{formatCurrency(parseFloat(amount), currency as any)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Processing Fee</span>
                    <span className="text-success">$0.00</span>
                  </div>
                  <div className="border-t border-border pt-2 flex items-center justify-between">
                    <span className="font-medium">You'll receive</span>
                    <span className="font-heading font-bold text-lg">{formatCurrency(parseFloat(amount), currency as any)}</span>
                  </div>
                </div>
              )}

              <Button 
                className="w-full gap-2" 
                onClick={handleCreatePayout}
                disabled={createPayout.isPending || !amount || parseFloat(amount) <= 0}
              >
                {createPayout.isPending ? (
                  'Processing...'
                ) : (
                  <>
                    <Banknote className="h-4 w-4" />
                    Initiate Payout
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
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
          <p className="text-sm text-muted-foreground mb-4">Create your first payout to withdraw funds to your bank</p>
          <Button onClick={() => setIsOpen(true)} variant="outline" className="gap-2">
            <Plus className="h-4 w-4" />
            Create First Payout
          </Button>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="p-4 border-b border-border">
            <h2 className="font-heading font-semibold">Recent Payouts</h2>
          </div>
          <div className="divide-y divide-border">
            {payouts.map((payout) => (
              <div key={payout.id} className="p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="p-2 rounded-lg bg-muted">
                    {getStatusIcon(payout.status)}
                  </div>
                  <div>
                    <p className="font-medium text-foreground">
                      {formatCurrency(payout.amount, payout.currency as any)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      To •••• {payout.account_last4} • {payout.bank_name}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  {getStatusBadge(payout.status)}
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDate(payout.created_at)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Moneto Payout Info */}
      <div className="mt-8 rounded-xl border border-border bg-card/50 p-6">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-lg bg-primary/10">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="font-heading font-semibold text-foreground mb-1">Bank Payouts via Moneto</h3>
            <p className="text-sm text-muted-foreground mb-3">
              Fast, secure payouts to Canadian and US bank accounts. Funds typically arrive within 1-2 business days.
            </p>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">No Payout Fees</Badge>
              <Badge variant="outline">1-2 Day Settlement</Badge>
              <Badge variant="outline">CAD &amp; USD</Badge>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
