import { AppLayout } from '@/components/AppLayout';
import { StatCard } from '@/components/StatCard';
import { BarChart3, TrendingUp, Clock, AlertCircle } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend,
} from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

function useProcessorAnalytics() {
  return useQuery({
    queryKey: ['processor-analytics'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const { data: merchant } = await supabase
        .from('merchants').select('id').eq('user_id', user.id).maybeSingle();
      if (!merchant) return null;

      const [{ data: attempts }] = await Promise.all([
        (supabase.from as any)('payment_attempts')
          .select('provider, status, latency_ms, response_code, response_message, created_at')
          .order('created_at', { ascending: false })
          .limit(1000),
      ]);

      const list = attempts || [];

      // Per-provider stats
      const stats: Record<string, { total: number; success: number; latencySum: number; buckets: Record<string, number> }> = {};
      const bucketCounts: Record<string, Record<string, number>> = {};

      list.forEach((a: any) => {
        const p = a.provider || 'unknown';
        stats[p] = stats[p] || { total: 0, success: 0, latencySum: 0, buckets: {} };
        stats[p].total++;
        if (a.status === 'success' || a.status === 'completed') stats[p].success++;
        stats[p].latencySum += a.latency_ms || 0;
        const hour = new Date(a.created_at).getHours();
        const bucket = `${String(Math.floor(hour / 4) * 4).padStart(2, '0')}:00`;
        stats[p].buckets[bucket] = (stats[p].buckets[bucket] || 0) + (a.latency_ms || 0);
        bucketCounts[p] = bucketCounts[p] || {};
        bucketCounts[p][bucket] = (bucketCounts[p][bucket] || 0) + 1;
      });

      const providers = Object.keys(stats);
      const authRateData = providers.map((p) => ({
        processor: p,
        rate: stats[p].total ? Number(((stats[p].success / stats[p].total) * 100).toFixed(1)) : 0,
        decline: stats[p].total ? Number((((stats[p].total - stats[p].success) / stats[p].total) * 100).toFixed(1)) : 0,
      }));

      const allBuckets = ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00'];
      const latencyData = allBuckets.map((bucket) => {
        const row: any = { time: bucket };
        providers.forEach((p) => {
          const count = bucketCounts[p]?.[bucket] || 1;
          row[p] = Math.round((stats[p].buckets[bucket] || 0) / count);
        });
        return row;
      });

      const declineMap: Record<string, number> = {};
      list.forEach((a: any) => {
        if (a.status !== 'success' && a.status !== 'completed') {
          const reason = a.response_message || a.response_code || 'Unknown';
          declineMap[reason] = (declineMap[reason] || 0) + 1;
        }
      });
      const totalDeclines = Object.values(declineMap).reduce((s, v) => s + v, 0);
      const declineReasons = Object.entries(declineMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([reason, count]) => ({
          reason,
          count,
          pct: totalDeclines > 0 ? `${Math.round((count / totalDeclines) * 100)}%` : '0%',
        }));

      const totalAttempts = list.length;
      const totalSuccess = list.filter((a: any) => a.status === 'success' || a.status === 'completed').length;
      const avgRate = totalAttempts > 0 ? ((totalSuccess / totalAttempts) * 100).toFixed(1) : '0';
      const avgLatency = totalAttempts > 0
        ? Math.round(list.reduce((s: number, a: any) => s + (a.latency_ms || 0), 0) / totalAttempts)
        : 0;

      return { avgRate, totalDeclines, avgLatency, authRateData, latencyData, declineReasons, providers };
    },
  });
}

const chartColors = [
  'hsl(var(--primary))',
  'hsl(152 60% 40%)',
  'hsl(38 92% 50%)',
  'hsl(280 60% 50%)',
  'hsl(200 70% 50%)',
];

export default function ProcessorAnalyticsPage() {
  const { data } = useProcessorAnalytics();

  return (
    <AppLayout>
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">Processor Analytics</h1>
        <p className="mt-1 text-sm text-muted-foreground">Performance metrics across all connected processors</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <StatCard title="Avg. Auth Rate" value={`${data?.avgRate || 0}%`} icon={TrendingUp} />
        <StatCard title="Total Declines" value={String(data?.totalDeclines || 0)} icon={AlertCircle} />
        <StatCard title="Avg. Latency" value={`${data?.avgLatency || 0}ms`} icon={Clock} />
        <StatCard title="Processors" value={String(data?.providers?.length || 0)} icon={BarChart3} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="text-lg font-semibold mb-6">Authorization Rate by Processor</h3>
          {(data?.authRateData || []).length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data?.authRateData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="processor" className="text-muted-foreground" fontSize={12} />
                <YAxis domain={[0, 100]} className="text-muted-foreground" fontSize={12} tickFormatter={(v) => `${v}%`} />
                <Tooltip formatter={(value: number) => [`${value}%`]} />
                <Bar dataKey="rate" fill="hsl(152 60% 40%)" radius={[4, 4, 0, 0]} name="Auth Rate" />
                <Bar dataKey="decline" fill="hsl(0 72% 51%)" radius={[4, 4, 0, 0]} name="Decline Rate" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-muted-foreground text-center py-12">No payment attempt data yet</p>
          )}
        </div>

        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="text-lg font-semibold mb-6">Response Latency (ms)</h3>
          {(data?.latencyData || []).length > 0 && (data?.providers || []).length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data?.latencyData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="time" className="text-muted-foreground" fontSize={12} />
                <YAxis className="text-muted-foreground" fontSize={12} />
                <Tooltip />
                <Legend />
                {(data?.providers || []).map((p, i) => (
                  <Line key={p} type="monotone" dataKey={p} stroke={chartColors[i % chartColors.length]} strokeWidth={2} dot={false} name={p} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-muted-foreground text-center py-12">No latency data yet</p>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="text-lg font-semibold mb-6">Top Decline Reasons</h3>
        {(data?.declineReasons || []).length === 0 ? (
          <p className="text-muted-foreground text-center py-8">No declines recorded</p>
        ) : (
          <div className="space-y-3">
            {(data?.declineReasons || []).map((r: any) => (
              <div key={r.reason} className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">{r.reason}</span>
                    <span className="text-sm text-muted-foreground">{r.count.toLocaleString()} ({r.pct})</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full bg-primary" style={{ width: r.pct }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
