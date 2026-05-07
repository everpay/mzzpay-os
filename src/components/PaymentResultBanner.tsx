import { ShieldAlert, ShieldCheck, ShieldX } from 'lucide-react';

export type PaymentResultBannerTone = 'error' | 'warning' | 'success' | 'info';

export interface PaymentResultBannerData {
  tone: PaymentResultBannerTone;
  title: string;
  description: string;
  code?: string;
  txId?: string;
  descriptor?: string;
  clientId?: string;
}

interface Props {
  banner: PaymentResultBannerData | null;
  onDismiss?: () => void;
}

export function PaymentResultBanner({ banner, onDismiss }: Props) {
  if (!banner) return null;

  const toneClass =
    banner.tone === 'error'
      ? 'border-red-700 bg-red-600 text-white'
      : banner.tone === 'success'
      ? 'border-emerald-700 bg-emerald-600 text-white'
      : banner.tone === 'warning'
      ? 'border-amber-600 bg-amber-500 text-white'
      : 'border-sky-700 bg-sky-600 text-white';

  return (
    <div
      role={banner.tone === 'error' ? 'alert' : 'status'}
      aria-live={banner.tone === 'error' ? 'assertive' : 'polite'}
      data-testid="payment-result-banner"
      data-tone={banner.tone}
      className={`flex items-start justify-between gap-3 rounded-lg border-2 p-4 shadow-md ${toneClass}`}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 font-semibold">
          {banner.tone === 'error' ? (
            <ShieldX className="h-4 w-4 shrink-0" />
          ) : banner.tone === 'success' ? (
            <ShieldCheck className="h-4 w-4 shrink-0" />
          ) : (
            <ShieldAlert className="h-4 w-4 shrink-0" />
          )}
          <span>{banner.title}</span>
          {banner.code && (
            <span className="rounded bg-black/25 px-1.5 py-0.5 text-[11px] font-mono">
              code {banner.code}
            </span>
          )}
        </div>
        <p className="mt-1 text-sm leading-relaxed text-white/95">{banner.description}</p>
        {(banner.descriptor || banner.clientId) && (
          <div className="mt-1.5 flex flex-wrap gap-2 text-[11px] font-mono text-white/80">
            {banner.descriptor && <span>descriptor: {banner.descriptor}</span>}
            {banner.clientId && <span>client-id: {banner.clientId}</span>}
          </div>
        )}
        {banner.txId && (
          <p className="mt-1 font-mono text-[11px] text-white/75">tx {banner.txId.slice(0, 8)}…</p>
        )}
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="rounded p-1 text-white/80 transition hover:bg-black/20 hover:text-white"
          aria-label="Dismiss"
        >
          ✕
        </button>
      )}
    </div>
  );
}
