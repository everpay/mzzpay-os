import { Transaction } from '@/lib/types';
import { useProviderEvents } from '@/hooks/useProviderEvents';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatDate, getStatusVariant } from '@/lib/format';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { ArrowRight, Clock, Zap, CreditCard, Mail, FileText, Hash, RefreshCw, Shield, Wifi } from 'lucide-react';

interface TransactionDetailDrawerProps {
  transaction: Transaction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TransactionDetailDrawer({ transaction, open, onOpenChange }: TransactionDetailDrawerProps) {
  const { data: allEvents = [] } = useProviderEvents();

  if (!transaction) return null;

  const relatedEvents = allEvents.filter((e) => e.transaction_id === transaction.id);

  // Extract VGS alias and card brand from enrichment events
  const tapixEvent = relatedEvents.find((e) => e.event_type === 'enrichment.completed');
  const vaultEvent = relatedEvents.find((e) => e.event_type === 'vault.completed');

  const vgsAlias = (vaultEvent?.payload as any)?.vgs_alias || (tapixEvent?.payload as any)?.vgs_alias || null;
  const cardBrand = (tapixEvent?.payload as any)?.card_brand || (vaultEvent?.payload as any)?.card_brand || null;
  const cardLast4 = (tapixEvent?.payload as any)?.card_last4 || (vaultEvent?.payload as any)?.card_last4 || null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-[480px] bg-card border-border overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle className="font-heading text-foreground flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            Transaction Details
          </SheetTitle>
          <SheetDescription>
            <span className="font-mono text-xs">{transaction.id}</span>
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6">
          {/* Amount & Status */}
          <div className="rounded-lg border border-border bg-background p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="font-heading text-2xl font-bold text-foreground">
                {formatCurrency(transaction.amount, transaction.currency)}
              </span>
              <Badge variant={getStatusVariant(transaction.status)} className="text-xs">
                {transaction.status}
              </Badge>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              {formatDate(transaction.created_at)}
            </div>
          </div>

          {/* Vault Section */}
          {(vgsAlias || cardBrand || cardLast4) && (
            <div className="space-y-3">
              <h4 className="font-heading text-sm font-semibold text-foreground flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                Vault
              </h4>
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-2">
                {cardBrand && (
                  <DetailRow icon={CreditCard} label="Card Brand" value={
                    <Badge variant="outline" className="capitalize text-xs">{cardBrand}</Badge>
                  } />
                )}
                {cardLast4 && (
                  <DetailRow icon={CreditCard} label="Card" value={
                    <span className="font-mono text-sm">•••• {cardLast4}</span>
                  } />
                )}
                {vgsAlias && (
                  <DetailRow icon={Shield} label="VGS Alias" value={
                    <span className="font-mono text-[10px] text-primary break-all">{vgsAlias}</span>
                  } />
                )}
              </div>
            </div>
          )}

          {/* Details Grid */}
          <div className="space-y-3">
            <h4 className="font-heading text-sm font-semibold text-foreground">Details</h4>
            <div className="grid gap-2">
              <DetailRow icon={Hash} label="Provider" value={
                <Badge variant="provider">{transaction.provider}</Badge>
              } />
              {transaction.customer_email && (
                <DetailRow icon={Mail} label="Customer" value={transaction.customer_email} />
              )}
              {transaction.description && (
                <DetailRow icon={FileText} label="Description" value={transaction.description} />
              )}
              {transaction.provider_ref && (
                <DetailRow icon={Wifi} label="Provider Ref" value={
                  <span className="font-mono text-xs">{transaction.provider_ref}</span>
                } />
              )}
              {transaction.idempotency_key && (
                <DetailRow icon={RefreshCw} label="Idempotency Key" value={
                  <span className="font-mono text-xs break-all">{transaction.idempotency_key}</span>
                } />
              )}
            </div>
          </div>

          {/* FX Details */}
          {transaction.fx_rate && (
            <div className="space-y-3">
              <h4 className="font-heading text-sm font-semibold text-foreground">FX Conversion</h4>
              <div className="rounded-lg border border-border bg-background p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">{transaction.currency}</p>
                    <p className="font-heading font-bold text-foreground">
                      {formatCurrency(transaction.amount, transaction.currency)}
                    </p>
                  </div>
                  <div className="flex flex-col items-center">
                    <ArrowRight className="h-4 w-4 text-primary" />
                    <span className="text-[10px] text-muted-foreground mt-1">Rate: {transaction.fx_rate}</span>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">{transaction.settlement_currency}</p>
                    <p className="font-heading font-bold text-foreground">
                      {formatCurrency(transaction.settlement_amount || 0, transaction.settlement_currency || 'USD')}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Ledger Entries */}
          <div className="space-y-3">
            <h4 className="font-heading text-sm font-semibold text-foreground">Ledger Entries</h4>
            <div className="rounded-lg border border-border bg-background divide-y divide-border">
              <LedgerRow type="debit" account={`${transaction.currency} Receivable`} amount={formatCurrency(transaction.amount, transaction.currency)} />
              <LedgerRow type="credit" account={`${transaction.currency} Revenue`} amount={formatCurrency(transaction.amount, transaction.currency)} />
              {transaction.fx_rate && transaction.settlement_amount && (
                <>
                  <LedgerRow type="debit" account={`${transaction.settlement_currency} Settlement`} amount={formatCurrency(transaction.settlement_amount, transaction.settlement_currency || 'USD')} />
                  <LedgerRow type="credit" account="FX Conversion" amount={formatCurrency(transaction.settlement_amount, transaction.settlement_currency || 'USD')} />
                </>
              )}
            </div>
          </div>

          {/* Event Timeline */}
          {relatedEvents.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-heading text-sm font-semibold text-foreground">Event Timeline</h4>
              <div className="space-y-2">
                {relatedEvents.map((event) => (
                  <div key={event.id} className="flex items-start gap-3 rounded-lg border border-border bg-background p-3">
                    <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-md bg-primary/10 flex-shrink-0">
                      <Zap className="h-3 w-3 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground">{event.event_type}</span>
                        <Badge variant="provider" className="text-[10px]">{event.provider}</Badge>
                      </div>
                      <span className="text-xs text-muted-foreground">{formatDate(event.created_at)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Timestamps */}
          <div className="space-y-2 text-xs text-muted-foreground border-t border-border pt-4">
            <div className="flex justify-between">
              <span>Created</span>
              <span>{formatDate(transaction.created_at)}</span>
            </div>
            <div className="flex justify-between">
              <span>Last updated</span>
              <span>{formatDate(transaction.updated_at)}</span>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function DetailRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2.5">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className="text-sm text-foreground">{value}</div>
    </div>
  );
}

function LedgerRow({ type, account, amount }: { type: 'debit' | 'credit'; account: string; amount: string }) {
  return (
    <div className="flex items-center justify-between px-3 py-2.5">
      <div className="flex items-center gap-2">
        <span className={`text-[10px] font-mono uppercase font-bold ${type === 'debit' ? 'text-destructive' : 'text-success'}`}>
          {type === 'debit' ? 'DR' : 'CR'}
        </span>
        <span className="text-sm text-muted-foreground">{account}</span>
      </div>
      <span className="text-sm font-medium text-foreground">{amount}</span>
    </div>
  );
}
