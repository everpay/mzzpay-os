import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Users, DollarSign, XCircle, Activity } from 'lucide-react';
import { formatCurrency } from '@/lib/format';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface SubscriptionAnalyticsProps {
  subscriptions: any[];
  plans: any[];
}

export function SubscriptionAnalytics({ subscriptions = [], plans = [] }: SubscriptionAnalyticsProps) {
  const metrics = useMemo(() => {
    const active = subscriptions.filter((s) => s.status === 'active');
    const canceled = subscriptions.filter((s) => s.status === 'canceled');
    const pastDue = subscriptions.filter((s) => s.status === 'past_due');

    // MRR: normalize all active subscriptions to monthly
    const mrr = active.reduce((sum, sub) => {
      const amount = sub.plan?.amount ?? 0;
      const interval = sub.plan?.interval ?? 'month';
      return sum + (interval === 'year' ? amount / 12 : amount);
    }, 0);

    // ARR
    const arr = mrr * 12;

    // Churn rate (canceled / total who ever started)
    const churnRate = subscriptions.length > 0 ? (canceled.length / subscriptions.length) * 100 : 0;

    // Avg revenue per user
    const arpu = active.length > 0 ? mrr / active.length : 0;

    // Growth data: group subscriptions by month created
    const now = new Date();
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      return {
        label: d.toLocaleDateString('en-US', { month: 'short' }),
        year: d.getFullYear(),
        month: d.getMonth(),
      };
    });

    const growthData = months.map(({ label, year, month }) => {
      const monthActive = subscriptions.filter((s) => {
        const created = new Date(s.created_at);
        return created.getFullYear() === year && created.getMonth() === month && s.status === 'active';
      }).length;
      const monthRevenue = subscriptions.filter((s) => {
        const created = new Date(s.created_at);
        return created.getFullYear() === year && created.getMonth() === month;
      }).reduce((sum, sub) => {
        const amount = sub.plan?.amount ?? 0;
        const interval = sub.plan?.interval ?? 'month';
        return sum + (interval === 'year' ? amount / 12 : amount);
      }, 0);
      return { month: label, subscribers: monthActive, mrr: monthRevenue };
    });

    return { mrr, arr, churnRate, arpu, active: active.length, canceled: canceled.length, pastDue: pastDue.length, growthData };
  }, [subscriptions]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard
          title="MRR"
          value={formatCurrency(metrics.mrr, 'USD')}
          icon={DollarSign}
          trend="up"
          subtitle="Monthly recurring"
        />
        <MetricCard
          title="ARR"
          value={formatCurrency(metrics.arr, 'USD')}
          icon={TrendingUp}
          trend="up"
          subtitle="Annualized revenue"
        />
        <MetricCard
          title="Active Subs"
          value={metrics.active.toString()}
          icon={Users}
          trend={metrics.active > 0 ? 'up' : 'neutral'}
          subtitle={`${metrics.pastDue} past due`}
        />
        <MetricCard
          title="Churn Rate"
          value={`${metrics.churnRate.toFixed(1)}%`}
          icon={XCircle}
          trend={metrics.churnRate > 5 ? 'down' : 'up'}
          subtitle={`${metrics.canceled} canceled`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Activity className="h-4 w-4" />
              MRR Growth (6 months)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={140}>
              <AreaChart data={metrics.growthData}>
                <defs>
                  <linearGradient id="mrrGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip
                  contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
                  formatter={(v: number) => [formatCurrency(v, 'USD'), 'MRR']}
                />
                <Area type="monotone" dataKey="mrr" stroke="hsl(var(--primary))" fill="url(#mrrGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" />
              Subscriber Growth (6 months)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={140}>
              <AreaChart data={metrics.growthData}>
                <defs>
                  <linearGradient id="subGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip
                  contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
                  formatter={(v: number) => [v, 'Subscribers']}
                />
                <Area type="monotone" dataKey="subscribers" stroke="hsl(var(--chart-2))" fill="url(#subGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MetricCard({
  title, value, icon: Icon, trend, subtitle
}: { title: string; value: string; icon: React.ElementType; trend: 'up' | 'down' | 'neutral'; subtitle: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-muted-foreground">{title}</span>
          <div className={`flex h-7 w-7 items-center justify-center rounded-md ${
            trend === 'up' ? 'bg-primary/10' : trend === 'down' ? 'bg-destructive/10' : 'bg-muted'
          }`}>
            <Icon className={`h-3.5 w-3.5 ${
              trend === 'up' ? 'text-primary' : trend === 'down' ? 'text-destructive' : 'text-muted-foreground'
            }`} />
          </div>
        </div>
        <p className="font-heading text-xl font-bold text-foreground">{value}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
      </CardContent>
    </Card>
  );
}
