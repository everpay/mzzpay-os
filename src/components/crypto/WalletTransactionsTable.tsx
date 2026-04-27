import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Copy, ExternalLink } from 'lucide-react';

import { useWalletTransactions, explorerUrl } from '@/hooks/useCryptoTransactions';
import { format } from 'date-fns';
import { notifySuccess } from '@/lib/error-toast';
import { usePagination } from '@/hooks/usePagination';
import { TablePagination } from '@/components/TablePagination';

interface Props {
  walletId: string;
  network: string | null;
}

const statusVariant = (s: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
  if (s === 'complete') return 'default';
  if (s === 'failed' || s === 'cancelled') return 'destructive';
  if (s === 'processing' || s === 'pending') return 'secondary';
  return 'outline';
};

export function WalletTransactionsTable({ walletId, network }: Props) {
  const { data: txs = [], isLoading } = useWalletTransactions(walletId);
  const pg = usePagination(txs, 25);

  const copy = (v: string) => {
    navigator.clipboard.writeText(v);
    notifySuccess('Copied');
  };

  return (
    <div className="rounded-lg border border-border bg-background/50">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Type</TableHead>
            <TableHead>When</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead className="text-right">Fee</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Tx hash</TableHead>
            <TableHead>Elektropay ID</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow><TableCell colSpan={7} className="text-center py-6 text-muted-foreground text-sm">Loading...</TableCell></TableRow>
          ) : txs.length === 0 ? (
            <TableRow><TableCell colSpan={7} className="text-center py-6 text-muted-foreground text-sm">No transactions yet</TableCell></TableRow>
          ) : txs.map((t) => {
            const url = explorerUrl(network, t.tx_hash);
            return (
              <TableRow key={t.id}>
                <TableCell className="capitalize text-sm">{t.tx_type.replace('_', ' ')}</TableCell>
                <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                  {format(new Date(t.created_at), 'MMM d, HH:mm')}
                </TableCell>
                <TableCell className="text-right font-medium">{Number(t.amount).toFixed(6)}</TableCell>
                <TableCell className="text-right text-muted-foreground">{Number(t.fee).toFixed(6)}</TableCell>
                <TableCell><Badge variant={statusVariant(t.status)} className="capitalize">{t.status}</Badge></TableCell>
                <TableCell>
                  {t.tx_hash ? (
                    <div className="flex items-center gap-1">
                      <code className="text-xs font-mono truncate max-w-[100px]">{t.tx_hash.slice(0, 10)}…</code>
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => copy(t.tx_hash!)}>
                        <Copy className="h-3 w-3" />
                      </Button>
                      {url && (
                        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => window.open(url, '_blank')}>
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  ) : <span className="text-xs text-muted-foreground">—</span>}
                </TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">{t.elektropay_id?.slice(0, 12) || '—'}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
