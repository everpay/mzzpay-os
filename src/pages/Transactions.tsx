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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { exportPdf } from '@/lib/export-pdf';
import { motion } from 'framer-motion';

export default function Transactions() {
  const { data: transactions = [], isLoading } = useTransactions();
  const [providerFilter, setProviderFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currencyFilter, setCurrencyFilter] = useState<string>('all');
  const [countryFilter, setCountryFilter] = useState<string>('all');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<PeriodValue>('30d');
  const [search, setSearch] = useState('');

  const allProviders = useMemo(() => [...new Set(transactions.map((tx) => tx.provider))], [transactions]);
  const allCountries = useMemo(
    () => [...new Set(transactions.map((tx) => tx.customer_country).filter(Boolean) as string[])].sort(),
    [transactions]
  );
  const allPaymentMethods = useMemo(
    () => [...new Set(transactions.map((tx) => tx.card_brand || tx.payment_method_type).filter(Boolean) as string[])].sort(),
    [transactions]
  );

  const filtered = useMemo(() => {
    return transactions.filter((tx) => {
      if (providerFilter !== 'all' && tx.provider !== providerFilter) return false;
      if (statusFilter !== 'all' && tx.status !== statusFilter) return false;
      if (currencyFilter !== 'all' && tx.currency !== currencyFilter) return false;
      if (countryFilter !== 'all' && tx.customer_country !== countryFilter) return false;
      if (paymentMethodFilter !== 'all') {
        const pm = tx.card_brand || tx.payment_method_type;
        if (pm !== paymentMethodFilter) return false;
      }
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
  }, [transactions, providerFilter, statusFilter, currencyFilter, countryFilter, paymentMethodFilter, dateRange, search]);

  const providerCounts = useMemo(
    () =>
      transactions.reduce((acc, tx) => {
        acc[tx.provider] = (acc[tx.provider] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    [transactions]
  );

  // Stats
  const completed = filtered.filter((tx) => tx.status === 'completed');
  const totalVolume = completed.reduce((sum, tx) => sum + tx.amount, 0);
  const successRate = filtered.length > 0 ? (completed.length / filtered.length) * 100 : 0;

  const hasActiveFilters =
    providerFilter !== 'all' ||
    statusFilter !== 'all' ||
    currencyFilter !== 'all' ||
    countryFilter !== 'all' ||
    paymentMethodFilter !== 'all' ||
    dateRange !== '30d' ||
    !!search;
  const clearFilters = () => {
    setProviderFilter('all');
    setStatusFilter('all');
    setCurrencyFilter('all');
    setCountryFilter('all');
    setPaymentMethodFilter('all');
    setDateRange('30d');
    setSearch('');
  };

  const exportCsv = () => {
    const escape = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const header = 'id,created_at,customer,amount,currency,status,provider,payment_method,country,customer_ip,processor_error_code,processor_error_message,description\n';
    const rows = filtered
      .map((tx) =>
        [
          tx.id,
          tx.created_at,
          tx.customer_email || '',
          tx.amount,
          tx.currency,
          tx.status,
          tx.provider,
          tx.card_brand || tx.payment_method_type || '',
          tx.customer_country || '',
          tx.customer_ip || '',
          tx.processor_error_code || '',
          tx.processor_error_message || '',
          tx.description || '',
        ].map(escape).join(',')
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
      headers: ['Date', 'ID', 'Customer', 'Amount', 'Currency', 'Status', 'Provider', 'Method', 'Country', 'IP', 'Error'],
      rows: filtered.map((tx) => [
        new Date(tx.created_at).toLocaleString(),
        tx.id.slice(0, 12),
        tx.customer_email || '',
        tx.amount.toFixed(2),
        tx.currency,
        tx.status,
        tx.provider,
        tx.card_brand || tx.payment_method_type || '',
        tx.customer_country || '',
        tx.customer_ip || '',
        tx.processor_error_message ? `${tx.processor_error_code || ''} ${tx.processor_error_message}`.trim() : '',
      ]),
    });
  };

  return (
    <AppLayout>
      <motion.div
        className="mb-6 flex items-end justify-between flex-wrap gap-4"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div>
          <h1 className="font-heading text-3xl font-extrabold tracking-tight text-foreground">Transactions</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            All payment transactions across providers, currencies, and statuses.
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
          <SelectTrigger className="w-[150px] bg-card border-border">
            <SelectValue placeholder="Provider" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Providers</SelectItem>
            {allProviders.map((p) => (
              <SelectItem key={p} value={p} className="capitalize">
                {p}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px] bg-card border-border">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
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
        <Select value={countryFilter} onValueChange={setCountryFilter}>
          <SelectTrigger className="w-[140px] bg-card border-border">
            <SelectValue placeholder="Country" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Countries</SelectItem>
            {allCountries.map((c) => (
              <SelectItem key={c} value={c} className="font-mono uppercase">{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={paymentMethodFilter} onValueChange={setPaymentMethodFilter}>
          <SelectTrigger className="w-[150px] bg-card border-border">
            <SelectValue placeholder="Method" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Methods</SelectItem>
            {allPaymentMethods.map((m) => (
              <SelectItem key={m} value={m} className="capitalize">{m.replace(/_/g, ' ')}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <PeriodSelector value={dateRange} onValueChange={setDateRange} />
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 text-xs gap-1">
            <X className="h-3 w-3" /> Clear
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center p-12 rounded-2xl border border-border bg-card shadow-card">
          <p className="text-muted-foreground">Loading transactions...</p>
        </div>
      ) : (
        <>
          <TransactionTable transactions={filtered} />
          <p className="mt-3 text-xs text-muted-foreground">
            {filtered.length} transaction{filtered.length !== 1 ? 's' : ''} of {transactions.length}
          </p>
        </>
      )}
    </AppLayout>
  );
}
