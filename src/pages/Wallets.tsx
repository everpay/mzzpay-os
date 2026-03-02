import { AppLayout } from '@/components/AppLayout';
import { mockAccounts } from '@/lib/mock-data';
import { formatCurrency } from '@/lib/format';
import { Wallet, TrendingUp, Clock } from 'lucide-react';

const currencyFlags: Record<string, string> = {
  USD: '🇺🇸', EUR: '🇪🇺', GBP: '🇬🇧', BRL: '🇧🇷', MXN: '🇲🇽', COP: '🇨🇴',
};

export default function Wallets() {
  return (
    <AppLayout>
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">Wallets</h1>
        <p className="mt-1 text-sm text-muted-foreground">Balances per currency from ledger</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {mockAccounts.map((account) => (
          <div key={account.id} className="rounded-xl border border-border bg-card p-5 shadow-card animate-fade-in">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl">{currencyFlags[account.currency]}</span>
              <div>
                <h3 className="font-heading text-lg font-bold text-foreground">{account.currency}</h3>
                <p className="text-xs text-muted-foreground">Multi-currency wallet</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Wallet className="h-3.5 w-3.5" />
                  Total Balance
                </div>
                <span className="font-heading font-bold text-foreground">
                  {formatCurrency(account.balance, account.currency)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <TrendingUp className="h-3.5 w-3.5 text-success" />
                  Available
                </div>
                <span className="text-sm text-success font-medium">
                  {formatCurrency(account.available_balance, account.currency)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-3.5 w-3.5 text-warning" />
                  Pending
                </div>
                <span className="text-sm text-warning font-medium">
                  {formatCurrency(account.pending_balance, account.currency)}
                </span>
              </div>
            </div>

            <div className="mt-4 h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full gradient-primary"
                style={{ width: `${(account.available_balance / account.balance) * 100}%` }}
              />
            </div>
            <p className="mt-1.5 text-[10px] text-muted-foreground">
              {((account.available_balance / account.balance) * 100).toFixed(1)}% available
            </p>
          </div>
        ))}
      </div>
    </AppLayout>
  );
}
