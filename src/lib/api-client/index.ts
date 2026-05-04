/**
 * MzzPay Typed API Client
 *
 * Generated from the OpenAPI 3.1 specification.
 * Covers /api/payments, /api/payouts, and /api/balance routes.
 * Aligned with the Postman collection in public/MzzPay.postman_collection.json.
 */

/* ── Configuration ─────────────────────────────────────── */

export interface MzzPayClientConfig {
  /** Base URL, e.g. "https://api.mzzpay.io/v1" */
  baseUrl?: string;
  /** Secret API key: sk_live_… or sk_test_… */
  apiKey: string;
  /** Optional default timeout in ms (default 30000) */
  timeout?: number;
}

const DEFAULT_BASE_URL = 'https://api.mzzpay.io/v1';

/* ── Shared types ──────────────────────────────────────── */

export interface ApiError {
  type: 'api_error' | 'card_error' | 'validation_error' | 'rate_limit_error';
  code: string;
  decline_code?: string;
  message: string;
  param?: string;
  doc_url?: string;
  request_id: string;
}

export class MzzPayApiError extends Error {
  readonly type: string;
  readonly code: string;
  readonly declineCode?: string;
  readonly param?: string;
  readonly requestId: string;
  readonly status: number;

  constructor(err: ApiError, status: number) {
    super(err.message);
    this.name = 'MzzPayApiError';
    this.type = err.type;
    this.code = err.code;
    this.declineCode = err.decline_code;
    this.param = err.param;
    this.requestId = err.request_id;
    this.status = status;
  }
}

export interface PaginatedList<T> {
  object: 'list';
  data: T[];
  has_more: boolean;
  next_cursor: string | null;
}

export interface PaginationParams {
  cursor?: string;
  limit?: number;
}

/* ── Payment types ─────────────────────────────────────── */

export type PaymentStatus =
  | 'created' | 'requires_action' | 'processing'
  | 'succeeded' | 'failed' | 'canceled' | 'refunded';

export interface Payment {
  id: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  payment_method: string;
  capture?: boolean;
  customer_id?: string;
  description?: string;
  metadata?: Record<string, string>;
  statement_descriptor?: string;
  next_action?: { redirect_url: string } | null;
  provider?: string;
  provider_ref?: string;
  error?: ApiError;
  created_at: string;
  updated_at: string;
}

export interface CreatePaymentParams {
  amount: number;
  currency: string;
  payment_method: string;
  capture?: boolean;
  description?: string;
  customer_id?: string;
  metadata?: Record<string, string>;
  statement_descriptor?: string;
}

export interface PaymentListParams extends PaginationParams {
  status?: PaymentStatus;
  'created[gte]'?: string;
  'created[lte]'?: string;
  customer_id?: string;
}

/* ── Payout types ──────────────────────────────────────── */

export type PayoutStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'canceled';

export interface Payout {
  id: string;
  amount: number;
  currency: string;
  status: PayoutStatus;
  destination: string;
  arrival_date?: string;
  description?: string;
  metadata?: Record<string, string>;
  created_at: string;
  updated_at: string;
}

export interface CreatePayoutParams {
  amount: number;
  currency: string;
  destination: string;
  description?: string;
  metadata?: Record<string, string>;
}

export interface PayoutListParams extends PaginationParams {
  status?: PayoutStatus;
  'created[gte]'?: string;
  'created[lte]'?: string;
}

/* ── Balance types ─────────────────────────────────────── */

export interface BalanceAmount {
  amount: number;
  currency: string;
}

export interface Balance {
  object: 'balance';
  available: BalanceAmount[];
  pending: BalanceAmount[];
  reserved: BalanceAmount[];
  updated_at: string;
}

export interface BalanceTransactionType {
  id: string;
  amount: number;
  currency: string;
  type: 'charge' | 'refund' | 'payout' | 'adjustment' | 'reserve';
  description?: string;
  source_id?: string;
  created_at: string;
}

export interface BalanceTransactionListParams extends PaginationParams {
  type?: string;
  'created[gte]'?: string;
  'created[lte]'?: string;
}

/* ── HTTP transport ────────────────────────────────────── */

async function request<T>(
  config: MzzPayClientConfig,
  method: string,
  path: string,
  body?: unknown,
  query?: Record<string, string | undefined>,
): Promise<T> {
  const base = config.baseUrl || DEFAULT_BASE_URL;
  const url = new URL(`${base}${path}`);
  if (query) {
    Object.entries(query).forEach(([k, v]) => {
      if (v !== undefined) url.searchParams.set(k, v);
    });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.timeout || 30_000);

  try {
    const res = await fetch(url.toString(), {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    const json = await res.json();

    if (!res.ok) {
      const err = json?.error as ApiError | undefined;
      if (err) throw new MzzPayApiError(err, res.status);
      throw new Error(`HTTP ${res.status}: ${JSON.stringify(json)}`);
    }

    return json as T;
  } finally {
    clearTimeout(timer);
  }
}

/* ── Client class ──────────────────────────────────────── */

export class MzzPayClient {
  private cfg: MzzPayClientConfig;

  constructor(config: MzzPayClientConfig) {
    this.cfg = { baseUrl: DEFAULT_BASE_URL, timeout: 30_000, ...config };
  }

  /* ── Payments ──────────────────────────────────────── */
  readonly payments = {
    create: (params: CreatePaymentParams) =>
      request<Payment>(this.cfg, 'POST', '/payments', params),

    retrieve: (id: string) =>
      request<Payment>(this.cfg, 'GET', `/payments/${id}`),

    list: (params?: PaymentListParams) =>
      request<PaginatedList<Payment>>(this.cfg, 'GET', '/payments', undefined, params as any),

    capture: (id: string, amount?: number) =>
      request<Payment>(this.cfg, 'POST', `/payments/${id}/capture`, amount != null ? { amount } : undefined),

    cancel: (id: string) =>
      request<Payment>(this.cfg, 'POST', `/payments/${id}/cancel`),
  };

  /* ── Payouts ───────────────────────────────────────── */
  readonly payouts = {
    create: (params: CreatePayoutParams) =>
      request<Payout>(this.cfg, 'POST', '/payouts', params),

    retrieve: (id: string) =>
      request<Payout>(this.cfg, 'GET', `/payouts/${id}`),

    list: (params?: PayoutListParams) =>
      request<PaginatedList<Payout>>(this.cfg, 'GET', '/payouts', undefined, params as any),

    cancel: (id: string) =>
      request<Payout>(this.cfg, 'POST', `/payouts/${id}/cancel`),
  };

  /* ── Balance ───────────────────────────────────────── */
  readonly balance = {
    retrieve: () =>
      request<Balance>(this.cfg, 'GET', '/balance'),

    listTransactions: (params?: BalanceTransactionListParams) =>
      request<PaginatedList<BalanceTransactionType>>(this.cfg, 'GET', '/balance/transactions', undefined, params as any),
  };
}

/* ── Factory ─────────────────────────────────────────── */

export function createMzzPayClient(apiKey: string, baseUrl?: string): MzzPayClient {
  return new MzzPayClient({ apiKey, baseUrl });
}

export default MzzPayClient;
