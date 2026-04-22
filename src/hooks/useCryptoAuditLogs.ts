import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CryptoAuditLog {
  id: string;
  resource_type: string;
  resource_id: string;
  change_type: string;
  changed_by: string | null;
  user_token: string | null;
  new_value: any;
  old_value?: any;
  created_at: string;
}

export function useCryptoAuditLogs() {
  return useQuery({
    queryKey: ['crypto-audit-logs'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('audit_logs')
        .select('*')
        .eq('resource_type', 'crypto')
        .order('created_at', { ascending: false })
        .limit(1000);
      if (error) throw error;
      return (data || []) as CryptoAuditLog[];
    },
  });
}
