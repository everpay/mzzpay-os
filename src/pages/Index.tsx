import { useState, useMemo } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { StatCard } from '@/components/StatCard';
import { VolumeChart } from '@/components/VolumeChart';
import { TransactionTable } from '@/components/TransactionTable';
import { ProviderAnalytics } from '@/components/ProviderAnalytics';
import { useTransactions } from '@/hooks/useTransactions';
import { useAccounts } from '@/hooks/useAccounts';
import { useProfile } from '@/hooks/useProfile';
import { formatCurrency } from '@/lib/format';
import { DollarSign, ArrowUpRight, ArrowLeftRight, Clock, Filter, X, Users } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PeriodSelector, type PeriodValue, getPeriodCutoff } from '@/components/PeriodSelector';
import { CurrencySelector } from '@/components/CurrencySelector';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';

const Index = () => {
  const { data: transactions = [], isLoading: loadingTx } = useTransactions();
  const { data: accounts = [], isLoading: loadingAccounts } = useAccounts();
  const { data: profile } = useProfile();

  const { data: customerCount = 0 } = useQuery({
    queryKey: ['customer-count'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return 0;
      const { data: merchant } = await supabase.from('merchants').select('id').eq('user_id', user.id).single();
      if (!merchant) return 0;
      const { count } = await supabase.from('customers').select('id', { count: 'exact', head: true }).eq('merchant_id', merchant.id);
      return count || 0;
    },
  });

  // Filters
  const [providerFilter, setProviderFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<PeriodValue>('30d');
  const [currencyFilter, setCurrencyFilter] = useState('all');

  const allProviders = useMemo(() => [...new Set(transactions.map((tx) => tx.provider))], [transactions]);

  const filteredTransactions = useMemo(() => {
    let filtered = transactions;
    if (providerFilter !== 'all') filtered = filtered.filter((tx) => tx.provider === providerFilter);
    if (statusFilter !== 'all') filtered = filtered.filter((tx) => tx.status === statusFilter);
    if (currencyFilter !== 'all') filtered = filtered.filter((tx) => tx.currency === currencyFilter);
    const cutoff = getPeriodCutoff(dateRange);
    if (cutoff) filtered = filtered.filter((tx) => new Date(tx.created_at) >= cutoff);
    return filtered;
  }, [transactions, providerFilter, statusFilter, currencyFilter, dateRange]);

  const hasActiveFilters =
    providerFilter !== 'all' || statusFilter !== 'all' || currencyFilter !== 'all' || dateRange !== '30d';
  const clearFilters = () => {
    setProviderFilter('all');
    setStatusFilter('all');
    setCurrencyFilter('all');
    setDateRange('30d');
  };

  const rates: Record<string, number> = {
    USD: 1,
    EUR: 1.08,
    GBP: 1.27,
    BRL: 0.195,
    MXN: 0.057,
    COP: 0.00024,
    CAD: 0.74,
  };
  const totalBalance = accounts.reduce((sum, a) => sum + a.balance * (rates[a.currency] || 1), 0);

  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  const todayTransactions = filteredTransactions.filter((tx) => tx.created_at.startsWith(today));
  const todayVolume = todayTransactions.reduce((sum, tx) => sum + tx.amount, 0);
  const yesterdayVolume = filteredTransactions
    .filter((tx) => tx.created_at.startsWith(yesterdayStr))
    .reduce((sum, tx) => sum + tx.amount, 0);

  const balanceChange = yesterdayVolume > 0 ? ((todayVolume - yesterdayVolume) / yesterdayVolume) * 100 : 0;
  const volumeChange = yesterdayVolume > 0 ? ((todayVolume - yesterdayVolume) / yesterdayVolume) * 100 : 0;

  const pendingTransactions = filteredTransactions.filter((tx) => ['pending', 'processing'].includes(tx.status));
  const pendingAmount = pendingTransactions.reduce((sum, tx) => sum + tx.amount, 0);
  const completedAmount = filteredTransactions
    .filter((tx) => tx.status === 'completed')
    .reduce((sum, tx) => sum + tx.amount, 0);
  const pendingChange = completedAmount > 0 ? ((pendingAmount - completedAmount) / completedAmount) * 100 : 0;

  const providers = [...new Set(filteredTransactions.map((tx) => tx.provider))];
  const firstName = profile?.display_name?.split(' ')[0] || 'there';

  const cardVariants = {
    hidden: { opacity: 0, y: 16 },
    visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.06, duration: 0.35 } }),
  };

  return (
    <AppLayout>
      <motion.div
        className="mb-6 flex items-center justify-between flex-wrap gap-4"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div>
          <h1 className="font-heading text-3xl font-extrabold tracking-tight text-foreground">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Hi, {firstName}! Here's an overview of your account.
          </p>
        </div>
      </motion.div>

      {/* Filter bar */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Filter className="h-4 w-4" />
          <span>Filters:</span>
        </div>
        <Select value={providerFilter} onValueChange={setProviderFilter}>
          <SelectTrigger className="w-[140px] h-8 text-xs bg-card border-border">
            <SelectValue placeholder="Provider" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Providers</SelectItem>
            {allProviders.map((p) => (
              <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[130px] h-8 text-xs bg-card border-border">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="processing">Processing</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="refunded">Refunded</SelectItem>
          </SelectContent>
        </Select>
        <CurrencySelector value={currencyFilter} onValueChange={setCurrencyFilter} />
        <PeriodSelector value={dateRange} onValueChange={setDateRange} />
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 text-xs gap-1">
            <X className="h-3 w-3" />
            Clear
          </Button>
        )}
        {hasActiveFilters && (
          <Badge variant="secondary" className="text-xs">
            {filteredTransactions.length} of {transactions.length} transactions
          </Badge>
        )}
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-6">
        {[
          {
            title: 'Total Balance',
            value: loadingAccounts ? '...' : formatCurrency(totalBalance, 'USD'),
            change: balanceChange !== 0 ? `${balanceChange > 0 ? '+' : ''}${balanceChange.toFixed(1)}%` : undefined,
            changeType: (balanceChange > 0 ? 'positive' : balanceChange < 0 ? 'negative' : 'neutral') as
              | 'positive'
              | 'negative'
              | 'neutral',
            icon: DollarSign,
            subtitle: 'Across all currencies',
          },
          {
            title: "Today's Volume",
            value: loadingTx ? '...' : formatCurrency(todayVolume, 'USD'),
            change: volumeChange !== 0 ? `${volumeChange > 0 ? '+' : ''}${volumeChange.toFixed(1)}%` : undefined,
            changeType: (volumeChange > 0 ? 'positive' : volumeChange < 0 ? 'negative' : 'neutral') as
              | 'positive'
              | 'negative'
              | 'neutral',
            icon: ArrowUpRight,
            subtitle: `${todayTransactions.length} transactions`,
          },
          {
            title: 'Active Providers',
            value: loadingTx ? '...' : providers.length.toString(),
            icon: ArrowLeftRight,
            subtitle: providers.join(' · ') || 'No providers yet',
          },
          {
            title: 'Customers',
            value: customerCount.toString(),
            icon: Users,
            subtitle: 'Total customers',
          },
          {
            title: 'Pending Settlement',
            value: loadingTx ? '...' : formatCurrency(pendingAmount, 'USD'),
            change: pendingChange !== 0 ? `${pendingChange > 0 ? '+' : ''}${pendingChange.toFixed(1)}%` : undefined,
            changeType: (pendingChange < 0 ? 'positive' : pendingChange > 0 ? 'negative' : 'neutral') as
              | 'positive'
              | 'negative'
              | 'neutral',
            icon: Clock,
            subtitle: `${pendingTransactions.length} transactions`,
          },
        ].map((card, i) => (
          <motion.div key={card.title} custom={i} variants={cardVariants} initial="hidden" animate="visible">
            <StatCard {...card} />
          </motion.div>
        ))}
      </div>

      <motion.div
        className="mb-6"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
      >
        <Tabs defaultValue="volume">
          <TabsList>
            <TabsTrigger value="volume">Volume Chart</TabsTrigger>
            <TabsTrigger value="providers">Provider Analytics</TabsTrigger>
          </TabsList>
          <TabsContent value="volume" className="mt-4">
            <VolumeChart />
          </TabsContent>
          <TabsContent value="providers" className="mt-4">
            <ProviderAnalytics />
          </TabsContent>
        </Tabs>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-heading text-xl font-bold text-foreground">Recent Transactions</h2>
          <a href="/transactions" className="text-sm font-semibold text-primary hover:underline">
            View all →
          </a>
        </div>
        {loadingTx ? (
          <div className="flex items-center justify-center p-8 rounded-2xl border border-border bg-card shadow-card">
            <p className="text-muted-foreground">Loading transactions...</p>
          </div>
        ) : (
          <TransactionTable transactions={filteredTransactions.slice(0, 5)} compact />
        )}
      </motion.div>
    </AppLayout>
  );
};

export default Index;
