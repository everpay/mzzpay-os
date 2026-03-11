import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface RollingReserve {
  id: string;
  merchant_id: string;
  transaction_id: string;
  amount: number;
  currency: string;
  reserve_percent: number;
  status: string;
  held_at: string;
  release_at: string;
  released_at: string | null;
  created_at: string;
}

export function useRollingReserves() {
  return useQuery({
    queryKey: ['rolling-reserves'],
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
        .from('rolling_reserves')
        .select('*')
        .eq('merchant_id', merchant.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as RollingReserve[];
    },
  });
}

export function useCardVelocity() {
  return useQuery({
    queryKey: ['card-velocity'],
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
        .from('card_velocity')
        .select('*')
        .eq('merchant_id', merchant.id)
        .order('transaction_date', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data || [];
    },
  });
}
