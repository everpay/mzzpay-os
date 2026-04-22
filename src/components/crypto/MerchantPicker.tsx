import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Props {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  includeAll?: boolean;
}

export function MerchantPicker({ value, onChange, className, placeholder = 'Select merchant', includeAll = true }: Props) {
  const { data: merchants = [] } = useQuery({
    queryKey: ['merchants-min'],
    queryFn: async () => {
      const { data } = await (supabase as any).from('merchants').select('id, name').order('name');
      return (data || []) as Array<{ id: string; name: string }>;
    },
  });

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={className}><SelectValue placeholder={placeholder} /></SelectTrigger>
      <SelectContent>
        {includeAll && <SelectItem value="all">All merchants</SelectItem>}
        {merchants.map((m) => (
          <SelectItem key={m.id} value={m.id}>{m.name || m.id.slice(0, 8)}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
