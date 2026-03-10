import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ProviderFee {
  id: string;
  provider: string;
  region: string;
  fee_type: string;
  rail: string | null;
  description: string | null;
  rate_percent: number;
  flat_fee: number;
  flat_fee_currency: string;
  volume_tier: string;
  is_active: boolean;
}

export interface PlatformMarkup {
  id: string;
  rail: string;
  markup_percent: number;
  markup_flat: number;
  markup_flat_currency: string;
  description: string | null;
  is_active: boolean;
}

export function useProviderFees(provider?: string, region?: string) {
  return useQuery({
    queryKey: ['provider-fees', provider, region],
    queryFn: async () => {
      let query = supabase
        .from('provider_fees')
        .select('*')
        .eq('is_active', true);

      if (provider) query = query.eq('provider', provider);
      if (region) query = query.eq('region', region);

      const { data, error } = await query.order('fee_type');
      if (error) throw error;
      return (data || []) as ProviderFee[];
    },
  });
}

export function usePlatformMarkup() {
  return useQuery({
    queryKey: ['platform-markup'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('platform_markup')
        .select('*')
        .eq('is_active', true);

      if (error) throw error;
      return (data || []) as PlatformMarkup[];
    },
  });
}

export function calculateTotalFee(
  amount: number,
  providerFee: ProviderFee | undefined,
  markup: PlatformMarkup | undefined
): { providerFeeAmount: number; markupAmount: number; totalFee: number; totalDeducted: number } {
  const providerRate = providerFee?.rate_percent || 0;
  const providerFlat = providerFee?.flat_fee || 0;
  const markupRate = markup?.markup_percent || 0;
  const markupFlat = markup?.markup_flat || 0;

  const providerFeeAmount = (amount * providerRate / 100) + providerFlat;
  const markupAmount = (amount * markupRate / 100) + markupFlat;
  const totalFee = providerFeeAmount + markupAmount;

  return {
    providerFeeAmount,
    markupAmount,
    totalFee,
    totalDeducted: amount - totalFee,
  };
}
