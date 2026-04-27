import { useMemo, useState } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency, formatDate } from '@/lib/format';
import { Landmark, Clock, CheckCircle2, ArrowUpRight, Banknote, TrendingUp } from 'lucide-react';
import { usePagination } from '@/hooks/usePagination';
import { TablePagination } from '@/components/TablePagination';

export default function Settlements() {
  const [statusFilter, setStatusFilter] = useState('all');
  const { data, isLoading } = useQuery({
    queryKey: ['settlements'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { settlements: [], instructions: [] };
      const { data: m } = await supabase.from('merchants').select('id').eq('user_id', user.id).single();
      if (!m) return { settlements: [], instructions: [] };
      const [{ data: s }, { data: i }] = await Promise.all([
        supabase.from('settlements').select('*').eq('merchant_id', m.id).order('created_at', { ascending: false }).limit(100),
        supabase.from('settlement_instructions').select('*').eq('merchant_id', m.id).order('created_at', { ascending: false }).limit(100),
      ]);
      return { settlements: s || [], instructions: i || [] };
    },
  });
  const filtered = useMemo(() => statusFilter === 'all' ? (data?.settlements || []) : (data?.settlements || []).filter(s => s.status === statusFilter), [data, statusFilter]);
  const stats = useMemo(() => {
    const s = data?.settlements || [];
    return { total: s.length, settled: s.filter(x => x.status === 'settled' || x.status === 'completed').length, totalNet: s.reduce((sum, x) => sum + (Number(x.net_amount) || 0), 0), totalFees: s.reduce((sum, x) => sum + (Number(x.fee) || 0), 0) };
  }, [data]);
  const sb = (s: string | null) => s === 'settled' || s === 'completed' ? <Badge className="bg-success/10 text-success border-success/20"><CheckCircle2 className="h-3 w-3 mr-1" />Settled</Badge> : s === 'in_transit' ? <Badge className="bg-chart-3/10 text-chart-3 border-chart-3/20"><ArrowUpRight className="h-3 w-3 mr-1" />In Transit</Badge> : <Badge className="bg-warning/10 text-warning border-warning/20"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;

  return (
    <AppLayout>
      <div className="mb-6 flex items-center justify-between">
        <div><h1 className="font-heading text-2xl font-bold">Settlements</h1><p className="mt-1 text-sm text-muted-foreground">Track settlement batches, payout rails, and net amounts</p></div>
        <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="w-36 rounded-2xl"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All</SelectItem><SelectItem value="pending">Pending</SelectItem><SelectItem value="in_transit">In Transit</SelectItem><SelectItem value="settled">Settled</SelectItem></SelectContent></Select>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-primary/10"><Landmark className="h-5 w-5 text-primary" /></div><div><p className="text-sm text-muted-foreground">Total</p><p className="text-2xl font-bold">{stats.total}</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-success/10"><CheckCircle2 className="h-5 w-5 text-success" /></div><div><p className="text-sm text-muted-foreground">Settled</p><p className="text-2xl font-bold">{stats.settled}</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-chart-2/10"><TrendingUp className="h-5 w-5 text-chart-2" /></div><div><p className="text-sm text-muted-foreground">Net Settled</p><p className="text-2xl font-bold">{formatCurrency(stats.totalNet, 'USD')}</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-destructive/10"><Banknote className="h-5 w-5 text-destructive" /></div><div><p className="text-sm text-muted-foreground">Fees</p><p className="text-2xl font-bold">{formatCurrency(stats.totalFees, 'USD')}</p></div></div></CardContent></Card>
      </div>
      <Card className="mb-6">
        <CardHeader><CardTitle>Settlement Batches</CardTitle><CardDescription>Processor-level records with fee breakdown</CardDescription></CardHeader>
        <CardContent>{isLoading ? <div className="flex justify-center py-12"><div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div> : <SettlementsTableInline rows={filtered} sb={sb} />}</CardContent>
      </Card>
    </AppLayout>
  );
}

function SettlementsTableInline({ rows, sb }: { rows: any[]; sb: (s: string | null) => JSX.Element }) {
  const { page, setPage, pageSize, setPageSize, totalPages, pageItems } = usePagination(rows, 25);
  return (
    <>
      <Table>
        <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Provider</TableHead><TableHead>Gross</TableHead><TableHead>Fee</TableHead><TableHead>Net</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
        <TableBody>
          {pageItems.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No settlements</TableCell></TableRow> :
            pageItems.map((s: any) => (
              <TableRow key={s.id}>
                <TableCell className="text-sm">{formatDate(s.created_at)}</TableCell>
                <TableCell className="text-sm capitalize">{s.provider || '—'}</TableCell>
                <TableCell className="font-mono text-sm">{formatCurrency(s.gross_amount || 0, (s.currency || 'USD') as any)}</TableCell>
                <TableCell className="font-mono text-sm text-muted-foreground">{formatCurrency(s.fee || 0, (s.currency || 'USD') as any)}</TableCell>
                <TableCell className="font-mono text-sm font-semibold">{formatCurrency(s.net_amount || 0, (s.currency || 'USD') as any)}</TableCell>
                <TableCell>{sb(s.status)}</TableCell>
              </TableRow>
            ))}
        </TableBody>
      </Table>
      <TablePagination page={page} setPage={setPage} pageSize={pageSize} setPageSize={setPageSize} totalPages={totalPages} totalItems={rows.length} />
    </>
  );
}
