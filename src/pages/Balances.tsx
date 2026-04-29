import { useState, useMemo } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PeriodSelector, type PeriodValue, getPeriodCutoff } from '@/components/PeriodSelector';
import { CurrencySelector } from '@/components/CurrencySelector';
import { useAccounts } from '@/hooks/useAccounts';
import { useTransactions } from '@/hooks/useTransactions';
import { formatCurrency } from '@/lib/format';
import type { Currency } from '@/lib/types';
import { DollarSign, ArrowUpRight, Clock, TrendingUp } from 'lucide-react';

export default function Balances() {
  const { data: accounts = [], isLoading: loadingAccounts } = useAccounts();
  const { data: transactions = [], isLoading: loadingTx } = useTransactions();
  const [period, setPeriod] = useState<PeriodValue>('30d');
  const [currency, setCurrency] = useState('all');

  const filteredAccounts = useMemo(() => {
    if (currency === 'all') return accounts;
    return accounts.filter(a => a.currency === currency);
  }, [accounts, currency]);

  const pendingTransactions = useMemo(() => {
    let txs = transactions.filter(tx => ['pending', 'processing'].includes(tx.status));
    const cutoff = getPeriodCutoff(period);
    if (cutoff) txs = txs.filter(tx => new Date(tx.created_at) >= cutoff);
    if (currency !== 'all') txs = txs.filter(tx => tx.currency === currency);
    return txs;
  }, [transactions, period, currency]);

  const displayCurrency = (currency === 'all' ? 'USD' : currency) as Currency;
  const totalAvailable = filteredAccounts.reduce((s, a) => s + (a.available_balance || 0), 0);
  const totalPending = filteredAccounts.reduce((s, a) => s + (a.pending_balance || 0), 0);
  const totalBalance = filteredAccounts.reduce((s, a) => s + a.balance, 0);
  const pendingTxAmount = pendingTransactions.reduce((s, tx) => s + tx.amount, 0);

  if (loadingAccounts || loadingTx) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-64" />
          <div className="grid gap-4 md:grid-cols-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28" />)}</div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-start flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Balances</h1>
            <p className="text-muted-foreground text-sm">Overview of all pending and available balances</p>
          </div>
          <div className="flex items-center gap-2">
            <CurrencySelector value={currency} onValueChange={setCurrency} />
            <PeriodSelector value={period} onValueChange={setPeriod} />
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Balance</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalBalance, displayCurrency)}</div>
              <p className="text-xs text-muted-foreground">{filteredAccounts.length} account{filteredAccounts.length !== 1 ? 's' : ''}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Available</CardTitle>
              <ArrowUpRight className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{formatCurrency(totalAvailable, displayCurrency)}</div>
              <p className="text-xs text-muted-foreground">Ready for payout</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <Clock className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">{formatCurrency(totalPending, displayCurrency)}</div>
              <p className="text-xs text-muted-foreground">In settlement queue</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Txns</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(pendingTxAmount, displayCurrency)}</div>
              <p className="text-xs text-muted-foreground">{pendingTransactions.length} pending transaction{pendingTransactions.length !== 1 ? 's' : ''}</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="balances">
          <TabsList>
            <TabsTrigger value="balances">Balances</TabsTrigger>
            <TabsTrigger value="pending">Pending Transactions</TabsTrigger>
          </TabsList>

          <TabsContent value="balances" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Account Balances</CardTitle>
                <CardDescription>Aggregated MID balances across all currencies</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Account ID</TableHead>
                      <TableHead>Currency</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                      <TableHead className="text-right">Available</TableHead>
                      <TableHead className="text-right">Pending</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAccounts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          No accounts found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredAccounts.map((account) => (
                        <TableRow key={account.id}>
                          <TableCell className="font-mono text-xs">{account.id.slice(0, 8)}…</TableCell>
                          <TableCell>
                            <Badge variant="outline">{account.currency}</Badge>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(account.balance, account.currency)}
                          </TableCell>
                          <TableCell className="text-right text-primary">
                            {formatCurrency(account.available_balance || 0, account.currency)}
                          </TableCell>
                          <TableCell className="text-right text-amber-600">
                            {formatCurrency(account.pending_balance || 0, account.currency)}
                          </TableCell>
                          <TableCell>
                            <Badge variant={account.balance > 0 ? 'default' : 'secondary'}>
                              {account.balance > 0 ? 'active' : 'zero'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pending" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Pending Transactions</CardTitle>
                <CardDescription>Transactions awaiting settlement or completion</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Transaction ID</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Currency</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Provider</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingTransactions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          No pending transactions
                        </TableCell>
                      </TableRow>
                    ) : (
                      pendingTransactions.map((tx) => (
                        <TableRow key={tx.id}>
                          <TableCell className="font-mono text-xs">{tx.id.slice(0, 8)}…</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50 dark:bg-amber-950/30">
                              {tx.status}
                            </Badge>
                          </TableCell>
                          <TableCell>{tx.currency}</TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(tx.amount, tx.currency)}
                          </TableCell>
                          <TableCell className="capitalize">{tx.provider}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {new Date(tx.created_at).toLocaleDateString()}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>


      </div>
    </AppLayout>
  );
}
