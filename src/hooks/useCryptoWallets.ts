import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

import { notifyError, notifySuccess } from '@/lib/error-toast';

export interface CryptoWallet {
  id: string;
  store_id: string;
  merchant_id: string;
  asset_id: string;
  address: string | null;
  network: string | null;
  balance: number;
  on_hold: number;
  available: number;
  base_balance: number;
  is_default: boolean;
  is_active: boolean;
  status: 'active' | 'frozen' | 'closed';
  is_user_added: boolean;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
  crypto_stores?: { name: string; base_currency: string };
}

export interface CryptoAsset {
  id: string;
  asset_id: string;
  symbol: string;
  name: string;
  network: string | null;
  decimals: number;
  is_fiat: boolean;
  is_active: boolean;
  min_withdrawal_amount: number | null;
  max_withdrawal_amount: number | null;
}

export interface CryptoStore {
  id: string;
  merchant_id: string;
  name: string;
  base_currency: string;
  is_active: boolean;
  is_test: boolean;
  created_at: string;
  elektropay_store_id: string | null;
}

async function invokeAction<T = any>(action: string, payload: Record<string, any> = {}): Promise<T> {
  const { data, error } = await supabase.functions.invoke('elektropay-wallet', {
    body: { action, payload },
  });
  if (error) throw new Error(error.message);
  if (!data?.success) throw new Error(data?.error || 'Action failed');
  return data;
}

export function useCryptoWallets(merchantId?: string) {
  return useQuery({
    queryKey: ['crypto-wallets', merchantId],
    queryFn: async () => {
      let q = (supabase as any).from('crypto_wallets').select('*, crypto_stores(name, base_currency)');
      if (merchantId) q = q.eq('merchant_id', merchantId);
      const { data, error } = await q.order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as CryptoWallet[];
    },
  });
}

export function useCryptoAssets() {
  return useQuery({
    queryKey: ['crypto-assets'],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from('crypto_assets').select('*').eq('is_active', true).order('symbol');
      if (error) throw error;
      return (data || []) as CryptoAsset[];
    },
  });
}

export function useCryptoStores(merchantId?: string) {
  return useQuery({
    queryKey: ['crypto-stores', merchantId],
    queryFn: async () => {
      let q = (supabase as any).from('crypto_stores').select('*');
      if (merchantId) q = q.eq('merchant_id', merchantId);
      const { data, error } = await q.order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as CryptoStore[];
    },
  });
}

export function useCreateWallet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { store_id: string; asset_id: string; is_user_added?: boolean }) =>
      invokeAction('create_wallet', vars),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['crypto-wallets'] });
      notifySuccess('Wallet created');
    },
    onError: (e: Error) => notifyError(e.message),
  });
}

export function useCreateStore() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { merchant_id: string; name: string; base_currency?: string }) =>
      invokeAction('create_store', vars),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['crypto-stores'] });
      notifySuccess('Store created');
    },
    onError: (e: Error) => notifyError(e.message),
  });
}

export function useDeposit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { wallet_id: string; amount?: number }) => invokeAction('create_deposit', vars),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['crypto-wallets'] });
      qc.invalidateQueries({ queryKey: ['crypto-transactions'] });
      notifySuccess('Deposit address generated');
    },
    onError: (e: Error) => notifyError(e.message),
  });
}

export function useWithdraw() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { wallet_id: string; amount: number; to_address: string }) =>
      invokeAction('create_withdrawal', vars),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['crypto-wallets'] });
      qc.invalidateQueries({ queryKey: ['crypto-transactions'] });
      notifySuccess('Withdrawal initiated');
    },
    onError: (e: Error) => notifyError(e.message),
  });
}

export function useFreezeWallet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { wallet_id: string }) => invokeAction('freeze_wallet', vars),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['crypto-wallets'] });
      notifySuccess('Wallet frozen');
    },
    onError: (e: Error) => notifyError(e.message),
  });
}

export function useCloseWallet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { wallet_id: string }) => invokeAction('close_wallet', vars),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['crypto-wallets'] });
      notifySuccess('Wallet closed');
    },
    onError: (e: Error) => notifyError(e.message),
  });
}
