import { useMemo, useState } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { useCryptoAuditLogs } from '@/hooks/useCryptoAuditLogs';
import { useAccessControl } from '@/hooks/useAccessControl';
import Unauthorized from '@/components/admin/Unauthorized';
import { MerchantPicker } from '@/components/crypto/MerchantPicker';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Download, ScrollText, FileText } from 'lucide-react';
import { format } from 'date-fns';

export default function CryptoAuditLog() {
  const { isSuperAdmin, isAdmin, isLoading } = useAccessControl();
  const { data: logs = [], isLoading: loading } = useCryptoAuditLogs();

  const [query, setQuery] = useState('');
  const [merchant, setMerchant] = useState('all');
  const [changeType, setChangeType] = useState('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const types = Array.from(new Set(logs.map(l => l.change_type)));

  const filtered = useMemo(() => logs.filter(l => {
    if (merchant !== 'all' && l.resource_id !== merchant) return false;
    if (changeType !== 'all' && l.change_type !== changeType) return false;
    if (from && new Date(l.created_at) < new Date(from)) return false;
    if (to && new Date(l.created_at) > new Date(to + 'T23:59:59')) return false;
    if (query) {
      const t = `${l.change_type} ${l.changed_by} ${l.resource_id} ${JSON.stringify(l.new_value || {})}`.toLowerCase();
      if (!t.includes(query.toLowerCase())) return false;
    }
    return true;
  }), [logs, merchant, changeType, from, to, query]);

  if (isLoading) return <AppLayout><div className="p-6">Loading...</div></AppLayout>;
  if (!isSuperAdmin && !isAdmin) return <AppLayout><Unauthorized /></AppLayout>;

  const exportCsv = () => {
    const header = 'Timestamp,Change Type,Changed By,Resource ID,Payload\n';
    const rows = filtered.map(l => [
      l.created_at, l.change_type, l.changed_by ?? '', l.resource_id ?? '',
      `"${JSON.stringify(l.new_value || {}).replace(/"/g, '""')}"`,
    ].join(',')).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `crypto-audit-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  const exportPdf = async () => {
    const { jsPDF } = await import('jspdf');
    const autoTable = (await import('jspdf-autotable')).default;
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text('Crypto admin audit log', 14, 16);
    doc.setFontSize(10);
    doc.text(`Generated ${format(new Date(), 'PPp')} • ${filtered.length} entries`, 14, 22);
    autoTable(doc, {
      startY: 28,
      head: [['When', 'Change', 'By', 'Resource', 'Payload']],
      body: filtered.map(l => [
        format(new Date(l.created_at), 'yyyy-MM-dd HH:mm'),
        l.change_type,
        l.changed_by ?? '',
        (l.resource_id ?? '').slice(0, 12),
        JSON.stringify(l.new_value || {}).slice(0, 80),
      ]),
      styles: { fontSize: 7, cellPadding: 1.5 },
      headStyles: { fillColor: [45, 45, 60] },
    });
    doc.save(`crypto-audit-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  };

  return (
    <AppLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <ScrollText className="h-6 w-6 text-primary" />Crypto Audit Log
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Every wallet, store, commission, and webhook admin action.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportCsv} className="gap-2"><Download className="h-4 w-4" />CSV</Button>
          <Button variant="outline" onClick={exportPdf} className="gap-2"><FileText className="h-4 w-4" />PDF</Button>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card mb-4">
        <div className="p-4 grid grid-cols-1 md:grid-cols-5 gap-3">
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} className="pl-9" placeholder="Search..." />
          </div>
          <MerchantPicker value={merchant} onChange={setMerchant} placeholder="All merchants" />
          <Select value={changeType} onValueChange={setChangeType}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All actions</SelectItem>
              {types.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="flex gap-2">
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>When</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>By</TableHead>
              <TableHead>Resource</TableHead>
              <TableHead>Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No audit entries</TableCell></TableRow>
            ) : filtered.map(l => (
              <TableRow key={l.id}>
                <TableCell className="text-xs whitespace-nowrap">{format(new Date(l.created_at), 'MMM d, HH:mm:ss')}</TableCell>
                <TableCell><Badge variant="outline">{l.change_type}</Badge></TableCell>
                <TableCell className="text-xs">{l.changed_by ?? <span className="text-muted-foreground">system</span>}</TableCell>
                <TableCell className="font-mono text-xs">{l.resource_id?.slice(0, 12) ?? '—'}</TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground max-w-[420px] truncate">
                  {JSON.stringify(l.new_value || {}).slice(0, 120)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </AppLayout>
  );
}
