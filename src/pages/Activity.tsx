import { AppLayout } from '@/components/AppLayout';
import { useProviderEvents } from '@/hooks/useProviderEvents';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/format';
import { PaymentMethodIcon } from '@/components/PaymentMethodIcon';
import { Zap, ArrowDownRight, ArrowUpRight, RefreshCw, ShieldAlert, AlertTriangle } from 'lucide-react';

function getEventIcon(eventType: string) {
  if (eventType.includes('declined') || eventType.includes('failed')) return AlertTriangle;
  if (eventType.includes('refund')) return RefreshCw;
  if (eventType.includes('payout') || eventType.includes('withdrawal')) return ArrowUpRight;
  if (eventType.includes('three_ds') || eventType.includes('3ds')) return ShieldAlert;
  if (eventType.includes('payment')) return ArrowDownRight;
  return Zap;
}

function getEventTone(eventType: string) {
  if (eventType.includes('declined') || eventType.includes('failed')) return 'bg-destructive/10 text-destructive';
  if (eventType.includes('refund')) return 'bg-amber-500/10 text-amber-500';
  if (eventType.includes('completed') || eventType.includes('approved')) return 'bg-emerald-500/10 text-emerald-500';
  if (eventType.includes('three_ds') || eventType.includes('redirect')) return 'bg-blue-500/10 text-blue-500';
  return 'bg-primary/10 text-primary';
}

function extractPaymentInfo(payload: Record<string, unknown>) {
  const cardBrand = (payload.card_brand as string) || (payload.cardBrand as string) || null;
  const cardLast4 = (payload.card_last4 as string) || (payload.cardLast4 as string) || (payload.last4 as string) || null;
  const cardBin = (payload.card_bin as string) || (payload.cardBin as string) || (payload.bin as string) || (payload.card_first6 as string) || null;
  const paymentMethod = (payload.payment_method as string) || (payload.paymentMethod as string) || null;
  const amount = payload.amount != null ? String(payload.amount) : null;
  const currency = (payload.currency as string) || (payload.settlement_currency as string) || null;

  // Detect brand from BIN if not explicit
  let detectedBrand = cardBrand;
  if (!detectedBrand && cardBin) {
    const b = cardBin;
    if (b.startsWith('4')) detectedBrand = 'visa';
    else if (b.startsWith('5') || (b.startsWith('2') && parseInt(b.slice(0, 4)) >= 2221 && parseInt(b.slice(0, 4)) <= 2720)) detectedBrand = 'mastercard';
    else if (b.startsWith('34') || b.startsWith('37')) detectedBrand = 'amex';
    else if (b.startsWith('6')) detectedBrand = 'discover';
    else if (b.startsWith('62')) detectedBrand = 'unionpay';
  }

  return { cardBrand: detectedBrand, cardLast4, cardBin, paymentMethod, amount, currency };
}

export default function Activity() {
  const { data: events = [], isLoading } = useProviderEvents();

  return (
    <AppLayout>
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">Activity</h1>
        <p className="mt-1 text-sm text-muted-foreground">Provider webhook events and system activity</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center p-12 rounded-xl border border-border bg-card">
          <p className="text-muted-foreground">Loading events...</p>
        </div>
      ) : events.length === 0 ? (
        <div className="flex items-center justify-center p-12 rounded-xl border border-border bg-card">
          <p className="text-muted-foreground">No events yet</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card shadow-card">
          <div className="divide-y divide-border">
            {events.map((event) => {
              const Icon = getEventIcon(event.event_type);
              const iconTone = getEventTone(event.event_type);
              const pm = extractPaymentInfo(event.payload);

              return (
                <div key={event.id} className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-muted/30">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-lg flex-shrink-0 ${iconTone}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-foreground">{event.event_type}</span>
                      <Badge variant="provider" className="text-[10px]">{event.provider}</Badge>
                    </div>
                    <div className="mt-1 flex items-center gap-3 flex-wrap">
                      {/* Card brand icon + masked number */}
                      {(pm.cardBrand || pm.paymentMethod) && (
                        <PaymentMethodIcon
                          brand={pm.cardBrand}
                          paymentMethodType={pm.paymentMethod}
                          last4={pm.cardLast4}
                          bin={pm.cardBin}
                          showMask={!!(pm.cardLast4 || pm.cardBin)}
                          className="text-xs"
                        />
                      )}
                      {/* Amount badge */}
                      {pm.amount && (
                        <span className="font-mono text-xs font-medium text-foreground">
                          {pm.currency ? `${pm.amount} ${pm.currency}` : pm.amount}
                        </span>
                      )}
                      {/* Transaction ID */}
                      {event.transaction_id && (
                        <span className="font-mono text-[10px] text-muted-foreground">{event.transaction_id.slice(0, 12)}…</span>
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground flex-shrink-0 whitespace-nowrap">{formatDate(event.created_at)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </AppLayout>
  );
}
