import { AppLayout } from '@/components/AppLayout';
import { StatCard } from '@/components/StatCard';
import { VolumeChart } from '@/components/VolumeChart';
import { TransactionTable } from '@/components/TransactionTable';
import { ActivityFeed } from '@/components/ActivityFeed';
import { mockTransactions, mockAccounts } from '@/lib/mock-data';
import { formatCurrency } from '@/lib/format';
import { DollarSign, ArrowUpRight, ArrowLeftRight, Clock } from 'lucide-react';

const totalBalance = mockAccounts.reduce((sum, a) => {
  // Simplified: assume USD equivalent
  const rates: Record<string, number> = { USD: 1, EUR: 1.08, GBP: 1.27, BRL: 0.195, MXN: 0.057, COP: 0.00024 };
  return sum + a.balance * (rates[a.currency] || 1);
}, 0);

const Index = () => {
  return (
    <AppLayout>
      <div className="mb-8">
        <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">Overview of your payment infrastructure</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <StatCard
          title="Total Balance"
          value={formatCurrency(totalBalance, 'USD')}
          change="+8.2%"
          changeType="positive"
          icon={DollarSign}
          subtitle="Across all currencies"
        />
        <StatCard
          title="Today's Volume"
          value={formatCurrency(73000, 'USD')}
          change="+12.4%"
          changeType="positive"
          icon={ArrowUpRight}
          subtitle="45 transactions"
        />
        <StatCard
          title="Active Providers"
          value="3"
          icon={ArrowLeftRight}
          subtitle="FacilitaPay · Mondo · Stripe"
        />
        <StatCard
          title="Pending Settlement"
          value={formatCurrency(88190, 'USD')}
          change="-3.1%"
          changeType="negative"
          icon={Clock}
          subtitle="12 transactions"
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
        <TransactionTable transactions={mockTransactions.slice(0, 5)} compact />
      </div>
    </AppLayout>
  );
};

export default Index;
