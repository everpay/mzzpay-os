import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface CryptoCommission {
  id: string;
  merchant_id: string | null;
  asset_id: string | null;
  tx_type: 'deposit' | 'withdrawal' | 'convert' | 'transfer' | 'payment';
  fee_percent: number;
  fee_fixed: number;
  split_to_wallet_id: string | null;
  split_percent: number;
  is_active: boolean;
  created_at: string;
}

export function useCryptoCommissions() {
  return useQuery({
    queryKey: ['crypto-commissions'],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from('crypto_commissions').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as CryptoCommission[];
    },
  });
}

export function useUpsertCommission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: Partial<CryptoCommission> & { id?: string }) => {
      const { data, error } = await supabase.functions.invoke('elektropay-wallet', {
        body: { action: 'commission_upsert', payload: { row } },
      });
      if (error) throw new Error(error.message);
      if (!data?.success) throw new Error(data?.error || 'Save failed');
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['crypto-commissions'] });
      toast.success('Commission saved');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteCommission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase.functions.invoke('elektropay-wallet', {
        body: { action: 'commission_delete', payload: { id } },
      });
      if (error) throw new Error(error.message);
      if (!data?.success) throw new Error(data?.error || 'Delete failed');
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['crypto-commissions'] });
      toast.success('Commission deleted');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
