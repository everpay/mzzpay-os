import { useMemo, useState } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/lib/format';
import { CheckCircle2, AlertTriangle, XCircle, Download, RefreshCw, Scale, TrendingUp, TrendingDown, FileText } from 'lucide-react';
import { exportPdf } from '@/lib/export-pdf';

export default function Reconciliation() {
  const { data: rows, isLoading, refetch } = useQuery({
    queryKey: ['reconciliation'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data: m } = await supabase.from('merchants').select('id').eq('user_id', user.id).single();
      if (!m) return [];
      const { data: txs } = await supabase.from('transactions').select('id, amount, currency, provider, status, settlement_amount, created_at').eq('merchant_id', m.id).in('status', ['completed', 'refunded']).order('created_at', { ascending: false }).limit(500);
      const groups = new Map<string, any>();
      (txs || []).forEach(t => {
        const date = t.created_at.split('T')[0];
        const k = `${t.provider}-${date}`;
        const g = groups.get(k) || { provider: t.provider, date, gross: 0, settled: 0, count: 0, currency: t.currency };
        g.gross += Number(t.amount); g.settled += Number(t.settlement_amount || t.amount); g.count += 1;
        groups.set(k, g);
      });
      return Array.from(groups.values()).map((g, i) => {
        const variance = g.settled - g.gross;
        const variancePct = g.gross > 0 ? (variance / g.gross) * 100 : 0;
        return { id: `r-${i}`, ...g, variance, variancePct, status: Math.abs(variance) < 0.01 ? 'matched' : Math.abs(variancePct) > 5 ? 'mismatch' : 'pending' };
      }).sort((a, b) => b.date.localeCompare(a.date));
    },
  });
  const stats = useMemo(() => ({
    matched: rows?.filter(r => r.status === 'matched').length || 0,
    mismatched: rows?.filter(r => r.status === 'mismatch').length || 0,
    pending: rows?.filter(r => r.status === 'pending').length || 0,
    totalVariance: rows?.reduce((s, r) => s + Math.abs(r.variance), 0) || 0,
  }), [rows]);
  const sb = (s: string) => s === 'matched' ? <Badge className="bg-success/10 text-success border-success/20"><CheckCircle2 className="h-3 w-3 mr-1" />Matched</Badge> : s === 'mismatch' ? <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Mismatch</Badge> : <Badge className="bg-warning/10 text-warning border-warning/20"><AlertTriangle className="h-3 w-3 mr-1" />Pending</Badge>;
  const exportCsv = () => {
    if (!rows) return;
    const csv = 'Date,Provider,Gross,Settled,Variance,Status\n' + rows.map(r => `${r.date},${r.provider},${r.gross.toFixed(2)},${r.settled.toFixed(2)},${r.variance.toFixed(2)},${r.status}`).join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = `reconciliation-${new Date().toISOString().slice(0,10)}.csv`; a.click();
  };
  const exportPdfReport = () => {
    if (!rows) return;
    exportPdf({
      title: 'Reconciliation Report',
      filename: 'reconciliation',
      subtitle: `${rows.length} settlement days`,
      headers: ['Date', 'Provider', 'Gross', 'Settled', 'Variance', 'Status', 'Txns'],
      rows: rows.map(r => [r.date, r.provider, r.gross.toFixed(2), r.settled.toFixed(2), r.variance.toFixed(2), r.status, r.count]),
    });
  };
  return (
    <AppLayout>
      <div className="mb-6 flex items-center justify-between">
        <div><h1 className="font-heading text-2xl font-bold">Reconciliation</h1><p className="mt-1 text-sm text-muted-foreground">Daily settlement vs ledger comparison</p></div>
        <div className="flex gap-2"><Button variant="outline" size="sm" className="rounded-full" onClick={() => refetch()}><RefreshCw className="h-4 w-4 mr-1" />Refresh</Button><Button variant="outline" size="sm" className="rounded-full" onClick={exportCsv}><Download className="h-4 w-4 mr-1" />CSV</Button><Button variant="outline" size="sm" className="rounded-full" onClick={exportPdfReport}><FileText className="h-4 w-4 mr-1" />PDF</Button></div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-success/10"><CheckCircle2 className="h-5 w-5 text-success" /></div><div><p className="text-sm text-muted-foreground">Matched</p><p className="text-2xl font-bold">{stats.matched}</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-destructive/10"><XCircle className="h-5 w-5 text-destructive" /></div><div><p className="text-sm text-muted-foreground">Mismatched</p><p className="text-2xl font-bold">{stats.mismatched}</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-warning/10"><AlertTriangle className="h-5 w-5 text-warning" /></div><div><p className="text-sm text-muted-foreground">Pending</p><p className="text-2xl font-bold">{stats.pending}</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-muted"><Scale className="h-5 w-5 text-muted-foreground" /></div><div><p className="text-sm text-muted-foreground">Total Variance</p><p className="text-2xl font-bold">{formatCurrency(stats.totalVariance, 'USD')}</p></div></div></CardContent></Card>
      </div>
      <Card><CardHeader><CardTitle>Daily Reconciliation</CardTitle><CardDescription>Settlement vs ledger with variance highlighting</CardDescription></CardHeader>
        <CardContent>{isLoading ? <div className="flex justify-center py-12"><div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div> : <Table><TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Provider</TableHead><TableHead className="text-right">Gross</TableHead><TableHead className="text-right">Settled</TableHead><TableHead className="text-right">Variance</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Txns</TableHead></TableRow></TableHeader><TableBody>{rows?.map(r => <TableRow key={r.id} className={r.status === 'mismatch' ? 'bg-destructive/5' : ''}><TableCell className="text-sm font-medium">{r.date}</TableCell><TableCell className="text-sm capitalize">{r.provider}</TableCell><TableCell className="text-right font-mono text-sm">{formatCurrency(r.gross, r.currency as any)}</TableCell><TableCell className="text-right font-mono text-sm">{formatCurrency(r.settled, r.currency as any)}</TableCell><TableCell className="text-right"><span className={`font-mono text-sm flex items-center justify-end gap-1 ${r.variance > 0 ? 'text-success' : r.variance < 0 ? 'text-destructive' : 'text-muted-foreground'}`}>{r.variance > 0 ? <TrendingUp className="h-3 w-3" /> : r.variance < 0 ? <TrendingDown className="h-3 w-3" /> : null}{formatCurrency(Math.abs(r.variance), r.currency as any)}</span></TableCell><TableCell>{sb(r.status)}</TableCell><TableCell className="text-right text-sm text-muted-foreground">{r.count}</TableCell></TableRow>)}{!rows?.length && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No data</TableCell></TableRow>}</TableBody></Table>}</CardContent>
      </Card>
    </AppLayout>
  );
}
