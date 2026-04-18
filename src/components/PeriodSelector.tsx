import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export type PeriodValue = '24h' | '7d' | '30d' | '90d' | '1y' | 'all';

const OPTIONS: { value: PeriodValue; label: string }[] = [
  { value: '24h', label: 'Last 24 hours' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
  { value: '1y', label: 'Last year' },
  { value: 'all', label: 'All time' },
];

export function getPeriodCutoff(period: PeriodValue): Date | null {
  if (period === 'all') return null;
  const now = new Date();
  const map: Record<Exclude<PeriodValue, 'all'>, number> = {
    '24h': 1,
    '7d': 7,
    '30d': 30,
    '90d': 90,
    '1y': 365,
  };
  const cutoff = new Date(now);
  cutoff.setDate(now.getDate() - map[period as Exclude<PeriodValue, 'all'>]);
  return cutoff;
}

interface Props {
  value: PeriodValue;
  onValueChange: (v: PeriodValue) => void;
  className?: string;
}

export function PeriodSelector({ value, onValueChange, className }: Props) {
  return (
    <Select value={value} onValueChange={(v) => onValueChange(v as PeriodValue)}>
      <SelectTrigger className={className ?? 'w-[150px] h-8 text-xs bg-card border-border'}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {OPTIONS.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
