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
 * Calls the `merchant_reconciliation_rows` RPC which computes signed
 * ledger sums server-side via SQL GROUP BY — far more efficient and
 * consistent than fetching all entries and aggregating client-side.
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

      // Call the SQL RPC instead of fetching all ledger entries
      const { data: rows, error } = await supabase.rpc(
        'merchant_reconciliation_rows' as any,
        { _merchant_id: merchant.id },
      );

      if (error) {
        console.error('Reconciliation RPC error:', error);
        return [] as ReconciliationRow[];
      }

      return ((rows as any[]) || []).map((r: any): ReconciliationRow => ({
        account_id: r.account_id,
        currency: r.currency,
        stored_balance: Number(r.stored_balance),
        ledger_total: Number(r.ledger_total),
        discrepancy: Number(r.discrepancy),
        entry_count: Number(r.entry_count),
        status: r.status === 'matched' ? 'matched' : 'discrepancy',
      }));
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
