import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  AlertTriangle, CheckCircle2, Scale, Loader2, RefreshCw,
} from 'lucide-react';
import { formatCurrency } from '@/lib/format';

interface ReconciliationRow {
  account_id: string;
  currency: string;
  stored_balance: number;
  ledger_total: number;
  discrepancy: number;
  entry_count: number;
  status: 'matched' | 'discrepancy';
}

/**
 * Reconciliation widget for the dashboard.
 *
 * Fetches every merchant account balance and the signed sum of its
 * ledger_entries (credit − debit), then flags any rows where they
 * diverge. This is the at-a-glance integrity check for the double-
 * entry accounting system.
 */
export function LedgerReconciliationCard() {
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['dashboard-ledger-reconciliation'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [] as ReconciliationRow[];

      const { data: merchant } = await supabase
        .from('merchants')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
      if (!merchant) return [] as ReconciliationRow[];

      // Fetch all accounts for this merchant
      const { data: accounts } = await supabase
        .from('accounts')
        .select('id, currency, balance')
        .eq('merchant_id', merchant.id);

      if (!accounts?.length) return [] as ReconciliationRow[];

      // Fetch ledger sums per account — use a single query with GROUP BY
      // by pulling all entries and aggregating client-side (avoids RPC).
      const accountIds = accounts.map((a) => a.id);
      const { data: entries } = await supabase
        .from('ledger_entries')
        .select('account_id, entry_type, amount')
        .in('account_id', accountIds);

      const ledgerSums = new Map<string, { total: number; count: number }>();
      (entries || []).forEach((e) => {
        const prev = ledgerSums.get(e.account_id) || { total: 0, count: 0 };
        const signed = e.entry_type === 'credit' ? Number(e.amount) : -Number(e.amount);
        ledgerSums.set(e.account_id, {
          total: prev.total + signed,
          count: prev.count + 1,
        });
      });

      return accounts.map((a): ReconciliationRow => {
        const ledger = ledgerSums.get(a.id) || { total: 0, count: 0 };
        const discrepancy = Math.round((Number(a.balance) - ledger.total) * 100) / 100;
        return {
          account_id: a.id,
          currency: a.currency,
          stored_balance: Number(a.balance),
          ledger_total: ledger.total,
          discrepancy,
          entry_count: ledger.count,
          status: Math.abs(discrepancy) < 0.01 ? 'matched' : 'discrepancy',
        };
      });
    },
    staleTime: 60_000,
  });

  const stats = useMemo(() => {
    const rows = data || [];
    return {
      total: rows.length,
      matched: rows.filter((r) => r.status === 'matched').length,
      flagged: rows.filter((r) => r.status === 'discrepancy').length,
      totalDrift: rows.reduce((s, r) => s + Math.abs(r.discrepancy), 0),
    };
  }, [data]);

  return (
    <Card data-testid="ledger-reconciliation-card">
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <Scale className="h-4 w-4" /> Ledger Reconciliation
          </CardTitle>
          <CardDescription className="text-xs">
            Derived balances vs ledger_entries totals
          </CardDescription>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="rounded-full h-8"
          onClick={() => refetch()}
          disabled={isFetching}
        >
          <RefreshCw className={`h-3.5 w-3.5 mr-1 ${isFetching ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </CardHeader>

      <CardContent className="space-y-3">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Summary badges */}
            <div className="flex flex-wrap gap-2 text-xs">
              <Badge
                variant="secondary"
                className="gap-1 bg-success/10 text-success border-success/20"
                data-testid="recon-matched-badge"
              >
                <CheckCircle2 className="h-3 w-3" /> {stats.matched} matched
              </Badge>
              {stats.flagged > 0 && (
                <Badge variant="destructive" className="gap-1" data-testid="recon-flagged-badge">
                  <AlertTriangle className="h-3 w-3" /> {stats.flagged} flagged
                </Badge>
              )}
              {stats.flagged > 0 && (
                <Badge variant="outline" className="gap-1 text-destructive border-destructive/30">
                  Drift: {formatCurrency(stats.totalDrift, 'USD')}
                </Badge>
              )}
              {stats.flagged === 0 && stats.total > 0 && (
                <Badge variant="outline" className="gap-1 text-success border-success/30">
                  All accounts in sync
                </Badge>
              )}
            </div>

            {/* Table */}
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Currency</TableHead>
                    <TableHead className="text-xs text-right">Balance</TableHead>
                    <TableHead className="text-xs text-right">Ledger</TableHead>
                    <TableHead className="text-xs text-right">Drift</TableHead>
                    <TableHead className="text-xs text-right">Entries</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(data || []).map((row) => (
                    <TableRow
                      key={row.account_id}
                      className={row.status === 'discrepancy' ? 'bg-destructive/5' : ''}
                      data-testid={`recon-row-${row.currency}`}
                    >
                      <TableCell className="font-medium text-sm">{row.currency}</TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {formatCurrency(row.stored_balance, row.currency as any)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {formatCurrency(row.ledger_total, row.currency as any)}
                      </TableCell>
                      <TableCell
                        className={`text-right font-mono text-sm ${
                          row.status === 'discrepancy' ? 'text-destructive font-semibold' : 'text-muted-foreground'
                        }`}
                      >
                        {row.discrepancy > 0 ? '+' : ''}{formatCurrency(Math.abs(row.discrepancy), row.currency as any)}
                      </TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">
                        {row.entry_count}
                      </TableCell>
                      <TableCell>
                        {row.status === 'matched' ? (
                          <Badge variant="secondary" className="text-xs bg-success/10 text-success border-success/20">
                            <CheckCircle2 className="h-3 w-3 mr-0.5" />OK
                          </Badge>
                        ) : (
                          <Badge variant="destructive" className="text-xs">
                            <AlertTriangle className="h-3 w-3 mr-0.5" />Drift
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {!data?.length && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-6 text-sm">
                        No accounts found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
