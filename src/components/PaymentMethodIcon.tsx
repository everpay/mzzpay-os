import { CreditCard, Building2, Wallet, Banknote } from 'lucide-react';

const brandLogos: Record<string, string> = {
  visa: '/logos/visa.svg',
  mastercard: '/logos/mastercard.svg',
  amex: '/logos/amex.svg',
  'american-express': '/logos/amex.svg',
  americanexpress: '/logos/amex.svg',
  'apple-pay': '/logos/apple-pay.svg',
  applepay: '/logos/apple-pay.svg',
  apple_pay: '/logos/apple-pay.svg',
  'google-pay': '/logos/google-pay.svg',
  googlepay: '/logos/google-pay.svg',
  google_pay: '/logos/google-pay.svg',
  paypal: '/logos/paypal.svg',
  klarna: '/logos/klarna.svg',
  ideal: '/logos/ideal.svg',
  bancontact: '/logos/bancontact.svg',
  alipay: '/logos/alipay.svg',
};

interface Props {
  brand?: string | null;
  paymentMethodType?: string | null;
  last4?: string | null;
  bin?: string | null;
  className?: string;
  showMask?: boolean;
}

/**
 * Renders a payment method with real brand logo + masked card number.
 * Mask format: first 6 (BIN) • • • • • • last 4
 */
export function PaymentMethodIcon({
  brand,
  paymentMethodType,
  last4,
  bin,
  className = '',
  showMask = true,
}: Props) {
  const key = (brand || paymentMethodType || '').toLowerCase().replace(/\s+/g, '-');
  const logo = brandLogos[key];

  const mask = showMask
    ? bin && last4
      ? `${bin} •••••• ${last4}`
      : last4
        ? `•••• ${last4}`
        : null
    : null;

  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <span className="inline-flex h-5 w-8 items-center justify-center rounded bg-card border border-border overflow-hidden">
        {logo ? (
          <img src={logo} alt={brand || paymentMethodType || 'Payment method'} className="h-3.5 w-auto" />
        ) : paymentMethodType === 'bank_transfer' || paymentMethodType === 'sepa' ? (
          <Building2 className="h-3 w-3 text-muted-foreground" />
        ) : paymentMethodType === 'wallet' ? (
          <Wallet className="h-3 w-3 text-muted-foreground" />
        ) : paymentMethodType === 'cash' ? (
          <Banknote className="h-3 w-3 text-muted-foreground" />
        ) : (
          <CreditCard className="h-3 w-3 text-muted-foreground" />
        )}
      </span>
      {mask && <span className="font-mono text-xs text-foreground">{mask}</span>}
    </span>
  );
}
