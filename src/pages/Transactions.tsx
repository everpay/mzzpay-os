import { useState } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { TransactionTable } from '@/components/TransactionTable';
import { mockTransactions } from '@/lib/mock-data';
import { Provider, TransactionStatus, Currency } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

export default function Transactions() {
  const [providerFilter, setProviderFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currencyFilter, setCurrencyFilter] = useState<string>('all');
  const [search, setSearch] = useState('');

  const filtered = mockTransactions.filter((tx) => {
    if (providerFilter !== 'all' && tx.provider !== providerFilter) return false;
    if (statusFilter !== 'all' && tx.status !== statusFilter) return false;
    if (currencyFilter !== 'all' && tx.currency !== currencyFilter) return false;
    if (search && !tx.id.includes(search) && !tx.description?.toLowerCase().includes(search.toLowerCase()) && !tx.customer_email?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <AppLayout>
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">Transactions</h1>
        <p className="mt-1 text-sm text-muted-foreground">All payment transactions across providers</p>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search transactions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-[260px] pl-9 bg-card border-border"
          />
        </div>
        <Select value={providerFilter} onValueChange={setProviderFilter}>
          <SelectTrigger className="w-[150px] bg-card border-border">
            <SelectValue placeholder="Provider" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Providers</SelectItem>
            <SelectItem value="facilitapay">FacilitaPay</SelectItem>
            <SelectItem value="mondo">Mondo</SelectItem>
            <SelectItem value="stripe">Stripe</SelectItem>
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
        <Select value={currencyFilter} onValueChange={setCurrencyFilter}>
          <SelectTrigger className="w-[140px] bg-card border-border">
            <SelectValue placeholder="Currency" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Currencies</SelectItem>
            <SelectItem value="USD">USD</SelectItem>
            <SelectItem value="EUR">EUR</SelectItem>
            <SelectItem value="GBP">GBP</SelectItem>
            <SelectItem value="BRL">BRL</SelectItem>
            <SelectItem value="MXN">MXN</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <TransactionTable transactions={filtered} />
      <p className="mt-3 text-xs text-muted-foreground">{filtered.length} transaction{filtered.length !== 1 ? 's' : ''}</p>
    </AppLayout>
  );
}
