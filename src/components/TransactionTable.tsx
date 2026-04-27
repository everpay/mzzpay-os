import { useState } from 'react';
import { Transaction } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatDate, getStatusVariant } from '@/lib/format';
import { TransactionDetailDrawer } from './TransactionDetailDrawer';
import { PaymentMethodIcon } from './PaymentMethodIcon';
import { RisonpaySettlementBadge } from './RisonpaySettlementBadge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AlertCircle } from 'lucide-react';

interface TransactionTableProps {
  transactions: Transaction[];
  compact?: boolean;
}

// ISO-2 → flag emoji
function flag(code?: string | null) {
  if (!code || code.length !== 2) return '';
  const A = 0x1f1e6;
  return String.fromCodePoint(A + code.toUpperCase().charCodeAt(0) - 65) +
         String.fromCodePoint(A + code.toUpperCase().charCodeAt(1) - 65);
}

export function TransactionTable({ transactions, compact = false }: TransactionTableProps) {
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);

  return (
    <TooltipProvider>
      <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">ID</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Customer</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Amount</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider hidden md:table-cell">Payment Method</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider hidden sm:table-cell">Provider</th>
              {!compact && (
                <>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider hidden lg:table-cell">Country</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider hidden lg:table-cell">Customer IP</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider hidden xl:table-cell">FX</th>
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
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-xs text-muted-foreground">{tx.id.slice(0, 8)}…</span>
                    {tx.processor_error_message && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <AlertCircle className="h-3.5 w-3.5 text-destructive" />
                        </TooltipTrigger>
                        <TooltipContent side="right" className="max-w-xs">
                          <p className="text-xs font-semibold">Processor error</p>
                          <p className="text-xs">{tx.processor_error_message}</p>
                          {tx.processor_error_code && (
                            <p className="text-[10px] font-mono text-muted-foreground mt-1">code: {tx.processor_error_code}</p>
                          )}
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </div>
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
                <td className="px-4 py-3 hidden md:table-cell">
                  {tx.card_brand || tx.payment_method_type || tx.card_last4 ? (
                    <PaymentMethodIcon
                      brand={tx.card_brand}
                      paymentMethodType={tx.payment_method_type}
                      bin={tx.card_bin}
                      last4={tx.card_last4}
                    />
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </td>
                <td className="px-4 py-3 hidden sm:table-cell">
                  <div className="flex flex-col gap-1">
                    <Badge variant="provider">{tx.provider}</Badge>
                    {tx.provider === 'risonpay' && (
                      <RisonpaySettlementBadge raw={(tx as any).processor_raw_response} status={tx.status} />
                    )}
                  </div>
                </td>
                {!compact && (
                  <>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      {tx.customer_country ? (
                        <span className="inline-flex items-center gap-1.5 text-xs text-foreground">
                          <span aria-hidden>{flag(tx.customer_country)}</span>
                          <span className="font-mono uppercase">{tx.customer_country}</span>
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      {tx.customer_ip ? (
                        <span className="font-mono text-xs text-muted-foreground">{tx.customer_ip}</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground hidden xl:table-cell">
                      {tx.fx_rate ? (
                        <span>
                          {tx.fx_rate} → {formatCurrency(tx.settlement_amount || 0, tx.settlement_currency || 'USD')}
                        </span>
                      ) : (
                        '—'
                      )}
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
    </TooltipProvider>
  );
}
