import { AppLayout } from '@/components/AppLayout';
import { AlertTriangle, TrendingUp, Shield, DollarSign } from 'lucide-react';
import { DisputeStatCard } from '@/components/dispute/DisputeStatCard';
import { DisputeTable } from '@/components/dispute/DisputeTable';
import { mockChargebacks, mockDisputes, mockMerchantStats } from '@/lib/dispute-mock-data';

export default function MerchantDashboard() {
  const merchantChargebacks = mockChargebacks.filter(cb => cb.merchant_id === 'merch_001');

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">Dispute Defense</h1>
          <p className="text-sm text-muted-foreground mt-1">Monitor your chargebacks and dispute performance</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <DisputeStatCard
            title="Open Disputes"
            value={mockMerchantStats.open_disputes}
            icon={AlertTriangle}
            variant="warning"
            trend={{ value: -12, label: 'vs last month' }}
          />
          <DisputeStatCard
            title="Win Rate"
            value={`${mockMerchantStats.win_rate}%`}
            icon={TrendingUp}
            variant="success"
            trend={{ value: 5, label: 'vs last month' }}
          />
          <DisputeStatCard
            title="Chargeback Rate"
            value={`${mockMerchantStats.chargeback_rate}%`}
            subtitle={mockMerchantStats.chargeback_rate > 1 ? '⚠ Above threshold' : 'Within safe range'}
            icon={Shield}
            variant={mockMerchantStats.chargeback_rate > 1 ? 'destructive' : 'default'}
          />
          <DisputeStatCard
            title="Recovered"
            value={`€${mockMerchantStats.total_recovered.toLocaleString()}`}
            subtitle={`of €${mockMerchantStats.total_amount_disputed.toLocaleString()} disputed`}
            icon={DollarSign}
            variant="success"
          />
        </div>

        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">Recent Chargebacks</h2>
          <DisputeTable
            chargebacks={merchantChargebacks}
            disputes={mockDisputes}
            basePath="/merchant/disputes"
          />
        </div>
      </div>
    </AppLayout>
  );
}