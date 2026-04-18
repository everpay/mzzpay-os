import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const CURRENCIES = ['USD', 'EUR', 'GBP', 'BRL', 'MXN', 'COP', 'CAD'];

interface Props {
  value: string;
  onValueChange: (v: string) => void;
  className?: string;
}

export function CurrencySelector({ value, onValueChange, className }: Props) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className={className ?? 'w-[140px] h-8 text-xs bg-card border-border'}>
        <SelectValue placeholder="Currency" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All Currencies</SelectItem>
        {CURRENCIES.map((c) => (
          <SelectItem key={c} value={c}>
            {c}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
