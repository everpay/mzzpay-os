import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

import { notifyError, notifySuccess } from '@/lib/error-toast';

export interface WebhookEvent {
  id: string;
  event_id: string;
  event_type: string;
  payload: Record<string, any>;
  processed: boolean;
  error_message: string | null;
  attempt_count: number | null;
  last_attempt_at: string | null;
  created_at: string;
}

export function useElektropayWebhookEvents() {
  return useQuery({
    queryKey: ['elektropay-webhook-events'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('elektropay_webhook_events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data || []) as WebhookEvent[];
    },
  });
}

export function useRetryWebhook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (event_id: string) => {
      const { data, error } = await supabase.functions.invoke('elektropay-wallet', {
        body: { action: 'retry_webhook', payload: { event_id } },
      });
      if (error) throw new Error(error.message);
      if (!data?.success) throw new Error(data?.error || 'Retry failed');
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['elektropay-webhook-events'] });
      qc.invalidateQueries({ queryKey: ['crypto-wallets'] });
      qc.invalidateQueries({ queryKey: ['crypto-transactions'] });
      notifySuccess('Webhook reprocessed');
    },
    onError: (e: Error) => notifyError(e.message),
  });
}
