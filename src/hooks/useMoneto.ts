import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface CreatePaymentParams {
  amount: number;
  currency_code: string;
  country_code: string;
  success_url: string;
  cancel_url: string;
  first_name: string;
  last_name: string;
  email?: string;
}

interface CreatePayoutParams {
  amount: number;
  currency_code: string;
  country_code: string;
  bank_account: {
    institution_number: string;
    transit_number: string;
    account_number: string;
    account_holder_name: string;
  };
  description?: string;
}

export function useCreateMonetoPayment() {
  return useMutation({
    mutationFn: async (params: CreatePaymentParams) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await supabase.functions.invoke('moneto-wallet', {
        body: params,
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (response.error) throw response.error;
      return response.data;
    },
  });
}

export function useValidateMonetoPayment() {
  return useMutation({
    mutationFn: async (payment_request_id: string) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/moneto-wallet?action=validate-payment`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ payment_request_id }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to validate payment');
      }

      return response.json();
    },
  });
}

export function useCreateMonetoPayout() {
  return useMutation({
    mutationFn: async (params: CreatePayoutParams) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/moneto-wallet?action=create-payout`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(params),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create payout');
      }

      return response.json();
    },
  });
}
