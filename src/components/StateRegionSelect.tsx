import * as React from 'react';
import { State } from 'country-state-city';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';

interface Props {
  countryCode?: string;
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
}

export function StateRegionSelect({ countryCode, value, onValueChange, placeholder }: Props) {
  const states = React.useMemo(
    () => (countryCode ? State.getStatesOfCountry(countryCode) : []),
    [countryCode]
  );

  if (!countryCode || states.length === 0) {
    return (
      <Input
        type="text"
        placeholder={placeholder || 'State / Province / Region'}
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        className="bg-background border-border"
      />
    );
  }

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className="bg-background border-border">
        <SelectValue placeholder={placeholder || 'Select state / province / region'} />
      </SelectTrigger>
      <SelectContent className="max-h-72">
        {states.map((s) => (
          <SelectItem key={s.isoCode} value={s.isoCode}>
            {s.name} ({s.isoCode})
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
