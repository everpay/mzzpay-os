import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTransactions } from '@/hooks/useTransactions';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { getProviderColor } from '@/lib/providers';
import { formatCurrency } from '@/lib/format';

export function ProviderAnalytics() {
  const { data: transactions = [] } = useTransactions();

  // Group by provider
  const providerMap = transactions.reduce((acc, tx) => {
    const provider = tx.provider || 'unknown';
    if (!acc[provider]) acc[provider] = { count: 0, volume: 0 };
    acc[provider].count += 1;
    acc[provider].volume += tx.amount;
    return acc;
  }, {} as Record<string, { count: number; volume: number }>);

  const data = Object.entries(providerMap).map(([provider, stats]) => ({
    name: provider.charAt(0).toUpperCase() + provider.slice(1),
    value: stats.volume,
    count: stats.count,
    fill: getProviderColor(provider as any),
  }));

  // Group by status
  const statusMap = transactions.reduce((acc, tx) => {
    if (!acc[tx.status]) acc[tx.status] = 0;
    acc[tx.status] += 1;
    return acc;
  }, {} as Record<string, number>);

  const statusData = Object.entries(statusMap).map(([status, count]) => ({
    name: status.charAt(0).toUpperCase() + status.slice(1),
    value: count,
    fill: status === 'completed' ? 'hsl(var(--chart-1))' :
          status === 'pending' ? 'hsl(var(--chart-3))' :
          status === 'failed' ? 'hsl(var(--destructive))' :
          status === 'processing' ? 'hsl(var(--chart-4))' :
          'hsl(var(--chart-5))',
  }));

  if (transactions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Provider Analytics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
            No transaction data available yet
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Volume by Provider</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => formatCurrency(value, 'USD')}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    color: 'hsl(var(--foreground))',
                  }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 space-y-2">
            {data.map((item) => (
              <div key={item.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full" style={{ backgroundColor: item.fill }} />
                  <span className="text-muted-foreground">{item.name}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-muted-foreground">{item.count} txns</span>
                  <span className="font-medium">{formatCurrency(item.value, 'USD')}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Transaction Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    color: 'hsl(var(--foreground))',
                  }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 space-y-2">
            {statusData.map((item) => (
              <div key={item.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full" style={{ backgroundColor: item.fill }} />
                  <span className="text-muted-foreground">{item.name}</span>
                </div>
                <span className="font-medium">{item.value} transactions</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
