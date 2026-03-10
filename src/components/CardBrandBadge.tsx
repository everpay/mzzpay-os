import { CreditCard } from 'lucide-react';

const brandLogos: Record<string, string> = {
  visa: '/logos/visa.svg',
  mastercard: '/logos/mastercard.svg',
  amex: '/logos/amex.svg',
  'apple-pay': '/logos/apple-pay.svg',
  'google-pay': '/logos/google-pay.svg',
};

const brandColors: Record<string, string> = {
  visa: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  mastercard: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  amex: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
  discover: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  unionpay: 'bg-red-500/10 text-red-400 border-red-500/20',
  jcb: 'bg-green-500/10 text-green-400 border-green-500/20',
};

interface CardBrandBadgeProps {
  brand?: string | null;
  last4?: string | null;
  first4?: string | null;
  expMonth?: string | null;
  expYear?: string | null;
  size?: 'sm' | 'md';
}

export function CardBrandBadge({ brand, last4, first4, expMonth, expYear, size = 'md' }: CardBrandBadgeProps) {
  const normalizedBrand = (brand || 'unknown').toLowerCase().replace(/\s+/g, '');
  const logoSrc = brandLogos[normalizedBrand];
  const colorClass = brandColors[normalizedBrand] || 'bg-muted text-muted-foreground border-border';

  const maskedNumber = first4
    ? `${first4} •••• •••• ${last4 || '••••'}`
    : `•••• •••• •••• ${last4 || '••••'}`;

  if (size === 'sm') {
    return (
      <span className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium ${colorClass}`}>
        {logoSrc ? (
          <img src={logoSrc} alt={brand || 'Card'} className="h-3.5 w-auto" />
        ) : (
          <CreditCard className="h-3 w-3" />
        )}
        •••• {last4 || '••••'}
      </span>
    );
  }

  return (
    <div className={`inline-flex items-center gap-3 rounded-lg border px-3 py-2 ${colorClass}`}>
      {logoSrc ? (
        <img src={logoSrc} alt={brand || 'Card'} className="h-6 w-auto" />
      ) : (
        <CreditCard className="h-5 w-5" />
      )}
      <div>
        <p className="font-mono text-sm font-medium tracking-wider">{maskedNumber}</p>
        {expMonth && expYear && (
          <p className="text-[10px] opacity-70">Expires {expMonth}/{expYear}</p>
        )}
      </div>
    </div>
  );
}
