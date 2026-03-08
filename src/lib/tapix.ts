import { supabase } from '@/integrations/supabase/client';

export interface TapixEnrichmentData {
  processor?: string;
  store?: string;
  merchant_name?: string;
  category?: string;
  location?: {
    city?: string;
    state?: string;
    country?: string;
  };
}

export interface TapixTransactionData {
  id: string;
  amount: number;
  currency: string;
  status: string;
  metadata?: Record<string, any>;
}

export interface TapixResponse {
  success: boolean;
  enrichment?: TapixEnrichmentData;
  transaction?: TapixTransactionData;
  error?: string;
}

/**
 * Enrich card payment data using Tapix API
 * @param cardNumber - The card number to enrich
 * @param amount - Optional transaction amount
 * @param transactionId - Optional Tapix transaction ID to fetch additional details
 * @returns Enriched data including processor, store, and transaction information
 */
export async function enrichWithTapix(
  cardNumber: string,
  amount?: number,
  transactionId?: string
): Promise<TapixResponse> {
  try {
    const { data, error } = await supabase.functions.invoke('tapix-enrich', {
      body: {
        cardNumber,
        amount,
        transactionId,
      },
    });

    if (error) throw error;
    return data as TapixResponse;
  } catch (error) {
    console.error('Error enriching with Tapix:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
