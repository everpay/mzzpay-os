export type ChargebackStatus = 
  | 'chargeback_received'
  | 'evidence_collected'
  | 'submitted'
  | 'under_review'
  | 'won'
  | 'lost';

export type DisputeResult = 'won' | 'lost';

export type EvidenceType =
  | 'payment_details'
  | 'avs_cvv'
  | 'ip_address'
  | 'device_fingerprint'
  | 'billing_address'
  | 'shipping_address'
  | 'customer_email'
  | 'order_metadata'
  | 'transaction_receipt'
  | 'delivery_confirmation'
  | 'refund_history'
  | 'merchant_terms'
  | 'custom';

export interface Chargeback {
  id: string;
  payment_id: string;
  merchant_id: string;
  merchant_name?: string;
  processor_id: string;
  processor_name?: string;
  amount: number;
  currency: string;
  reason_code: string;
  reason_description?: string;
  status: ChargebackStatus;
  created_at: string;
}

export interface ChargebackEvidence {
  id: string;
  chargeback_id: string;
  evidence_type: EvidenceType;
  file_url: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface ChargebackDispute {
  id: string;
  chargeback_id: string;
  evidence_score: number;
  status: ChargebackStatus;
  submitted_at: string | null;
  created_at: string;
}

export interface ChargebackOutcome {
  id: string;
  chargeback_id: string;
  result: DisputeResult;
  resolution_amount: number;
  resolved_at: string;
}

export interface DisputeEvent {
  id: string;
  type: string;
  chargeback_id: string;
  payload: Record<string, unknown>;
  created_at: string;
}

export interface MerchantStats {
  total_chargebacks: number;
  open_disputes: number;
  win_rate: number;
  chargeback_rate: number;
  total_amount_disputed: number;
  total_recovered: number;
}