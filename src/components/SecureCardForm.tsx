import { useEffect, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Shield } from 'lucide-react';

interface SecureCardFormProps {
  onCardData: (data: { cardNumber: string; expMonth: string; expYear: string; cvc: string; holderName?: string }) => void;
  showHolderName?: boolean;
  disabled?: boolean;
  className?: string;
  resetKey?: number | string;
}

const BRAND_LOGOS: Record<string, string> = {
  visa: '/logos/visa.svg',
  mastercard: '/logos/mastercard.svg',
  amex: '/logos/american-express.svg',
  discover: '/logos/discover.svg',
};

function detectBrand(number: string): string {
  const n = number.replace(/\s/g, '');
  if (!n) return '';
  if (n.startsWith('4')) return 'visa';
  if (n.startsWith('5') || (n.startsWith('2') && parseInt(n.slice(0, 4)) >= 2221 && parseInt(n.slice(0, 4)) <= 2720)) return 'mastercard';
  if (n.startsWith('34') || n.startsWith('37')) return 'amex';
  if (n.startsWith('6')) return 'discover';
  return '';
}

function formatCardNumber(value: string): string {
  const digits = value.replace(/\D/g, '');
  const groups = digits.match(/.{1,4}/g);
  return groups ? groups.join(' ') : digits;
}

export function SecureCardForm({ onCardData, showHolderName = false, disabled = false, className = '', resetKey }: SecureCardFormProps) {
  const [cardNumber, setCardNumber] = useState('');
  const [expMonth, setExpMonth] = useState('');
  const [expYear, setExpYear] = useState('');
  const [cvc, setCvc] = useState('');
  const [holderName, setHolderName] = useState('');
  const brand = detectBrand(cardNumber);

  useEffect(() => {
    if (resetKey === undefined) return;
    setCardNumber('');
    setExpMonth('');
    setExpYear('');
    setCvc('');
    setHolderName('');
  }, [resetKey]);

  useEffect(() => {
    onCardData({
      cardNumber: cardNumber.replace(/\s/g, ''),
      expMonth,
      expYear,
      cvc,
      holderName: holderName || undefined,
    });
  }, [cardNumber, expMonth, expYear, cvc, holderName]);

  const handleCardChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCardNumber(e.target.value);
    if (formatted.replace(/\s/g, '').length <= 19) setCardNumber(formatted);
  };

  return (
    <div className={`space-y-4 rounded-lg border border-primary/20 bg-primary/5 p-4 ${className}`}>
      <div className="flex items-center gap-2 mb-2">
        <Shield className="h-5 w-5 text-primary" />
        <div>
          <p className="text-sm font-medium text-foreground">Secure Payment</p>
          <p className="text-xs text-muted-foreground">End-to-end encrypted card entry</p>
        </div>
      </div>

      {showHolderName && (
        <div className="space-y-2">
          <Label>Cardholder Name</Label>
          <Input type="text" placeholder="Joe Doe" value={holderName} onChange={(e) => setHolderName(e.target.value)} disabled={disabled} className="bg-background border-border" />
        </div>
      )}

      <div className="space-y-2">
        <Label>Card Number</Label>
        <div className="relative">
          <Input type="text" placeholder="4242 4242 4242 4242" value={cardNumber} onChange={handleCardChange} disabled={disabled} className="bg-background border-border font-mono pr-14" maxLength={23} />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {brand && BRAND_LOGOS[brand] ? (
              <img src={BRAND_LOGOS[brand]} alt={brand} className="h-6 w-auto rounded-sm" />
            ) : (
              <div className="flex gap-0.5">
                {Object.entries(BRAND_LOGOS).map(([b, src]) => (
                  <img key={b} src={src} alt={b} className="h-4 w-auto rounded-sm opacity-30" />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-2">
          <Label>Month</Label>
          <Input type="text" placeholder="MM" value={expMonth} onChange={(e) => setExpMonth(e.target.value.replace(/\D/g, '').slice(0, 2))} disabled={disabled} className="bg-background border-border" maxLength={2} />
        </div>
        <div className="space-y-2">
          <Label>Year</Label>
          <Input type="text" placeholder="YY" value={expYear} onChange={(e) => setExpYear(e.target.value.replace(/\D/g, '').slice(0, 4))} disabled={disabled} className="bg-background border-border" maxLength={4} />
        </div>
        <div className="space-y-2">
          <Label>CVC</Label>
          <Input type="text" placeholder="123" value={cvc} onChange={(e) => setCvc(e.target.value.replace(/\D/g, '').slice(0, 4))} disabled={disabled} className="bg-background border-border" maxLength={4} />
        </div>
      </div>
    </div>
  );
}
