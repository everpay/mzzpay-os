import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Dispute {
  id: string;
  chargeflow_id: string | null;
  amount: number;
  currency: string;
  status: string;
  reason: string | null;
  evidence_due_date: string | null;
  provider: string | null;
  customer_email: string | null;
  description: string | null;
  outcome: string | null;
  transaction_id: string | null;
  chargeflow_payload: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export function useDisputes() {
  return useQuery({
    queryKey: ['disputes'],
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
        .from('disputes')
        .select('*')
        .eq('merchant_id', merchant.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data ?? []) as Dispute[];
    },
  });
}

export function useDisputeStats(disputes: Dispute[]) {
  const openCount = disputes.filter(d => !['won', 'lost'].includes(d.status)).length;
  const wonCount = disputes.filter(d => d.outcome === 'won' || d.status === 'won').length;
  const lostCount = disputes.filter(d => d.outcome === 'lost' || d.status === 'lost').length;
  const resolved = wonCount + lostCount;
  const winRate = resolved > 0 ? Math.round((wonCount / resolved) * 100) : 0;
  const totalAmount = disputes.reduce((sum, d) => sum + d.amount, 0);
  const recoveredAmount = disputes
    .filter(d => d.outcome === 'won' || d.status === 'won')
    .reduce((sum, d) => sum + d.amount, 0);

  return { openCount, wonCount, lostCount, winRate, totalAmount, recoveredAmount };
}
