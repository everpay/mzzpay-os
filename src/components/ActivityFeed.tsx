import { useProviderEvents } from '@/hooks/useProviderEvents';
import { Badge } from '@/components/ui/badge';
import { formatRelativeTime, formatCurrency } from '@/lib/format';
import { Zap, CreditCard, Mail, Globe } from 'lucide-react';
import { getProviderLogo } from '@/lib/payment-method-logos';

export function ActivityFeed({ limit = 5 }: { limit?: number }) {
  const { data: allEvents = [], isLoading } = useProviderEvents();
  const events = allEvents.slice(0, limit);

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-card animate-fade-in">
      <div className="mb-4 flex items-center gap-2">
        <Zap className="h-4 w-4 text-primary" />
        <h3 className="font-heading text-sm font-semibold text-foreground">Activity Feed</h3>
      </div>
      {isLoading ? (
        <div className="flex items-center justify-center p-6">
          <p className="text-sm text-muted-foreground">Loading events...</p>
        </div>
      ) : events.length === 0 ? (
        <div className="flex items-center justify-center p-6">
          <p className="text-sm text-muted-foreground">No recent events</p>
        </div>
      ) : (
        <div className="space-y-3">
          {events.map((event) => {
            const payload: any = event.payload || {};
            const code = String(payload?.error?.code || payload?.code || payload?.failure_subtype || '').toUpperCase();
            const is3DSFail = ['3DS_TIMEOUT', '3DS_REDIRECT_MISSING_URL', '3DS_FAILED'].includes(code) || event.event_type === 'payment.timeout';
            const isFailed = event.event_type?.includes('failed') || event.event_type?.includes('decline') || is3DSFail;
            const isSuccess = event.event_type?.includes('completed') || event.event_type?.includes('success') || event.event_type?.includes('confirmed');

            const failLabel =
              code === '3DS_TIMEOUT' ? '3DS Timeout — issuer never returned OTP result' :
              code === '3DS_REDIRECT_MISSING_URL' ? '3DS Failed — acquirer returned no challenge URL' :
              code === '3DS_FAILED' ? '3DS Failed — issuer rejected authentication' :
              event.event_type === 'payment.timeout' ? 'Payment timeout — auto-failed by watcher' :
              null;

            // Extract customer payment details from payload
            const customerEmail = payload?.customer_email || payload?.customerEmail || payload?.email || '';
            const customerName = payload?.customer_name || payload?.customerName || 
              [payload?.first_name || payload?.firstName, payload?.last_name || payload?.lastName].filter(Boolean).join(' ') || '';
            const amount = payload?.amount;
            const currency = payload?.currency || '';
            const cardLast4 = payload?.card_last4 || payload?.cardLast4 || '';
            const cardFirst6 = payload?.card_first6 || payload?.cardFirst6 || '';
            const cardBrand = payload?.card_brand || payload?.cardBrand || '';
            const customerIp = payload?.customer_ip || payload?.ip_address || '';
            const billingCountry = payload?.billing_country || payload?.country || '';
            const declineReason = payload?.error?.message || payload?.decline_message || payload?.processor_error_message || '';

            const providerLogo = getProviderLogo(event.provider);

            return (
              <div key={event.id} className="flex items-start gap-3 rounded-lg p-3 transition-colors hover:bg-muted/30 border border-border/50">
                <div className={`mt-0.5 h-2 w-2 rounded-full flex-shrink-0 ${
                  isFailed || is3DSFail ? 'bg-destructive' : 
                  isSuccess ? 'bg-emerald-500' : 
                  'bg-primary animate-pulse-glow'
                }`} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    {providerLogo ? (
                      <img src={providerLogo} alt={event.provider} className="h-4 w-auto rounded" />
                    ) : (
                      <Badge variant="provider" className="text-[10px]">{event.provider}</Badge>
                    )}
                    <span className="text-xs font-medium text-foreground">{event.event_type}</span>
                    {is3DSFail && (
                      <Badge variant="destructive" className="text-[10px]">{code || '3DS'}</Badge>
                    )}
                  </div>

                  {/* Customer payment info */}
                  {(amount || customerEmail || cardLast4) && (
                    <div className="mt-1.5 space-y-1">
                      {amount && (
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-xs font-semibold text-foreground">
                            {formatCurrency(Number(amount), currency || 'USD')}
                          </span>
                          {currency && <span className="text-[10px] text-muted-foreground">{currency}</span>}
                        </div>
                      )}
                      {(cardFirst6 || cardLast4) && (
                        <div className="flex items-center gap-1.5">
                          <CreditCard className="h-3 w-3 text-muted-foreground" />
                          <span className="font-mono text-[11px] text-muted-foreground">
                            {cardFirst6 ? `${cardFirst6} •••• ${cardLast4}` : `•••• ${cardLast4}`}
                          </span>
                          {cardBrand && <span className="text-[10px] text-muted-foreground capitalize">{cardBrand}</span>}
                        </div>
                      )}
                      {customerEmail && (
                        <div className="flex items-center gap-1.5">
                          <Mail className="h-3 w-3 text-muted-foreground" />
                          <span className="text-[11px] text-muted-foreground truncate max-w-[200px]">{customerEmail}</span>
                        </div>
                      )}
                      {(customerName || billingCountry || customerIp) && (
                        <div className="flex items-center gap-2 flex-wrap">
                          {customerName && <span className="text-[11px] text-muted-foreground">{customerName}</span>}
                          {billingCountry && (
                            <span className="flex items-center gap-0.5">
                              <Globe className="h-2.5 w-2.5 text-muted-foreground" />
                              <span className="text-[10px] text-muted-foreground">{billingCountry}</span>
                            </span>
                          )}
                          {customerIp && <span className="font-mono text-[10px] text-muted-foreground">{customerIp}</span>}
                        </div>
                      )}
                    </div>
                  )}

                  {failLabel && (
                    <p className="mt-1 text-[11px] text-destructive/80">{failLabel}</p>
                  )}
                  {declineReason && !failLabel && (
                    <p className="mt-1 text-[11px] text-destructive/80">{declineReason}</p>
                  )}
                  <div className="mt-1 flex items-center gap-2">
                    {event.transaction_id && (
                      <span className="font-mono text-[10px] text-muted-foreground">{event.transaction_id}</span>
                    )}
                    <span className="text-[10px] text-muted-foreground">{formatRelativeTime(event.created_at)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
