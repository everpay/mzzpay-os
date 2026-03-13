import { AppLayout } from "@/components/AppLayout";
import { StatCard } from "@/components/StatCard";
import { RollingReserveCard } from "@/components/RollingReserveCard";
import { CardVelocityCard } from "@/components/CardVelocityCard";
import { VolumeChart } from "@/components/VolumeChart";
import { TransactionTable } from "@/components/TransactionTable";
import { ActivityFeed } from "@/components/ActivityFeed";
import { ProviderAnalytics } from "@/components/ProviderAnalytics";
import { useTransactions } from "@/hooks/useTransactions";
import { useAccounts } from "@/hooks/useAccounts";
import { useProfile } from "@/hooks/useProfile";
import { formatCurrency } from "@/lib/format";
import { DollarSign, ArrowUpRight, ArrowLeftRight, Clock } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const Index = () => {
  const { data: transactions = [], isLoading: loadingTx } = useTransactions();
  const { data: accounts = [], isLoading: loadingAccounts } = useAccounts();
  const { data: profile } = useProfile();

  // Calculate total balance across all currencies (simplified conversion)
  const rates: Record<string, number> = {
    USD: 1,
    EUR: 1.08,
    GBP: 1.27,
    BRL: 0.195,
    MXN: 0.057,
    COP: 0.00024,
    CAD: 0.74,
  };
  const totalBalance = accounts.reduce((sum, a) => {
    return sum + a.balance * (rates[a.currency] || 1);
  }, 0);

  // Calculate yesterday's balance
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split("T")[0];

  const yesterdayTransactions = transactions.filter((tx) => tx.created_at.startsWith(yesterdayStr));
  const yesterdayVolume = yesterdayTransactions.reduce((sum, tx) => sum + tx.amount, 0);

  // Calculate today's transactions
  const today = new Date().toISOString().split("T")[0];
  const todayTransactions = transactions.filter((tx) => tx.created_at.startsWith(today));
  const todayVolume = todayTransactions.reduce((sum, tx) => sum + tx.amount, 0);

  // Calculate percentage changes
  const balanceChange = yesterdayVolume > 0 ? ((todayVolume - yesterdayVolume) / yesterdayVolume) * 100 : 0;
  const volumeChange = yesterdayVolume > 0 ? ((todayVolume - yesterdayVolume) / yesterdayVolume) * 100 : 0;

  // Calculate pending settlement and its change
  const pendingTransactions = transactions.filter((tx) => ["pending", "processing"].includes(tx.status));
  const pendingAmount = pendingTransactions.reduce((sum, tx) => sum + tx.amount, 0);

  const completedTransactions = transactions.filter((tx) => tx.status === "completed");
  const completedAmount = completedTransactions.reduce((sum, tx) => sum + tx.amount, 0);
  const pendingChange = completedAmount > 0 ? ((pendingAmount - completedAmount) / completedAmount) * 100 : 0;

  // Get unique providers
  const providers = [...new Set(transactions.map((tx) => tx.provider))];

  // Get first name
  const firstName = profile?.display_name?.split(" ")[0] || "there";

  return (
    <AppLayout>
      <div className="mb-8">
        <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">Hi, {firstName}! Here's an overview of your account</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <StatCard
          title="Total Balance"
          value={loadingAccounts ? "..." : formatCurrency(totalBalance, "USD")}
          change={balanceChange !== 0 ? `${balanceChange > 0 ? "+" : ""}${balanceChange.toFixed(1)}%` : undefined}
          changeType={balanceChange > 0 ? "positive" : balanceChange < 0 ? "negative" : "neutral"}
          icon={DollarSign}
          subtitle="Across all currencies"
        />
        <StatCard
          title="Today's Volume"
          value={loadingTx ? "..." : formatCurrency(todayVolume, "USD")}
          change={volumeChange !== 0 ? `${volumeChange > 0 ? "+" : ""}${volumeChange.toFixed(1)}%` : undefined}
          changeType={volumeChange > 0 ? "positive" : volumeChange < 0 ? "negative" : "neutral"}
          icon={ArrowUpRight}
          subtitle={`${todayTransactions.length} transactions`}
        />
        <StatCard
          title="Active Providers"
          value={loadingTx ? "..." : providers.length.toString()}
          icon={ArrowLeftRight}
          subtitle={providers.join(" · ") || "No providers yet"}
        />
        <StatCard
          title="Pending Settlement"
          value={loadingTx ? "..." : formatCurrency(pendingAmount, "USD")}
          change={pendingChange !== 0 ? `${pendingChange > 0 ? "+" : ""}${pendingChange.toFixed(1)}%` : undefined}
          changeType={pendingChange < 0 ? "positive" : pendingChange > 0 ? "negative" : "neutral"}
          icon={Clock}
          subtitle={`${pendingTransactions.length} transactions`}
        />
      </div>

      <div className="mb-6">
        <Tabs defaultValue="volume">
          <TabsList>
            <TabsTrigger value="volume">Volume Chart</TabsTrigger>
            <TabsTrigger value="providers">Provider Analytics</TabsTrigger>
          </TabsList>
          <TabsContent value="volume" className="mt-4">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <VolumeChart />
              </div>
              <div className="space-y-4">
                <ActivityFeed />
                <RollingReserveCard />
                <CardVelocityCard />
              </div>
            </div>
          </TabsContent>
          <TabsContent value="providers" className="mt-4">
            <ProviderAnalytics />
          </TabsContent>
        </Tabs>
      </div>

      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-heading text-lg font-semibold text-foreground">Recent Transactions</h2>
          <a href="/transactions" className="text-sm text-primary hover:underline">
            View all →
          </a>
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
