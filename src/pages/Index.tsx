import { AppLayout } from '@/components/AppLayout';
import { StatCard } from '@/components/StatCard';
import { VolumeChart } from '@/components/VolumeChart';
import { TransactionTable } from '@/components/TransactionTable';
import { ActivityFeed } from '@/components/ActivityFeed';
import { useTransactions } from '@/hooks/useTransactions';
import { useAccounts } from '@/hooks/useAccounts';
import { formatCurrency } from '@/lib/format';
import { DollarSign, ArrowUpRight, ArrowLeftRight, Clock } from 'lucide-react';

const Index = () => {
  const { data: transactions = [], isLoading: loadingTx } = useTransactions();
  const { data: accounts = [], isLoading: loadingAccounts } = useAccounts();

  // Calculate total balance across all currencies (simplified conversion)
  const totalBalance = accounts.reduce((sum, a) => {
    const rates: Record<string, number> = { USD: 1, EUR: 1.08, GBP: 1.27, BRL: 0.195, MXN: 0.057, COP: 0.00024 };
    return sum + a.balance * (rates[a.currency] || 1);
  }, 0);

  // Calculate today's transactions
  const today = new Date().toISOString().split('T')[0];
  const todayTransactions = transactions.filter(tx => tx.created_at.startsWith(today));
  const todayVolume = todayTransactions.reduce((sum, tx) => sum + tx.amount, 0);

  // Calculate pending settlement
  const pendingTransactions = transactions.filter(tx => ['pending', 'processing'].includes(tx.status));
  const pendingAmount = pendingTransactions.reduce((sum, tx) => sum + tx.amount, 0);

  // Get unique providers
  const providers = [...new Set(transactions.map(tx => tx.provider))];

  return (
    <AppLayout>
      <div className="mb-8">
        <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">Overview of your payment infrastructure</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <StatCard
          title="Total Balance"
          value={loadingAccounts ? '...' : formatCurrency(totalBalance, 'USD')}
          change="+8.2%"
          changeType="positive"
          icon={DollarSign}
          subtitle="Across all currencies"
        />
        <StatCard
          title="Today's Volume"
          value={loadingTx ? '...' : formatCurrency(todayVolume, 'USD')}
          change="+12.4%"
          changeType="positive"
          icon={ArrowUpRight}
          subtitle={`${todayTransactions.length} transactions`}
        />
        <StatCard
          title="Active Providers"
          value={loadingTx ? '...' : providers.length.toString()}
          icon={ArrowLeftRight}
          subtitle={providers.join(' · ') || 'No providers yet'}
        />
        <StatCard
          title="Pending Settlement"
          value={loadingTx ? '...' : formatCurrency(pendingAmount, 'USD')}
          change="-3.1%"
          changeType="negative"
          icon={Clock}
          subtitle={`${pendingTransactions.length} transactions`}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 mb-6">
        <div className="lg:col-span-2">
          <VolumeChart />
        </div>
        <ActivityFeed />
      </div>

      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-heading text-lg font-semibold text-foreground">Recent Transactions</h2>
          <a href="/transactions" className="text-sm text-primary hover:underline">View all →</a>
        </div>
        {loadingTx ? (
          <div className="flex items-center justify-center p-8 rounded-xl border border-border bg-card">
            <p className="text-muted-foreground">Loading transactions...</p>
          </div>
        ) : (
          <TransactionTable transactions={transactions.slice(0, 5)} compact />
        )}
      </div>
    </AppLayout>
  );
};

export default Index;
