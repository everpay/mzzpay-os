import { useState, useMemo, useCallback } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { useTransactions } from '@/hooks/useTransactions';
import { useAccounts } from '@/hooks/useAccounts';
import { useDisputes } from '@/hooks/useDisputes';
import { useSubscriptions } from '@/hooks/useSubscriptions';
import { formatCurrency } from '@/lib/format';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
  ComposedChart,
} from 'recharts';
import {
  TrendingUp, TrendingDown, DollarSign, ArrowLeftRight, Users, ShieldAlert,
  CalendarIcon, Download, Filter, BarChart3, PieChart as PieChartIcon, Activity,
  Globe, CreditCard, RefreshCw, Layers, FileText, FileDown,
} from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const CHART_COLORS = [
  'hsl(172, 72%, 48%)',
  'hsl(217, 91%, 60%)',
  'hsl(262, 83%, 58%)',
  'hsl(24, 95%, 53%)',
  'hsl(340, 82%, 52%)',
  'hsl(48, 96%, 53%)',
];

type DateRange = '7d' | '30d' | '90d' | '12m' | 'custom';

export default function Analytics() {
  const [dateRange, setDateRange] = useState<DateRange>('30d');
  const [customFrom, setCustomFrom] = useState<Date | undefined>();
  const [customTo, setCustomTo] = useState<Date | undefined>();
  const { data: transactions = [], isLoading: loadingTx } = useTransactions();
  const { data: accounts = [] } = useAccounts();
  const { data: disputes = [] } = useDisputes();
  const { data: subscriptions = [] } = useSubscriptions();

  const getDaysForRange = (range: DateRange) => {
    switch (range) {
      case '7d': return 7;
      case '30d': return 30;
      case '90d': return 90;
      case '12m': return 365;
      case 'custom': return 0;
    }
  };

  const filteredTransactions = useMemo(() => {
    if (dateRange === 'custom' && customFrom) {
      const from = customFrom;
      const to = customTo || new Date();
      return transactions.filter(tx => {
        const d = new Date(tx.created_at);
        return d >= from && d <= to;
      });
    }
    const days = getDaysForRange(dateRange);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    return transactions.filter(tx => new Date(tx.created_at) >= cutoff);
  }, [transactions, dateRange, customFrom, customTo]);

  // KPI calculations
  const totalVolume = filteredTransactions.reduce((s, tx) => s + tx.amount, 0);
  const completedTx = filteredTransactions.filter(tx => tx.status === 'completed');
  const successRate = filteredTransactions.length > 0
    ? (completedTx.length / filteredTransactions.length * 100)
    : 0;
  const avgTicket = completedTx.length > 0
    ? completedTx.reduce((s, tx) => s + tx.amount, 0) / completedTx.length
    : 0;

  // Previous period comparison
  const days = getDaysForRange(dateRange);
  const prevCutoff = new Date();
  prevCutoff.setDate(prevCutoff.getDate() - days * 2);
  const currentCutoff = new Date();
  currentCutoff.setDate(currentCutoff.getDate() - days);
  const prevTransactions = dateRange !== 'custom' ? transactions.filter(tx => {
    const d = new Date(tx.created_at);
    return d >= prevCutoff && d < currentCutoff;
  }) : [];
  const prevVolume = prevTransactions.reduce((s, tx) => s + tx.amount, 0);
  const volumeChange = prevVolume > 0 ? ((totalVolume - prevVolume) / prevVolume * 100) : 0;

  // Volume over time
  const volumeOverTime = useMemo(() => {
    const buckets: Record<string, { volume: number; count: number; failed: number }> = {};
    const numDays = dateRange === 'custom'
      ? (customFrom && customTo ? Math.ceil((customTo.getTime() - customFrom.getTime()) / 86400000) : 30)
      : getDaysForRange(dateRange);
    const bucketSize = numDays <= 7 ? 1 : numDays <= 30 ? 1 : numDays <= 90 ? 7 : 30;

    for (let i = numDays - 1; i >= 0; i -= bucketSize) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      buckets[key] = { volume: 0, count: 0, failed: 0 };
    }

    filteredTransactions.forEach(tx => {
      const d = new Date(tx.created_at);
      const key = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      if (buckets[key]) {
        buckets[key].volume += tx.amount;
        buckets[key].count += 1;
        if (tx.status === 'failed') buckets[key].failed += 1;
      }
    });

    return Object.entries(buckets).map(([date, data]) => ({ date, ...data }));
  }, [filteredTransactions, dateRange, customFrom, customTo]);

  // Provider breakdown
  const providerBreakdown = useMemo(() => {
    const map: Record<string, { volume: number; count: number }> = {};
    filteredTransactions.forEach(tx => {
      if (!map[tx.provider]) map[tx.provider] = { volume: 0, count: 0 };
      map[tx.provider].volume += tx.amount;
      map[tx.provider].count += 1;
    });
    return Object.entries(map)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.volume - a.volume);
  }, [filteredTransactions]);

  // Status distribution
  const statusDistribution = useMemo(() => {
    const map: Record<string, number> = {};
    filteredTransactions.forEach(tx => {
      map[tx.status] = (map[tx.status] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [filteredTransactions]);

  // Currency breakdown
  const currencyBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    filteredTransactions.forEach(tx => {
      map[tx.currency] = (map[tx.currency] || 0) + tx.amount;
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredTransactions]);

  // Hourly heatmap data
  const hourlyData = useMemo(() => {
    const hours = Array.from({ length: 24 }, (_, i) => ({ hour: `${i.toString().padStart(2, '0')}:00`, count: 0, volume: 0 }));
    filteredTransactions.forEach(tx => {
      const h = new Date(tx.created_at).getHours();
      hours[h].count += 1;
      hours[h].volume += tx.amount;
    });
    return hours;
  }, [filteredTransactions]);

  // Daily success rate trend
  const successRateTrend = useMemo(() => {
    const buckets: Record<string, { total: number; success: number }> = {};
    filteredTransactions.forEach(tx => {
      const key = new Date(tx.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      if (!buckets[key]) buckets[key] = { total: 0, success: 0 };
      buckets[key].total += 1;
      if (tx.status === 'completed') buckets[key].success += 1;
    });
    return Object.entries(buckets).map(([date, data]) => ({
      date,
      rate: data.total > 0 ? Math.round(data.success / data.total * 100) : 0,
    }));
  }, [filteredTransactions]);

  // Export functions
  const exportCSV = useCallback(() => {
    const headers = ['ID', 'Date', 'Amount', 'Currency', 'Status', 'Provider', 'Customer Email', 'Description'];
    const rows = filteredTransactions.map(tx => [
      tx.id,
      new Date(tx.created_at).toISOString(),
      tx.amount.toString(),
      tx.currency,
      tx.status,
      tx.provider,
      tx.customer_email || '',
      tx.description || '',
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-export-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [filteredTransactions]);

  const exportPDF = useCallback(() => {
    // Generate a printable HTML report
    const reportHtml = `
      <html><head><title>Analytics Report - ${format(new Date(), 'PPP')}</title>
      <style>
        body { font-family: system-ui, sans-serif; padding: 40px; color: #1a1a1a; }
        h1 { font-size: 24px; margin-bottom: 4px; }
        .subtitle { color: #666; font-size: 14px; margin-bottom: 24px; }
        table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 13px; }
        th, td { padding: 8px 12px; border-bottom: 1px solid #e5e5e5; text-align: left; }
        th { background: #f5f5f5; font-weight: 600; }
        .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px; }
        .kpi-card { border: 1px solid #e5e5e5; border-radius: 8px; padding: 16px; }
        .kpi-label { font-size: 11px; text-transform: uppercase; color: #888; }
        .kpi-value { font-size: 22px; font-weight: 700; margin-top: 4px; }
      </style></head><body>
      <h1>MZZPay Analytics Report</h1>
      <p class="subtitle">Generated ${format(new Date(), 'PPP')} · ${dateRange === 'custom' ? `${customFrom ? format(customFrom, 'PP') : ''} – ${customTo ? format(customTo, 'PP') : 'now'}` : `Last ${dateRange}`}</p>
      <div class="kpi-grid">
        <div class="kpi-card"><div class="kpi-label">Total Volume</div><div class="kpi-value">${formatCurrency(totalVolume, 'USD')}</div></div>
        <div class="kpi-card"><div class="kpi-label">Transactions</div><div class="kpi-value">${filteredTransactions.length}</div></div>
        <div class="kpi-card"><div class="kpi-label">Success Rate</div><div class="kpi-value">${successRate.toFixed(1)}%</div></div>
        <div class="kpi-card"><div class="kpi-label">Avg Ticket</div><div class="kpi-value">${formatCurrency(avgTicket, 'USD')}</div></div>
      </div>
      <h2>Provider Breakdown</h2>
      <table><tr><th>Provider</th><th>Volume</th><th>Transactions</th><th>Share</th></tr>
      ${providerBreakdown.map(p => `<tr><td>${p.name}</td><td>${formatCurrency(p.volume, 'USD')}</td><td>${p.count}</td><td>${totalVolume > 0 ? (p.volume / totalVolume * 100).toFixed(1) : 0}%</td></tr>`).join('')}
      </table>
      <h2>Currency Breakdown</h2>
      <table><tr><th>Currency</th><th>Volume</th><th>Share</th></tr>
      ${currencyBreakdown.map(c => `<tr><td>${c.name}</td><td>$${c.value.toLocaleString()}</td><td>${totalVolume > 0 ? (c.value / totalVolume * 100).toFixed(1) : 0}%</td></tr>`).join('')}
      </table>
      <h2>Transactions</h2>
      <table><tr><th>Date</th><th>Amount</th><th>Currency</th><th>Status</th><th>Provider</th></tr>
      ${filteredTransactions.slice(0, 100).map(tx => `<tr><td>${format(new Date(tx.created_at), 'PP p')}</td><td>${tx.amount}</td><td>${tx.currency}</td><td>${tx.status}</td><td>${tx.provider}</td></tr>`).join('')}
      ${filteredTransactions.length > 100 ? `<tr><td colspan="5" style="text-align:center;color:#888">... and ${filteredTransactions.length - 100} more</td></tr>` : ''}
      </table>
      </body></html>
    `;
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(reportHtml);
      win.document.close();
      setTimeout(() => win.print(), 500);
    }
  }, [filteredTransactions, dateRange, customFrom, customTo, totalVolume, successRate, avgTicket, providerBreakdown, currencyBreakdown]);

  const isLoading = loadingTx;

  const tooltipStyle = {
    backgroundColor: 'hsl(var(--card))',
    border: '1px solid hsl(var(--border))',
    borderRadius: '8px',
    fontSize: '12px',
    color: 'hsl(var(--foreground))',
  };

  const dateRangeLabel = dateRange === 'custom'
    ? (customFrom ? `${format(customFrom, 'MMM d')}${customTo ? ` – ${format(customTo, 'MMM d')}` : ' – now'}` : 'Custom')
    : undefined;

  return (
    <AppLayout>
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">Analytics</h1>
          <p className="mt-1 text-sm text-muted-foreground">Business intelligence & reporting dashboard</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Date range presets */}
          <Select value={dateRange} onValueChange={(v) => setDateRange(v as DateRange)}>
            <SelectTrigger className="w-[150px]">
              <CalendarIcon className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
              <SelectValue>{dateRangeLabel}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="12m">Last 12 months</SelectItem>
              <SelectItem value="custom">Custom range</SelectItem>
            </SelectContent>
          </Select>

          {/* Custom date pickers */}
          {dateRange === 'custom' && (
            <div className="flex items-center gap-1.5">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className={cn("text-xs h-9", !customFrom && "text-muted-foreground")}>
                    <CalendarIcon className="h-3 w-3 mr-1.5" />
                    {customFrom ? format(customFrom, 'PP') : 'From'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={customFrom} onSelect={setCustomFrom} initialFocus className={cn("p-3 pointer-events-auto")} />
                </PopoverContent>
              </Popover>
              <span className="text-xs text-muted-foreground">–</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className={cn("text-xs h-9", !customTo && "text-muted-foreground")}>
                    <CalendarIcon className="h-3 w-3 mr-1.5" />
                    {customTo ? format(customTo, 'PP') : 'To'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={customTo} onSelect={setCustomTo} initialFocus className={cn("p-3 pointer-events-auto")} />
                </PopoverContent>
              </Popover>
            </div>
          )}

          {/* Export dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 gap-1.5">
                <Download className="h-3.5 w-3.5" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={exportCSV} className="gap-2">
                <FileDown className="h-4 w-4" /> Export CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={exportPDF} className="gap-2">
                <FileText className="h-4 w-4" /> Export PDF Report
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KPICard title="Total Volume" value={formatCurrency(totalVolume, 'USD')} change={dateRange !== 'custom' ? volumeChange : undefined} icon={DollarSign} />
        <KPICard
          title="Transactions"
          value={filteredTransactions.length.toLocaleString()}
          change={dateRange !== 'custom' && prevTransactions.length > 0 ? ((filteredTransactions.length - prevTransactions.length) / prevTransactions.length * 100) : undefined}
          icon={ArrowLeftRight}
        />
        <KPICard title="Success Rate" value={`${successRate.toFixed(1)}%`} icon={Activity} neutral />
        <KPICard title="Avg. Ticket" value={formatCurrency(avgTicket, 'USD')} icon={CreditCard} neutral />
      </div>

      {/* Main Charts */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="overview" className="gap-1.5"><BarChart3 className="h-3.5 w-3.5" /> Overview</TabsTrigger>
          <TabsTrigger value="providers" className="gap-1.5"><Layers className="h-3.5 w-3.5" /> Providers</TabsTrigger>
          <TabsTrigger value="geography" className="gap-1.5"><Globe className="h-3.5 w-3.5" /> Currencies</TabsTrigger>
          <TabsTrigger value="performance" className="gap-1.5"><Activity className="h-3.5 w-3.5" /> Performance</TabsTrigger>
        </TabsList>

        {/* OVERVIEW TAB */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-primary" /> Payment Volume
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">Loading...</div>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <ComposedChart data={volumeOverTime} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
                      <defs>
                        <linearGradient id="volGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={CHART_COLORS[0]} stopOpacity={0.25} />
                          <stop offset="100%" stopColor={CHART_COLORS[0]} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                      <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                      <Tooltip contentStyle={tooltipStyle} formatter={(value: number, name: string) => [name === 'volume' ? `$${value.toLocaleString()}` : value, name === 'volume' ? 'Volume' : name === 'count' ? 'Transactions' : 'Failed']} />
                      <Area type="monotone" dataKey="volume" stroke={CHART_COLORS[0]} strokeWidth={2} fill="url(#volGrad)" />
                      <Bar dataKey="failed" fill={CHART_COLORS[4]} radius={[2, 2, 0, 0]} barSize={8} opacity={0.7} />
                    </ComposedChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <PieChartIcon className="h-4 w-4 text-primary" /> Status Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">Loading...</div>
                ) : statusDistribution.length === 0 ? (
                  <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">No data</div>
                ) : (
                  <div>
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie data={statusDistribution} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={3}>
                          {statusDistribution.map((_, i) => (
                            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={tooltipStyle} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex flex-wrap gap-3 mt-2 justify-center">
                      {statusDistribution.map((entry, i) => (
                        <div key={entry.name} className="flex items-center gap-1.5 text-xs">
                          <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                          <span className="text-muted-foreground capitalize">{entry.name}</span>
                          <span className="font-medium text-foreground">{entry.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" /> Hourly Transaction Volume
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={hourlyData} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="hour" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} interval={2} />
                  <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="count" fill={CHART_COLORS[1]} radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* PROVIDERS TAB */}
        <TabsContent value="providers" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Volume by Provider</CardTitle>
              </CardHeader>
              <CardContent>
                {providerBreakdown.length === 0 ? (
                  <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">No data</div>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={providerBreakdown} layout="vertical" margin={{ top: 5, right: 5, left: 5, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} width={80} />
                      <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`$${v.toLocaleString()}`, 'Volume']} />
                      <Bar dataKey="volume" radius={[0, 4, 4, 0]}>
                        {providerBreakdown.map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Provider Share</CardTitle>
              </CardHeader>
              <CardContent>
                {providerBreakdown.length === 0 ? (
                  <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">No data</div>
                ) : (
                  <div>
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie data={providerBreakdown} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="volume" paddingAngle={3}>
                          {providerBreakdown.map((_, i) => (
                            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`$${v.toLocaleString()}`, 'Volume']} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-2 mt-2">
                      {providerBreakdown.map((p, i) => {
                        const pct = totalVolume > 0 ? (p.volume / totalVolume * 100).toFixed(1) : '0';
                        return (
                          <div key={p.name} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                              <span className="text-muted-foreground capitalize">{p.name}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-xs text-muted-foreground">{p.count} txns</span>
                              <Badge variant="outline" className="text-xs">{pct}%</Badge>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* CURRENCIES TAB */}
        <TabsContent value="geography" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Globe className="h-4 w-4 text-primary" /> Volume by Currency
                </CardTitle>
              </CardHeader>
              <CardContent>
                {currencyBreakdown.length === 0 ? (
                  <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">No data</div>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={currencyBreakdown} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                      <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`$${v.toLocaleString()}`, 'Volume']} />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                        {currencyBreakdown.map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Currency Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {currencyBreakdown.map((c, i) => {
                    const pct = totalVolume > 0 ? (c.value / totalVolume * 100) : 0;
                    return (
                      <div key={c.name} className="space-y-1.5">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium text-foreground">{c.name}</span>
                          <span className="text-muted-foreground">${c.value.toLocaleString()} ({pct.toFixed(1)}%)</span>
                        </div>
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${pct}%`, backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* PERFORMANCE TAB */}
        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Activity className="h-4 w-4 text-primary" /> Success Rate Trend
                </CardTitle>
              </CardHeader>
              <CardContent>
                {successRateTrend.length === 0 ? (
                  <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">No data</div>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={successRateTrend} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                      <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
                      <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v}%`, 'Success Rate']} />
                      <Line type="monotone" dataKey="rate" stroke={CHART_COLORS[0]} strokeWidth={2} dot={{ r: 3, fill: CHART_COLORS[0] }} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Key Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <MetricRow label="Total Volume" value={formatCurrency(totalVolume, 'USD')} />
                  <MetricRow label="Completed" value={completedTx.length.toLocaleString()} />
                  <MetricRow label="Failed" value={filteredTransactions.filter(tx => tx.status === 'failed').length.toLocaleString()} />
                  <MetricRow label="Pending" value={filteredTransactions.filter(tx => tx.status === 'pending').length.toLocaleString()} />
                  <MetricRow label="Success Rate" value={`${successRate.toFixed(1)}%`} />
                  <MetricRow label="Average Ticket" value={formatCurrency(avgTicket, 'USD')} />
                  <MetricRow label="Active Disputes" value={disputes.filter(d => d.status !== 'won' && d.status !== 'lost').length.toLocaleString()} />
                  <MetricRow label="Active Subscriptions" value={Array.isArray(subscriptions) ? subscriptions.filter((s: any) => s.status === 'active').length.toLocaleString() : '0'} />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
}

function KPICard({ title, value, change, icon: Icon, neutral }: {
  title: string;
  value: string;
  change?: number;
  icon: React.ElementType;
  neutral?: boolean;
}) {
  const isPositive = (change ?? 0) >= 0;
  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</span>
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon className="h-4 w-4 text-primary" />
          </div>
        </div>
        <p className="font-heading text-xl font-bold text-foreground">{value}</p>
        {!neutral && change !== undefined && (
          <div className={`flex items-center gap-1 mt-1 text-xs ${isPositive ? 'text-success' : 'text-destructive'}`}>
            {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            <span>{Math.abs(change).toFixed(1)}% vs prev period</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-semibold text-foreground">{value}</span>
    </div>
  );
}
