import { Currency, TransactionStatus, PayoutStatus } from './types';

const currencyFormats: Record<Currency, { locale: string; code: string }> = {
  USD: { locale: 'en-US', code: 'USD' },
  EUR: { locale: 'de-DE', code: 'EUR' },
  GBP: { locale: 'en-GB', code: 'GBP' },
  BRL: { locale: 'pt-BR', code: 'BRL' },
  MXN: { locale: 'es-MX', code: 'MXN' },
  COP: { locale: 'es-CO', code: 'COP' },
  CAD: { locale: 'en-CA', code: 'CAD' },
};

export function formatCurrency(amount: number, currency: Currency): string {
  const fmt = currencyFormats[currency];
  return new Intl.NumberFormat(fmt.locale, {
    style: 'currency',
    currency: fmt.code,
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateStr));
}

export function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export function getStatusVariant(status: TransactionStatus | PayoutStatus) {
  switch (status) {
    case 'completed': return 'success' as const;
    case 'processing': return 'warning' as const;
    case 'pending': return 'secondary' as const;
    case 'failed': return 'destructive' as const;
    case 'refunded': return 'outline' as const;
    default: return 'secondary' as const;
  }
}
