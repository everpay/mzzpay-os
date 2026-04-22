import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CryptoTx {
  id: string;
  wallet_id: string | null;
  merchant_id: string;
  store_id: string | null;
  tx_type: 'deposit' | 'withdrawal' | 'transfer_in' | 'transfer_out' | 'convert' | 'payment' | 'commission' | 'refund';
  status: 'pending' | 'processing' | 'complete' | 'failed' | 'cancelled';
  asset_id: string;
  amount: number;
  fee: number;
  fee_asset_id: string | null;
  to_address: string | null;
  from_address: string | null;
  tx_hash: string | null;
  elektropay_id: string | null;
  description: string | null;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export function useWalletTransactions(walletId?: string) {
  return useQuery({
    enabled: !!walletId,
    queryKey: ['wallet-transactions', walletId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('crypto_transactions')
        .select('*')
        .eq('wallet_id', walletId)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data || []) as CryptoTx[];
    },
  });
}

export function useLatestWalletDeposit(walletId?: string) {
  return useQuery({
    enabled: !!walletId,
    queryKey: ['latest-wallet-deposit', walletId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('crypto_transactions')
        .select('*')
        .eq('wallet_id', walletId)
        .eq('tx_type', 'deposit')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data || null) as CryptoTx | null;
    },
  });
}

export function useCryptoTransactions(merchantId?: string) {
  return useQuery({
    queryKey: ['crypto-transactions', merchantId],
    queryFn: async () => {
      let q = (supabase as any).from('crypto_transactions').select('*');
      if (merchantId) q = q.eq('merchant_id', merchantId);
      const { data, error } = await q.order('created_at', { ascending: false }).limit(200);
      if (error) throw error;
      return (data || []) as CryptoTx[];
    },
  });
}

const EXPLORERS: Record<string, (hash: string) => string> = {
  TRC20: (h) => `https://tronscan.org/#/transaction/${h}`,
  TRON: (h) => `https://tronscan.org/#/transaction/${h}`,
  ERC20: (h) => `https://etherscan.io/tx/${h}`,
  ETHEREUM: (h) => `https://etherscan.io/tx/${h}`,
  BITCOIN: (h) => `https://www.blockchain.com/btc/tx/${h}`,
  BSC: (h) => `https://bscscan.com/tx/${h}`,
  POLYGON: (h) => `https://polygonscan.com/tx/${h}`,
};

export function explorerUrl(network: string | null | undefined, hash: string | null | undefined): string | null {
  if (!network || !hash) return null;
  const fn = EXPLORERS[network.toUpperCase()];
  return fn ? fn(hash) : null;
}
