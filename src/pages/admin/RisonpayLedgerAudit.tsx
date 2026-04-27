import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Shield, ArrowDownLeft, Receipt } from 'lucide-react';
import { format } from 'date-fns';
import { formatCurrency } from '@/lib/format';
import { usePagination } from '@/hooks/usePagination';
import { TablePagination } from '@/components/TablePagination';

/**
 * RisonpayLedgerAudit
 *
 * Super-admin only. Joins ledger_entries → transactions → provider_events to
 * surface every credit issued from a verified RisonPay webhook, including
 * which transaction triggered each entry and the resulting balance impact
 * on the merchant account currency.
 */
export default function RisonpayLedgerAudit() {
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['risonpay-ledger-audit'],
    queryFn: async () => {
      // Pull ledger entries whose transaction was processed by risonpay.
      const { data: ledger } = await supabase
        .from('ledger_entries')
        .select('id, amount, currency, entry_type, account_id, transaction_id, created_at')
        .eq('entry_type', 'credit')
        .order('created_at', { ascending: false })
        .limit(500);

      if (!ledger?.length) return [];

      const txIds = ledger.map((l: any) => l.transaction_id).filter(Boolean);
      const { data: txs } = await supabase
        .from('transactions')
        .select('id, amount, currency, status, provider, provider_ref, customer_email, idempotency_key, processor_raw_response, created_at')
        .in('id', txIds)
        .eq('provider', 'risonpay');

      const txMap = new Map((txs ?? []).map((t: any) => [t.id, t]));

      const { data: events } = await supabase
        .from('provider_events')
        .select('id, transaction_id, event_type, created_at')
        .in('transaction_id', txIds)
        .eq('provider', 'risonpay')
        .order('created_at', { ascending: false });

      const evMap = new Map<string, any>();
      for (const e of events ?? []) {
        if (!evMap.has(e.transaction_id)) evMap.set(e.transaction_id, e);
      }

      return ledger
        .filter((l: any) => txMap.has(l.transaction_id))
        .map((l: any) => ({
          ...l,
          transaction: txMap.get(l.transaction_id),
          event: evMap.get(l.transaction_id),
        }));
    },
  });

  const totalCredited = rows.reduce((sum: number, r: any) => sum + Number(r.amount || 0), 0);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-heading text-2xl font-bold flex items-center gap-2">
              <Shield className="h-6 w-6 text-primary" />
              RisonPay Ledger Audit
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Every ledger credit traced back to a verified RisonPay webhook.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card><CardContent className="pt-4">
            <div className="text-sm text-muted-foreground flex items-center gap-2">
              <Receipt className="h-4 w-4" />Webhook-credited entries
            </div>
            <p className="text-2xl font-bold mt-1">{rows.length}</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4">
            <div className="text-sm text-muted-foreground flex items-center gap-2">
              <ArrowDownLeft className="h-4 w-4" />Total credited
            </div>
            <p className="text-2xl font-bold mt-1">
              {totalCredited.toFixed(2)}
            </p>
            <p className="text-xs text-muted-foreground">across all currencies</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4">
            <div className="text-sm text-muted-foreground">Last credit</div>
            <p className="text-lg font-semibold mt-1">
              {rows[0] ? format(new Date(rows[0].created_at), 'MMM dd, HH:mm:ss') : '—'}
            </p>
          </CardContent></Card>
        </div>

        <Card>
          <CardContent className="p-0">
            <LedgerTable rows={rows} loading={isLoading} />
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

function LedgerTable({ rows, loading }: { rows: any[]; loading: boolean }) {
  const pg = usePagination(rows, 25);
  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>When</TableHead>
            <TableHead>Transaction</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Amount credited</TableHead>
            <TableHead>Webhook event</TableHead>
            <TableHead>Settlement</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>
          ) : rows.length === 0 ? (
            <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No RisonPay webhook credits yet.</TableCell></TableRow>
          ) : pg.pageItems.map((r: any) => {
            const tx = r.transaction;
            const meta = tx?.processor_raw_response?._risonpay_meta;
            return (
              <TableRow key={r.id}>
                <TableCell className="whitespace-nowrap text-sm">
                  {format(new Date(r.created_at), 'MMM dd, HH:mm:ss')}
                </TableCell>
                <TableCell className="font-mono text-xs">
                  {tx?.id?.slice(0, 12)}…
                  <div className="text-muted-foreground">ref {tx?.provider_ref?.slice(0, 14) || '—'}</div>
                </TableCell>
                <TableCell className="text-sm">{tx?.customer_email || '—'}</TableCell>
                <TableCell className="font-semibold">
                  +{formatCurrency(Number(r.amount), r.currency as any)}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="font-mono text-[10px]">
                    {r.event?.event_type || 'risonpay.webhook'}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs">
                  {meta?.expected_settlement_at ? (
                    <>
                      <Badge variant="secondary" className="text-[10px]">{meta.settlement_status}</Badge>
                      <div className="text-muted-foreground mt-1">
                        {format(new Date(meta.expected_settlement_at), 'MMM dd')}
                      </div>
                    </>
                  ) : '—'}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      <TablePagination
        page={pg.page} pageCount={pg.pageCount} pageSize={pg.pageSize}
        total={pg.total} from={pg.from} to={pg.to}
        canPrev={pg.canPrev} canNext={pg.canNext}
        onPageChange={pg.setPage} onPageSizeChange={pg.setPageSize}
        label="ledger entries" className="px-4"
      />
    </>
  );
}
