import { AlertTriangle, RefreshCw, Building2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PaymentResultBanner, type PaymentResultBannerData } from '@/components/PaymentResultBanner';

/**
 * Shared decline/retry overlay used by NewPayment, Checkout, and PayInvoice.
 * Ensures consistent ShieldHub 004 messaging and decline UX everywhere.
 */

// ── Inline decline banner (non-blocking) ────────────────────────────
interface InlineBannerProps {
  banner: PaymentResultBannerData | null;
  onDismiss?: () => void;
}

export function InlineDeclineBanner({ banner, onDismiss }: InlineBannerProps) {
  return <PaymentResultBanner banner={banner} onDismiss={onDismiss} />;
}

// ── Full-screen retry overlay ───────────────────────────────────────
interface RetryOverlayProps {
  visible: boolean;
  errorMessage: string;
  retryCount: number;
  maxRetries?: number;
  isSubmitting?: boolean;
  /** Currently selected payment method — used for the "try alternate" button */
  currentMethod?: string;
  /** Optional cancel URL for hosted checkout flows */
  cancelUrl?: string | null;
  /** Optional idempotency key to display */
  idempotencyKey?: string;
  onRetry: () => void;
  onSwitchMethod?: (newMethod: string) => void;
  onDismiss?: () => void;
}

export function DeclineRetryOverlay({
  visible,
  errorMessage,
  retryCount,
  maxRetries = 3,
  isSubmitting = false,
  currentMethod = 'card',
  cancelUrl,
  idempotencyKey,
  onRetry,
  onSwitchMethod,
  onDismiss,
}: RetryOverlayProps) {
  if (!visible) return null;

  const alternateMethod = currentMethod === 'card' ? 'openbanking' : 'card';
  const alternateLabel = currentMethod === 'card' ? 'Bank Transfer' : 'Card';

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl space-y-5">
        <div className="mx-auto h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
          <AlertTriangle className="h-8 w-8 text-destructive" />
        </div>
        <h2 className="text-xl font-bold text-foreground text-center">Payment Failed</h2>
        <p className="text-sm text-muted-foreground text-center">
          {errorMessage || "Your payment couldn't be processed."}
        </p>
        <div className="space-y-3">
          <Button
            className="w-full gap-2"
            disabled={isSubmitting}
            onClick={onRetry}
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Retry Payment
          </Button>
          {onSwitchMethod && (
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={() => {
                onDismiss?.();
                onSwitchMethod(alternateMethod);
              }}
            >
              <Building2 className="h-4 w-4" /> Try {alternateLabel} Instead
            </Button>
          )}
          {cancelUrl && (
            <Button variant="ghost" className="w-full text-muted-foreground" asChild>
              <a href={cancelUrl}>Cancel and return</a>
            </Button>
          )}
        </div>
        <div className="space-y-1 text-center">
          <p className="text-xs text-muted-foreground">
            Attempt {retryCount} of {maxRetries} · Secured by MZZPay
          </p>
          {idempotencyKey && (
            <p className="text-[10px] font-mono text-muted-foreground/70 break-all">
              key: {idempotencyKey}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
