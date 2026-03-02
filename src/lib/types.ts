export type Currency = 'USD' | 'EUR' | 'GBP' | 'BRL' | 'MXN' | 'COP';

export type TransactionStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';
export type PayoutStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type Provider = 'facilitapay' | 'mondo' | 'stripe';

export interface Merchant {
  id: string;
  name: string;
  api_key_hash: string;
  webhook_url?: string;
  created_at: string;
}

export interface Account {
  id: string;
  merchant_id: string;
  currency: Currency;
  balance: number;
  pending_balance: number;
  available_balance: number;
}

export interface Transaction {
  id: string;
  merchant_id: string;
  amount: number;
  currency: Currency;
  status: TransactionStatus;
  provider: Provider;
  provider_ref?: string;
  customer_email?: string;
  description?: string;
  idempotency_key?: string;
  fx_rate?: number;
  settlement_currency?: Currency;
  settlement_amount?: number;
  created_at: string;
  updated_at: string;
}

export interface LedgerEntry {
  id: string;
  transaction_id: string;
  account_id: string;
  entry_type: 'debit' | 'credit';
  amount: number;
  currency: Currency;
  created_at: string;
}

export interface Payout {
  id: string;
  merchant_id: string;
  amount: number;
  currency: Currency;
  status: PayoutStatus;
  destination: string;
  created_at: string;
}

export interface ProviderEvent {
  id: string;
  provider: Provider;
  event_type: string;
  payload: Record<string, unknown>;
  transaction_id?: string;
  created_at: string;
}

export interface IdempotencyKey {
  id: string;
  key: string;
  merchant_id: string;
  response: Record<string, unknown>;
  created_at: string;
  expires_at: string;
}
