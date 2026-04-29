import { useEffect } from 'react';
import type { Transaction } from '@/lib/types';
import { useTransactionProviderEvents } from '@/hooks/useTransactionProviderEvents';
import { useTapixCache, useTapixEnrich, getEnrichmentSummary } from '@/hooks/useTapixEnrichment';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatDate, getStatusVariant } from '@/lib/format';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import {
  ArrowRight, Clock, Zap, CreditCard, Mail, FileText, Hash, RefreshCw, Shield,
  Wifi, Globe, Monitor, AlertTriangle, MapPin, Phone, ShieldOff, ShieldCheck, Activity, Loader2, Tag,
} from 'lucide-react';
import { CardBrandBadge } from '@/components/CardBrandBadge';
import { PaymentMethodIcon } from '@/components/PaymentMethodIcon';
import { SettlementTimeline } from '@/components/SettlementTimeline';

interface TransactionDetailDrawerProps {
  transaction: Transaction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TransactionDetailDrawer({ transaction, open, onOpenChange }: TransactionDetailDrawerProps) {
  const { events: relatedEvents, isLoading: eventsLoading } = useTransactionProviderEvents(
    open ? transaction?.id ?? null : null,
  );

  const txIds = open && transaction ? [transaction.id] : [];
  const { data: tapixCache = {} } = useTapixCache(txIds);
  const tapixEnrich = useTapixEnrich();
  const inlineEnrichment = ((transaction as any)?.metadata as any)?.tapixEnrichment || null;
  const enrichment = transaction
    ? (getEnrichmentSummary(tapixCache[transaction.id]) || getEnrichmentSummary(inlineEnrichment))
    : null;

  useEffect(() => {
    if (open && transaction && !enrichment && !tapixEnrich.isPending) {
      tapixEnrich.mutate({
        transactionId: transaction.id,
        merchantId: (transaction as any).merchant_id,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, transaction?.id]);

  if (!transaction) return null;

  // Extract VGS alias and card brand from enrichment events
  const tapixEvent = relatedEvents.find((e) => e.event_type === 'enrichment.completed');
  const vaultEvent = relatedEvents.find((e) => e.event_type === 'vault.completed');

  const vgsAlias = (vaultEvent?.payload as any)?.vgs_alias || (tapixEvent?.payload as any)?.vgs_alias || null;
  // Prefer columns on the transaction (real data) and fall back to enrichment events
  const cardBrand = transaction.card_brand || (tapixEvent?.payload as any)?.card_brand || (vaultEvent?.payload as any)?.card_brand || null;
  const cardLast4 = transaction.card_last4 || (tapixEvent?.payload as any)?.card_last4 || (vaultEvent?.payload as any)?.card_last4 || null;
  const cardBin = transaction.card_bin || (tapixEvent?.payload as any)?.card_bin || (vaultEvent?.payload as any)?.card_bin || null;
  const paymentMethodType = transaction.payment_method_type || null;

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
              <div className="flex flex-wrap items-center gap-1.5 justify-end">
                <Badge variant={getStatusVariant(transaction.status)} className="text-xs">
                  {transaction.status}
                </Badge>
                {(() => {
                  // Surface the processor's canonical status (e.g. Matrix
                  // suspended/blocked/declined) alongside our internal one
                  // so support can disambiguate `processing` (= awaiting
                  // review) from `processing` (= 3DS in flight).
                  const raw = (transaction as any).processor_raw_response as Record<string, unknown> | null;
                  const mxs = raw && typeof raw === 'object'
                    ? ((raw as any).matrix_status_canonical as string | undefined)
                    : undefined;
                  if (!mxs || transaction.provider !== 'matrix') return null;
                  return (
                    <Badge variant={getStatusVariant(mxs)} className="text-[10px] capitalize">
                      matrix:{mxs}
                    </Badge>
                  );
                })()}
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              {formatDate(transaction.created_at)}
            </div>
          </div>

          {/* Payment Method / Vault Section */}
          {(vgsAlias || cardBrand || cardLast4 || paymentMethodType) && (
            <div className="space-y-3">
              <h4 className="font-heading text-sm font-semibold text-foreground flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                Payment Method
              </h4>
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-3">
                {(cardBrand || cardLast4 || cardBin) && (
                  <CardBrandBadge brand={cardBrand} last4={cardLast4} first4={cardBin?.slice(0, 6)} size="md" />
                )}
                {!cardBrand && paymentMethodType && (
                  <PaymentMethodIcon brand={null} paymentMethodType={paymentMethodType} showMask={false} />
                )}
                {paymentMethodType && (
                  <DetailRow icon={CreditCard} label="Type" value={
                    <span className="text-xs capitalize">{paymentMethodType.replace(/_/g, ' ')}</span>
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

          {/* Customer Section */}
          {(transaction.customer_email || transaction.customer_ip || transaction.user_agent || transaction.customer_country || transaction.customer_phone || transaction.customer_first_name) && (
            <div className="space-y-3">
              <h4 className="font-heading text-sm font-semibold text-foreground flex items-center gap-2">
                <Mail className="h-4 w-4 text-primary" />
                Customer
              </h4>
              <div className="grid gap-2">
                {(transaction.customer_first_name || transaction.customer_last_name) && (
                  <DetailRow icon={Mail} label="Name" value={
                    `${transaction.customer_first_name || ''} ${transaction.customer_last_name || ''}`.trim()
                  } />
                )}
                {transaction.customer_email && (
                  <DetailRow icon={Mail} label="Email" value={transaction.customer_email} />
                )}
                {transaction.customer_phone && (
                  <DetailRow icon={Phone} label="Phone" value={
                    <span className="font-mono text-xs">{transaction.customer_phone}</span>
                  } />
                )}
                {transaction.customer_ip && (
                  <DetailRow icon={Wifi} label="IP Address" value={
                    <span className="font-mono text-xs">{transaction.customer_ip}</span>
                  } />
                )}
                {transaction.customer_country && (
                  <DetailRow icon={Globe} label="Country" value={
                    <span className="font-mono text-xs uppercase">{transaction.customer_country}</span>
                  } />
                )}
                {transaction.user_agent && (
                  <DetailRow icon={Monitor} label="User Agent" value={
                    <span className="text-[10px] text-muted-foreground break-all max-w-[260px] inline-block text-right">{transaction.user_agent}</span>
                  } />
                )}
              </div>
            </div>
          )}

          {/* Billing Address */}
          {transaction.billing_address && Object.keys(transaction.billing_address).length > 0 && (
            <div className="space-y-3">
              <h4 className="font-heading text-sm font-semibold text-foreground flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                Billing Address
              </h4>
              <div className="rounded-lg border border-border bg-background p-3 text-sm text-foreground space-y-0.5">
                {transaction.billing_address.address && <p>{transaction.billing_address.address}</p>}
                <p className="text-muted-foreground">
                  {[transaction.billing_address.city, transaction.billing_address.state, transaction.billing_address.postal_code]
                    .filter(Boolean).join(', ')}
                </p>
                {transaction.billing_address.country && (
                  <p className="text-xs font-mono uppercase text-muted-foreground">{transaction.billing_address.country}</p>
                )}
              </div>
            </div>
          )}

          {/* Processor Error */}
          {(transaction.processor_error_message || transaction.processor_error_code) && (
            <div className="space-y-3">
              <h4 className="font-heading text-sm font-semibold text-destructive flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Processor Decline
              </h4>
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 space-y-2">
                {transaction.processor_error_message && (
                  <p className="text-sm text-foreground">{transaction.processor_error_message}</p>
                )}
                {transaction.processor_error_code && (
                  <p className="text-[10px] font-mono text-muted-foreground">code: {transaction.processor_error_code}</p>
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
              {transaction.description && (
                <DetailRow icon={FileText} label="Description" value={transaction.description} />
              )}
              {transaction.provider_ref && (
                <DetailRow icon={Hash} label="Provider Ref" value={
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

          {/* Settlement Timeline */}
          <SettlementTimeline transaction={transaction} events={relatedEvents} />

          {/* Event Timeline (live via Realtime) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-heading text-sm font-semibold text-foreground flex items-center gap-2">
                Event Timeline
                <span className="inline-flex items-center gap-1 text-[10px] font-normal text-success">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-success" />
                  </span>
                  Live
                </span>
              </h4>
              {eventsLoading && (
                <span className="text-[10px] text-muted-foreground">Loading…</span>
              )}
            </div>
            {relatedEvents.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border bg-background p-3 text-xs text-muted-foreground">
                Waiting for provider events…
              </div>
            ) : (
              <div className="space-y-2">
                {relatedEvents.map((event) => {
                  const t = event.event_type;
                  const isFallback = t === 'three_ds.fallback_2d';
                  const is3ds = t.startsWith('three_ds.') && !isFallback;
                  const isMatrix = t.startsWith('matrix.h2h');
                  const Icon = isFallback ? ShieldOff : is3ds ? ShieldCheck : isMatrix ? Activity : Zap;
                  const tone = isFallback
                    ? 'border-warning/40 bg-warning/5'
                    : is3ds
                      ? 'border-primary/40 bg-primary/5'
                      : isMatrix
                        ? 'border-accent/40 bg-accent/5'
                        : 'border-border bg-background';
                  const iconTone = isFallback
                    ? 'bg-warning/10 text-warning'
                    : is3ds
                      ? 'bg-primary/10 text-primary'
                      : isMatrix
                        ? 'bg-accent/10 text-accent'
                        : 'bg-primary/10 text-primary';
                  const providerEventId =
                    (event.payload as any)?.provider_event_id ??
                    (event.payload as any)?.order_id ??
                    (event.payload as any)?.transaction_reference ??
                    null;
                  return (
                    <div key={event.id} className={`flex items-start gap-3 rounded-lg border p-3 ${tone}`}>
                      <div className={`mt-0.5 flex h-6 w-6 items-center justify-center rounded-md flex-shrink-0 ${iconTone}`}>
                        <Icon className="h-3 w-3" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-foreground">{t}</span>
                          <Badge variant="provider" className="text-[10px]">{event.provider}</Badge>
                          {isFallback && (
                            <Badge variant="outline" className="text-[10px] border-warning/40 text-warning">
                              3DS → 2D
                            </Badge>
                          )}
                          {isMatrix && (
                            <Badge variant="outline" className="text-[10px] border-accent/40 text-accent">
                              H2H
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-muted-foreground">{formatDate(event.created_at)}</span>
                          {providerEventId && (
                            <span className="font-mono text-[10px] text-muted-foreground truncate">
                              · {String(providerEventId)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Payment Enrichment (Tapix) */}
          <div className="space-y-3">
            <h4 className="font-heading text-sm font-semibold text-foreground flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              Payment Enrichment
              {tapixEnrich.isPending && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
            </h4>
            {enrichment && enrichment.found ? (
              <div className="rounded-lg border border-border bg-background p-4 space-y-3">
                <div className="flex items-start gap-3">
                  {enrichment.merchantLogo ? (
                    <img src={enrichment.merchantLogo} alt={enrichment.merchantName || 'merchant'} className="h-10 w-10 rounded-lg object-contain bg-muted/30 border border-border" />
                  ) : (
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <CreditCard className="h-5 w-5 text-primary" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{enrichment.merchantName || 'Unknown merchant'}</p>
                    {enrichment.category && (
                      <p className="text-xs text-muted-foreground">{enrichment.category}</p>
                    )}
                  </div>
                </div>
                {enrichment.address && (
                  <div className="flex items-start gap-2 text-xs text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                    <span>{enrichment.address}</span>
                  </div>
                )}
                {enrichment.shopUrl && (
                  <div className="flex items-center gap-2 text-xs">
                    <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                    <a href={enrichment.shopUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate">
                      {enrichment.shopUrl}
                    </a>
                  </div>
                )}
                {enrichment.tags && enrichment.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {enrichment.tags.slice(0, 6).map((t: string) => (
                      <Badge key={t} variant="outline" className="text-[10px] gap-1">
                        <Tag className="h-2.5 w-2.5" /> {t}
                      </Badge>
                    ))}
                  </div>
                )}
                <div className="pt-2 border-t border-border flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground">Enriched via Tapix</span>
                  <Badge variant="outline" className="text-[10px] capitalize">{enrichment.enrichmentType}</Badge>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-border bg-muted/30 p-4 text-center">
                <p className="text-xs text-muted-foreground">
                  {tapixEnrich.isPending ? 'Enriching transaction data…' : 'No enrichment data available'}
                </p>
              </div>
            )}
          </div>

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
