import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { useTransactions } from '@/hooks/useTransactions';
import { useMemo } from 'react';

export function VolumeChart() {
  const { data: transactions = [], isLoading } = useTransactions();

  // Calculate volume data for the last 7 days
  const volumeData = useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      return date.toISOString().split('T')[0];
    });

    return last7Days.map((date) => {
      const dayTransactions = transactions.filter(tx => tx.created_at.startsWith(date));
      const volume = dayTransactions.reduce((sum, tx) => sum + tx.amount, 0);
      return {
        date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        volume,
        count: dayTransactions.length,
      };
    });
  }, [transactions]);

  const totalVolume = volumeData.reduce((sum, day) => sum + day.volume, 0);

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border bg-card p-5 shadow-card animate-fade-in">
        <div className="flex items-center justify-center p-12">
          <p className="text-muted-foreground">Loading chart...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-card animate-fade-in">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="font-heading text-sm font-semibold text-foreground">Payment Volume</h3>
          <p className="text-xs text-muted-foreground">Last 7 days</p>
        </div>
        <div className="text-right">
          <p className="font-heading text-lg font-bold text-foreground">$414,000</p>
          <p className="text-xs text-success">+12.4%</p>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={mockVolumeData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="volumeGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(172, 72%, 48%)" stopOpacity={0.3} />
              <stop offset="100%" stopColor="hsl(172, 72%, 48%)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 18%, 18%)" vertical={false} />
          <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'hsl(215, 15%, 52%)' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: 'hsl(215, 15%, 52%)' }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v / 1000}k`} />
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(220, 22%, 10%)',
              border: '1px solid hsl(220, 18%, 18%)',
              borderRadius: '8px',
              fontSize: '12px',
              color: 'hsl(210, 20%, 92%)',
            }}
            formatter={(value: number) => [`$${value.toLocaleString()}`, 'Volume']}
          />
          <Area type="monotone" dataKey="volume" stroke="hsl(172, 72%, 48%)" strokeWidth={2} fill="url(#volumeGradient)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
