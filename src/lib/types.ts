export type Currency = "USD" | "EUR" | "GBP" | "BRL" | "MXN" | "COP" | "CAD";

export type TransactionStatus = "pending" | "processing" | "completed" | "failed" | "refunded";
export type PayoutStatus = "pending" | "processing" | "completed" | "failed";
export type Provider = "mondo" | "stripe" | "mzzpay" | "moneto" | "moneto_mpg" | "matrix" | "shieldhub";

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
  card_bin?: string | null;
  card_last4?: string | null;
  card_brand?: string | null;
  payment_method_type?: string | null;
  customer_ip?: string | null;
  user_agent?: string | null;
  customer_country?: string | null;
  customer_phone?: string | null;
  customer_first_name?: string | null;
  customer_last_name?: string | null;
  billing_address?: Record<string, any> | null;
  processor_error_code?: string | null;
  processor_error_message?: string | null;
  processor_raw_response?: Record<string, any> | null;
  surcharge_amount?: number | null;
  total_amount?: number | null;
  created_at: string;
  updated_at: string;
}

export interface SurchargeSettings {
  enabled: boolean;
  percentageFee: number; // 0.029 = 2.9%
  fixedFee: number; // 0.30 USD
  maxCap?: number;
}


export interface LedgerEntry {
  id: string;
  transaction_id: string;
  account_id: string;
  entry_type: "debit" | "credit";
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
