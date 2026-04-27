import { useState } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { RotateCcw, DollarSign, CheckCircle2, XCircle, Clock, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { formatCurrency, formatDate } from '@/lib/format';
import { notifyError, notifySuccess } from '@/lib/error-toast';
import { usePagination } from '@/hooks/usePagination';
import { TablePagination } from '@/components/TablePagination';

export default function Refunds() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [selectedTxn, setSelectedTxn] = useState('');
  const [refundAmount, setRefundAmount] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState('');

  const { data: refunds } = useQuery({
    queryKey: ['refunds'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data: m } = await supabase.from('merchants').select('id').eq('user_id', user.id).single();
      if (!m) return [];
      const { data } = await supabase.from('refunds').select('*, transaction:transactions(amount, currency, customer_email, provider)').eq('merchant_id', m.id).order('created_at', { ascending: false });
      return data || [];
    },
  });

  const { data: txns } = useQuery({
    queryKey: ['completed-txns'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data: m } = await supabase.from('merchants').select('id').eq('user_id', user.id).single();
      if (!m) return [];
      const { data } = await supabase.from('transactions').select('*').eq('merchant_id', m.id).eq('status', 'completed').order('created_at', { ascending: false }).limit(100);
      return data || [];
    },
  });

  const selected = txns?.find(t => t.id === selectedTxn);
  const totalRefunded = refunds?.reduce((s, r) => s + (r.status !== 'failed' ? Number(r.amount) : 0), 0) || 0;
  const pending = refunds?.filter(r => r.status === 'pending').length || 0;
  const filtered = refunds?.filter(r => !search || (r as any).transaction?.customer_email?.toLowerCase().includes(search.toLowerCase()) || r.reason?.toLowerCase().includes(search.toLowerCase()));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTxn || !refundAmount) return;
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke('refund-payment', {
        body: { transactionId: selectedTxn, amount: parseFloat(refundAmount), reason },
      });
      if (error || data?.error) throw new Error(data?.error || error?.message);
      notifySuccess('Refund issued');
      setOpen(false); setSelectedTxn(''); setRefundAmount(''); setReason('');
      qc.invalidateQueries({ queryKey: ['refunds'] });
      qc.invalidateQueries({ queryKey: ['completed-txns'] });
    } catch (err: any) {
      notifyError(err.message || 'Refund failed');
    } finally { setBusy(false); }
  };

  const statusBadge = (s: string) => s === 'completed' ? <Badge className="bg-success/10 text-success border-success/20"><CheckCircle2 className="h-3 w-3 mr-1" />Completed</Badge> : s === 'failed' ? <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Failed</Badge> : <Badge className="bg-warning/10 text-warning border-warning/20"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;

  return (
    <AppLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight">Refunds</h1>
          <p className="mt-1 text-sm text-muted-foreground">Issue and track payment refunds</p>
        </div>
        <Button className="gap-2 rounded-full" onClick={() => setOpen(true)}><RotateCcw className="h-4 w-4" />Issue Refund</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-primary/10"><DollarSign className="h-5 w-5 text-primary" /></div><div><p className="text-sm text-muted-foreground">Total Refunded</p><p className="text-2xl font-bold">{formatCurrency(totalRefunded, 'USD')}</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-muted"><RotateCcw className="h-5 w-5 text-muted-foreground" /></div><div><p className="text-sm text-muted-foreground">Total Refunds</p><p className="text-2xl font-bold">{refunds?.length || 0}</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-warning/10"><Clock className="h-5 w-5 text-warning" /></div><div><p className="text-sm text-muted-foreground">Pending</p><p className="text-2xl font-bold">{pending}</p></div></div></CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div><CardTitle>Refund History</CardTitle><CardDescription>All refund requests and their status</CardDescription></div>
            <div className="relative w-64"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search..." className="pl-9 rounded-2xl" value={search} onChange={e => setSearch(e.target.value)} /></div>
          </div>
        </CardHeader>
        <CardContent>
          <RefundsTableInline refunds={filtered || []} statusBadge={statusBadge} />
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Issue Refund</DialogTitle><DialogDescription>Select a completed transaction to refund.</DialogDescription></DialogHeader>
          <form onSubmit={submit} className="space-y-4 pt-4">
            <div className="space-y-2"><Label>Transaction</Label>
              <Select value={selectedTxn} onValueChange={v => { setSelectedTxn(v); const t = txns?.find(x => x.id === v); if (t) setRefundAmount(String(t.amount)); }}>
                <SelectTrigger className="rounded-2xl"><SelectValue placeholder="Select a transaction..." /></SelectTrigger>
                <SelectContent>{txns?.map(t => <SelectItem key={t.id} value={t.id}>{t.customer_email || 'Unknown'} — {formatCurrency(t.amount, t.currency as any)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {selected && <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm"><div className="flex justify-between"><span className="text-muted-foreground">Original</span><span className="font-mono">{formatCurrency(selected.amount, selected.currency as any)}</span></div></div>}
            <div className="space-y-2"><Label>Refund Amount</Label><Input className="rounded-2xl" type="number" step="0.01" value={refundAmount} onChange={e => setRefundAmount(e.target.value)} required /></div>
            <div className="space-y-2"><Label>Reason</Label><Textarea className="rounded-2xl" value={reason} onChange={e => setReason(e.target.value)} rows={2} /></div>
            <Button type="submit" className="w-full rounded-full" disabled={busy || !selectedTxn}>{busy ? 'Processing...' : 'Issue Refund'}</Button>
          </form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}

function RefundsTableInline({ refunds, statusBadge }: { refunds: any[]; statusBadge: (s: string) => JSX.Element }) {
  const { page, setPage, pageSize, setPageSize, totalPages, pageItems } = usePagination(refunds, 25);
  return (
    <>
      <Table>
        <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Customer</TableHead><TableHead>Amount</TableHead><TableHead>Reason</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
        <TableBody>
          {pageItems.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No refunds yet</TableCell></TableRow> :
            pageItems.map((r: any) => (
              <TableRow key={r.id}>
                <TableCell className="text-sm">{formatDate(r.created_at)}</TableCell>
                <TableCell className="text-sm">{r.transaction?.customer_email || '—'}</TableCell>
                <TableCell className="font-mono text-sm">{formatCurrency(r.amount, (r.transaction?.currency || 'USD') as any)}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{r.reason || '—'}</TableCell>
                <TableCell>{statusBadge(r.status)}</TableCell>
              </TableRow>
            ))}
        </TableBody>
      </Table>
      <TablePagination page={page} setPage={setPage} pageSize={pageSize} setPageSize={setPageSize} totalPages={totalPages} totalItems={refunds.length} />
    </>
  );
}
