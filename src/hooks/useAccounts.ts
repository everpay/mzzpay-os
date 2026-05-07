import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Account } from '@/lib/types';
import { stripSensitiveFields } from '@/lib/api-response-schemas';

export function useAccounts() {
  return useQuery({
    queryKey: ['accounts'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: merchant } = await supabase
        .from('merchants')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!merchant) throw new Error('Merchant not found');

      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .eq('merchant_id', merchant.id);

      if (error) throw error;

      const sanitized = (data ?? []).map((row: any) => stripSensitiveFields(row));
      return sanitized as unknown as Account[];
    },
  });
}
