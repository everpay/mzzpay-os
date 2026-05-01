import { useState, useMemo } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { TransactionTable } from '@/components/TransactionTable';
import { useTransactions } from '@/hooks/useTransactions';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Search, Globe, X, Download, FileText } from 'lucide-react';
import { PeriodSelector, type PeriodValue, getPeriodCutoff } from '@/components/PeriodSelector';
import { CurrencySelector } from '@/components/CurrencySelector';
import { TableSkeleton, TableEmpty, TableError } from '@/components/TableStates';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { exportPdf } from '@/lib/export-pdf';
import { motion } from 'framer-motion';

export default function Transactions() {
  const { data: transactions = [], isLoading, isError, error, refetch } = useTransactions();
  const [providerFilter, setProviderFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currencyFilter, setCurrencyFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<PeriodValue>('30d');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    return transactions.filter((tx) => {
      if (providerFilter !== 'all' && tx.provider !== providerFilter) return false;
      if (statusFilter !== 'all' && tx.status !== statusFilter) return false;
      if (currencyFilter !== 'all' && tx.currency !== currencyFilter) return false;
      const cutoff = getPeriodCutoff(dateRange);
      if (cutoff && new Date(tx.created_at) < cutoff) return false;
      if (
        search &&
        !tx.id.includes(search) &&
        !tx.description?.toLowerCase().includes(search.toLowerCase()) &&
        !tx.customer_email?.toLowerCase().includes(search.toLowerCase()) &&
        !(tx.customer_ip || '').includes(search) &&
        !(tx.processor_error_message || '').toLowerCase().includes(search.toLowerCase())
      )
        return false;
      return true;
    });
  }, [transactions, providerFilter, statusFilter, currencyFilter, dateRange, search]);

  const providerCounts = useMemo(
    () =>
      transactions.reduce((acc, tx) => {
        acc[tx.provider] = (acc[tx.provider] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    [transactions]
  );

  const completed = filtered.filter((tx) => tx.status === 'completed');
  const totalVolume = completed.reduce((sum, tx) => sum + tx.amount, 0);
  const successRate = filtered.length > 0 ? (completed.length / filtered.length) * 100 : 0;

  const hasActiveFilters =
    providerFilter !== 'all' || statusFilter !== 'all' || currencyFilter !== 'all' || dateRange !== '30d' || !!search;
  const clearFilters = () => {
    setProviderFilter('all');
    setStatusFilter('all');
    setCurrencyFilter('all');
    setDateRange('30d');
    setSearch('');
  };

  const exportCsv = () => {
    const escape = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const header = 'id,created_at,customer,amount,currency,status,provider,country,customer_ip,processor_error_code,processor_error_message\n';
    const rows = filtered
      .map((tx) =>
        [tx.id, tx.created_at, tx.customer_email || '', tx.amount, tx.currency, tx.status, tx.provider, tx.customer_country || '', tx.customer_ip || '', tx.processor_error_code || '', tx.processor_error_message || '']
          .map(escape).join(',')
      )
      .join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportPdfReport = () => {
    exportPdf({
      title: 'Transactions Report',
      filename: 'transactions',
      subtitle: `${filtered.length} transactions`,
      headers: ['Date', 'ID', 'Customer', 'Amount', 'Currency', 'Status', 'Provider', 'Error'],
      rows: filtered.map((tx) => [
        new Date(tx.created_at).toLocaleString(),
        tx.id.slice(0, 12),
        tx.customer_email || '',
        tx.amount.toFixed(2),
        tx.currency,
        tx.status,
        tx.provider,
        tx.processor_error_message ? `${tx.processor_error_code || ''} ${tx.processor_error_message}`.trim() : '',
      ]),
    });
  };

  return (
    <AppLayout>
      <motion.div
        className="mb-6 flex items-start justify-between gap-4"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">Transactions</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {transactions.length.toLocaleString()} total · {filtered.length.toLocaleString()} matching · click any row for full details
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5">
              <Download className="h-4 w-4" /> Export
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={exportCsv} className="gap-2">
              <Download className="h-4 w-4" /> Export CSV
            </DropdownMenuItem>
            <DropdownMenuItem onClick={exportPdfReport} className="gap-2">
              <FileText className="h-4 w-4" /> Export PDF
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </motion.div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-6">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Transactions</p>
          <p className="mt-1 font-heading text-2xl font-extrabold text-foreground">{filtered.length}</p>
          <p className="mt-1 text-xs text-muted-foreground">in selected period</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Volume (Completed)</p>
          <p className="mt-1 font-heading text-2xl font-extrabold text-foreground">
            ${totalVolume.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{completed.length} successful</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Success Rate</p>
          <p className="mt-1 font-heading text-2xl font-extrabold text-foreground">{successRate.toFixed(1)}%</p>
          <p className="mt-1 text-xs text-muted-foreground">authorisation success</p>
        </div>
      </div>

      {/* Provider routing summary */}
      {transactions.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2 items-center">
          <Globe className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Routing:</span>
          {Object.entries(providerCounts).map(([provider, count]) => (
            <Badge key={provider} variant="outline" className="text-xs gap-1">
              <span className="capitalize">{provider}</span>
              <span className="text-muted-foreground">×{count}</span>
            </Badge>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative w-full sm:w-auto">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search transactions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:w-[260px] pl-9 bg-card border-border"
          />
        </div>
        <Select value={providerFilter} onValueChange={setProviderFilter}>
          <SelectTrigger className="w-[150px] bg-card border-border"><SelectValue placeholder="Provider" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Providers</SelectItem>
            <SelectItem value="shieldhub">ShieldHub 🇺🇸</SelectItem>
            <SelectItem value="mondo">MzzPay EUR 🇬🇧</SelectItem>
            <SelectItem value="matrix">Matrix 🇬🇧</SelectItem>
            <SelectItem value="risonpay">RisonPay</SelectItem>
            <SelectItem value="moneto">Moneto 🇨🇦</SelectItem>
            <SelectItem value="elektropay">Elektropay</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px] bg-card border-border"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="processing">Processing</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="refunded">Refunded</SelectItem>
          </SelectContent>
        </Select>
        <CurrencySelector value={currencyFilter} onValueChange={setCurrencyFilter} />
        <PeriodSelector value={dateRange} onValueChange={setDateRange} />
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 text-xs gap-1">
            <X className="h-3 w-3" /> Clear
          </Button>
        )}
      </div>

      {isLoading ? (
        <TableSkeleton rows={10} cols={8} />
      ) : isError ? (
        <TableError message={(error as Error)?.message || 'Could not load transactions'} onRetry={() => refetch()} />
      ) : filtered.length === 0 ? (
        <TableEmpty
          title={hasActiveFilters ? 'No transactions match your filters' : 'No transactions yet'}
          description={hasActiveFilters
            ? 'Try clearing filters, widening the date range, or removing the search query.'
            : 'Once you start accepting payments, they will appear here in real time.'}
        />
      ) : (
        <TransactionTable transactions={filtered} />
      )}
    </AppLayout>
  );
}
