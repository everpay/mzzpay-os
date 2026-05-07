import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Transaction } from '@/lib/types';
import { stripSensitiveFields } from '@/lib/api-response-schemas';

export function useTransactions() {
  return useQuery({
    queryKey: ['transactions'],
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
        .from('transactions')
        .select('*')
        .eq('merchant_id', merchant.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Runtime-strip sensitive fields (client_id, providerResponse, etc.)
      const sanitized = (data ?? []).map((row: any) => stripSensitiveFields(row));
      return sanitized as unknown as Transaction[];
    },
  });
}
