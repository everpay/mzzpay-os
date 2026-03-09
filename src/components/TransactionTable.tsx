import { useState } from 'react';
import { Transaction } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatDate, getStatusVariant } from '@/lib/format';
import { TransactionDetailDrawer } from './TransactionDetailDrawer';

interface TransactionTableProps {
  transactions: Transaction[];
  compact?: boolean;
}

export function TransactionTable({ transactions, compact = false }: TransactionTableProps) {
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);

  return (
    <>
      <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">ID</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Customer</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Amount</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider hidden sm:table-cell">Provider</th>
              {!compact && (
                <>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider hidden lg:table-cell">Description</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider hidden lg:table-cell">FX</th>
                </>
              )}
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider hidden md:table-cell">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {transactions.map((tx) => (
              <tr
                key={tx.id}
                className="transition-colors hover:bg-muted/30 cursor-pointer"
                onClick={() => setSelectedTx(tx)}
              >
                <td className="px-4 py-3">
                  <span className="font-mono text-xs text-muted-foreground">{tx.id.slice(0, 8)}…</span>
                </td>
                <td className="px-4 py-3 text-sm text-foreground">
                  {tx.customer_email || <span className="text-muted-foreground">—</span>}
                </td>
                <td className="px-4 py-3 font-medium text-foreground">
                  {formatCurrency(tx.amount, tx.currency)}
                </td>
                <td className="px-4 py-3">
                  <Badge variant={getStatusVariant(tx.status)}>{tx.status}</Badge>
                </td>
                <td className="px-4 py-3 hidden sm:table-cell">
                  <Badge variant="provider">{tx.provider}</Badge>
                </td>
                {!compact && (
                  <>
                    <td className="px-4 py-3 text-muted-foreground max-w-[200px] truncate hidden lg:table-cell">
                      {tx.description || '—'}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground hidden lg:table-cell">
                      {tx.fx_rate ? (
                        <span>
                          {tx.fx_rate} → {formatCurrency(tx.settlement_amount || 0, tx.settlement_currency || 'USD')}
                        </span>
                      ) : '—'}
                    </td>
                  </>
                )}
                <td className="px-4 py-3 text-muted-foreground text-xs hidden md:table-cell">
                  {formatDate(tx.created_at)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <TransactionDetailDrawer
        transaction={selectedTx}
        open={!!selectedTx}
        onOpenChange={(open) => !open && setSelectedTx(null)}
      />
    </>
  );
}
