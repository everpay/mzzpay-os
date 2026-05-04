/**
 * MzzPay TypeScript API Client
 *
 * Auto-generated from the OpenAPI 3.1 specification.
 * Usage:
 *   import { MzzPay } from '@mzzpay/sdk'; // or copy this file
 *   const mzz = new MzzPay('sk_live_…');
 *   const payment = await mzz.payments.create({ amount: 5000, currency: 'usd', payment_method: 'pm_card_visa' });
 */

/* ── Shared types ───────────────────────────────────────── */

export interface MzzPayError {
  type: "api_error" | "card_error" | "validation_error" | "rate_limit_error";
  code: string;
  decline_code?: string;
  message: string;
  param?: string;
  doc_url?: string;
  request_id: string;
}

export interface PaginatedList<T> {
  object: "list";
  data: T[];
  has_more: boolean;
  next_cursor: string | null;
}

export interface PaginationParams {
  cursor?: string;
  limit?: number;
}

/* ── Resource types ─────────────────────────────────────── */

export interface Payment {
  id: string;
  amount: number;
  currency: string;
  status: "created" | "requires_action" | "processing" | "succeeded" | "failed" | "canceled" | "refunded";
  payment_method: string;
  customer_id?: string;
  description?: string;
  metadata?: Record<string, string>;
  statement_descriptor?: string;
  next_action?: { redirect_url: string } | null;
  provider?: string;
  provider_ref?: string;
  error?: MzzPayError;
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

export interface Customer {
  id: string;
  email?: string;
  name?: string;
  phone?: string;
  metadata?: Record<string, string>;
  created_at: string;
}

export interface CreateCustomerParams {
  email?: string;
  name?: string;
  phone?: string;
  metadata?: Record<string, string>;
}

export interface Invoice {
  id: string;
  customer_id: string;
  amount: number;
  currency: string;
  status: "draft" | "open" | "paid" | "overdue" | "void";
  due_date?: string;
  hosted_url?: string;
  items?: { name: string; qty: number; unit_price: number; tax_rate?: number }[];
  created_at: string;
}

export interface CreateInvoiceParams {
  customer_id: string;
  currency: string;
  items: { name: string; qty: number; unit_price: number; tax_rate?: number }[];
  due_date?: string;
  metadata?: Record<string, any>;
}

export interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  currency: string;
  stock?: number;
  active: boolean;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface Refund {
  id: string;
  payment_id: string;
  amount: number;
  currency: string;
  status: "pending" | "succeeded" | "failed";
  reason?: string;
  created_at: string;
}

export interface Payout {
  id: string;
  amount: number;
  currency: string;
  status: "pending" | "in_transit" | "paid" | "failed" | "canceled";
  arrival_date?: string;
  bank_account_id?: string;
  created_at: string;
}

export interface CreatePayoutParams {
  amount: number;
  currency: string;
  bank_account_id?: string;
}

export interface Subscription {
  id: string;
  customer_id: string;
  plan_name: string;
  amount: number;
  currency: string;
  interval: "day" | "week" | "month" | "year";
  status: "active" | "past_due" | "canceled" | "trialing" | "paused";
  current_period_start: string;
  current_period_end: string;
  created_at: string;
}

export interface CreateSubscriptionParams {
  customer_id: string;
  plan_name: string;
  amount: number;
  currency: string;
  interval: "day" | "week" | "month" | "year";
  trial_days?: number;
  payment_method?: string;
}

export interface Dispute {
  id: string;
  payment_id: string;
  amount: number;
  currency: string;
  reason: string;
  status: "needs_response" | "under_review" | "won" | "lost";
  evidence_due_by: string;
  created_at: string;
}

export interface Wallet {
  id: string;
  currency: string;
  balance: number;
  available_balance: number;
  pending_balance: number;
  created_at: string;
}

export interface LedgerEntry {
  id: string;
  transaction_id: string;
  account_id: string;
  currency: string;
  entry_type: "credit" | "debit";
  amount: number;
  created_at: string;
}

export interface PaymentLink {
  id: string;
  url: string;
  amount: number;
  currency: string;
  active: boolean;
  expires_at?: string;
  created_at: string;
}

export interface CreatePaymentLinkParams {
  amount: number;
  currency: string;
  description?: string;
  expires_at?: string;
}

export interface FxRate {
  from: string;
  to: string;
  rate: number;
  timestamp: string;
}

export interface FxConvertParams {
  amount: number;
  from: string;
  to: string;
}

export interface WebhookEndpoint {
  id: string;
  url: string;
  events: string[];
  active: boolean;
  secret: string;
  created_at: string;
}

export interface CreateWebhookEndpointParams {
  url: string;
  events: string[];
}

/* ── HTTP client ────────────────────────────────────────── */

export class MzzPayApiError extends Error {
  public readonly status: number;
  public readonly error: MzzPayError;
  constructor(status: number, error: MzzPayError) {
    super(error.message);
    this.name = "MzzPayApiError";
    this.status = status;
    this.error = error;
  }
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
  headers?: Record<string, string>;
}

async function request<T>(baseUrl: string, apiKey: string, path: string, opts: RequestOptions = {}): Promise<T> {
  const url = new URL(path, baseUrl);
  if (opts.query) {
    for (const [k, v] of Object.entries(opts.query)) {
      if (v !== undefined) url.searchParams.set(k, String(v));
    }
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    ...opts.headers,
  };

  const res = await fetch(url.toString(), {
    method: opts.method || "GET",
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });

  const json = await res.json();
  if (!res.ok || json?.error?.code) {
    throw new MzzPayApiError(res.status, json.error ?? json);
  }
  return json as T;
}

/* ── Resource namespaces ────────────────────────────────── */

class PaymentsResource {
  constructor(private baseUrl: string, private key: string) {}

  create(params: CreatePaymentParams, idempotencyKey?: string) {
    return request<Payment>(this.baseUrl, this.key, "/payments", {
      method: "POST",
      body: params,
      headers: idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {},
    });
  }

  list(params?: PaginationParams & { status?: string }) {
    return request<PaginatedList<Payment>>(this.baseUrl, this.key, "/payments", { query: params as any });
  }

  retrieve(id: string) {
    return request<Payment>(this.baseUrl, this.key, `/payments/${id}`);
  }

  capture(id: string, idempotencyKey?: string) {
    return request<Payment>(this.baseUrl, this.key, `/payments/${id}/capture`, {
      method: "POST",
      headers: idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {},
    });
  }

  refund(id: string, params?: { amount?: number; reason?: string }, idempotencyKey?: string) {
    return request<Refund>(this.baseUrl, this.key, `/payments/${id}/refund`, {
      method: "POST",
      body: params,
      headers: idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {},
    });
  }

  cancel(id: string) {
    return request<Payment>(this.baseUrl, this.key, `/payments/${id}/cancel`, { method: "POST" });
  }
}

class CustomersResource {
  constructor(private baseUrl: string, private key: string) {}

  create(params: CreateCustomerParams, idempotencyKey?: string) {
    return request<Customer>(this.baseUrl, this.key, "/customers", {
      method: "POST",
      body: params,
      headers: idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {},
    });
  }

  list(params?: PaginationParams) {
    return request<PaginatedList<Customer>>(this.baseUrl, this.key, "/customers", { query: params as any });
  }

  retrieve(id: string) {
    return request<Customer>(this.baseUrl, this.key, `/customers/${id}`);
  }

  update(id: string, params: Partial<CreateCustomerParams>) {
    return request<Customer>(this.baseUrl, this.key, `/customers/${id}`, { method: "PATCH", body: params });
  }

  del(id: string) {
    return request<void>(this.baseUrl, this.key, `/customers/${id}`, { method: "DELETE" });
  }

  attachPaymentMethod(customerId: string, token: string) {
    return request<void>(this.baseUrl, this.key, `/customers/${customerId}/payment_methods`, {
      method: "POST",
      body: { token },
    });
  }
}

class InvoicesResource {
  constructor(private baseUrl: string, private key: string) {}

  create(params: CreateInvoiceParams, idempotencyKey?: string) {
    return request<Invoice>(this.baseUrl, this.key, "/invoices", {
      method: "POST",
      body: params,
      headers: idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {},
    });
  }

  list(params?: PaginationParams) {
    return request<PaginatedList<Invoice>>(this.baseUrl, this.key, "/invoices", { query: params as any });
  }

  retrieve(id: string) {
    return request<Invoice>(this.baseUrl, this.key, `/invoices/${id}`);
  }

  send(id: string) {
    return request<void>(this.baseUrl, this.key, `/invoices/${id}/send`, { method: "POST" });
  }

  void(id: string) {
    return request<void>(this.baseUrl, this.key, `/invoices/${id}/void`, { method: "POST" });
  }
}

class ProductsResource {
  constructor(private baseUrl: string, private key: string) {}

  create(params: Partial<Product>) {
    return request<Product>(this.baseUrl, this.key, "/products", { method: "POST", body: params });
  }

  list(params?: PaginationParams) {
    return request<PaginatedList<Product>>(this.baseUrl, this.key, "/products", { query: params as any });
  }

  retrieve(id: string) {
    return request<Product>(this.baseUrl, this.key, `/products/${id}`);
  }

  update(id: string, params: Partial<Product>) {
    return request<Product>(this.baseUrl, this.key, `/products/${id}`, { method: "PATCH", body: params });
  }

  del(id: string) {
    return request<void>(this.baseUrl, this.key, `/products/${id}`, { method: "DELETE" });
  }
}

class RefundsResource {
  constructor(private baseUrl: string, private key: string) {}

  list(params?: PaginationParams) {
    return request<PaginatedList<Refund>>(this.baseUrl, this.key, "/refunds", { query: params as any });
  }

  retrieve(id: string) {
    return request<Refund>(this.baseUrl, this.key, `/refunds/${id}`);
  }
}

class PayoutsResource {
  constructor(private baseUrl: string, private key: string) {}

  create(params: CreatePayoutParams, idempotencyKey?: string) {
    return request<Payout>(this.baseUrl, this.key, "/payouts", {
      method: "POST",
      body: params,
      headers: idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {},
    });
  }

  list(params?: PaginationParams) {
    return request<PaginatedList<Payout>>(this.baseUrl, this.key, "/payouts", { query: params as any });
  }

  retrieve(id: string) {
    return request<Payout>(this.baseUrl, this.key, `/payouts/${id}`);
  }
}

class SubscriptionsResource {
  constructor(private baseUrl: string, private key: string) {}

  create(params: CreateSubscriptionParams, idempotencyKey?: string) {
    return request<Subscription>(this.baseUrl, this.key, "/subscriptions", {
      method: "POST",
      body: params,
      headers: idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {},
    });
  }

  list(params?: PaginationParams) {
    return request<PaginatedList<Subscription>>(this.baseUrl, this.key, "/subscriptions", { query: params as any });
  }

  retrieve(id: string) {
    return request<Subscription>(this.baseUrl, this.key, `/subscriptions/${id}`);
  }

  update(id: string, params: Partial<CreateSubscriptionParams>) {
    return request<Subscription>(this.baseUrl, this.key, `/subscriptions/${id}`, { method: "PATCH", body: params });
  }

  cancel(id: string) {
    return request<Subscription>(this.baseUrl, this.key, `/subscriptions/${id}`, { method: "DELETE" });
  }
}

class DisputesResource {
  constructor(private baseUrl: string, private key: string) {}

  list(params?: PaginationParams) {
    return request<PaginatedList<Dispute>>(this.baseUrl, this.key, "/disputes", { query: params as any });
  }

  retrieve(id: string) {
    return request<Dispute>(this.baseUrl, this.key, `/disputes/${id}`);
  }

  submitEvidence(id: string, evidence: Record<string, string>) {
    return request<void>(this.baseUrl, this.key, `/disputes/${id}/evidence`, { method: "POST", body: evidence });
  }
}

class WalletsResource {
  constructor(private baseUrl: string, private key: string) {}

  list(currency?: string) {
    return request<Wallet[]>(this.baseUrl, this.key, "/wallets", { query: currency ? { currency } : {} });
  }

  balanceTransactions(params?: PaginationParams & { currency?: string }) {
    return request<LedgerEntry[]>(this.baseUrl, this.key, "/wallets/balance-transactions", { query: params as any });
  }
}

class PaymentLinksResource {
  constructor(private baseUrl: string, private key: string) {}

  create(params: CreatePaymentLinkParams, idempotencyKey?: string) {
    return request<PaymentLink>(this.baseUrl, this.key, "/payment-links", {
      method: "POST",
      body: params,
      headers: idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {},
    });
  }

  list(params?: PaginationParams) {
    return request<PaginatedList<PaymentLink>>(this.baseUrl, this.key, "/payment-links", { query: params as any });
  }
}

class FxResource {
  constructor(private baseUrl: string, private key: string) {}

  rates(from: string, to: string) {
    return request<FxRate>(this.baseUrl, this.key, "/fx/rates", { query: { from, to } });
  }

  convert(params: FxConvertParams) {
    return request<{ amount: number; converted: number; from: string; to: string; rate: number }>(
      this.baseUrl, this.key, "/fx/convert", { method: "POST", body: params },
    );
  }
}

class WebhooksResource {
  constructor(private baseUrl: string, private key: string) {}

  create(params: CreateWebhookEndpointParams) {
    return request<WebhookEndpoint>(this.baseUrl, this.key, "/webhooks/endpoints", { method: "POST", body: params });
  }

  list() {
    return request<WebhookEndpoint[]>(this.baseUrl, this.key, "/webhooks/endpoints");
  }

  del(id: string) {
    return request<void>(this.baseUrl, this.key, `/webhooks/endpoints/${id}`, { method: "DELETE" });
  }
}

/* ── Main client ────────────────────────────────────────── */

export class MzzPay {
  public readonly payments: PaymentsResource;
  public readonly customers: CustomersResource;
  public readonly invoices: InvoicesResource;
  public readonly products: ProductsResource;
  public readonly refunds: RefundsResource;
  public readonly payouts: PayoutsResource;
  public readonly subscriptions: SubscriptionsResource;
  public readonly disputes: DisputesResource;
  public readonly wallets: WalletsResource;
  public readonly paymentLinks: PaymentLinksResource;
  public readonly fx: FxResource;
  public readonly webhooks: WebhooksResource;

  constructor(apiKey: string, baseUrl = "https://api.mzzpay.io/v1") {
    this.payments = new PaymentsResource(baseUrl, apiKey);
    this.customers = new CustomersResource(baseUrl, apiKey);
    this.invoices = new InvoicesResource(baseUrl, apiKey);
    this.products = new ProductsResource(baseUrl, apiKey);
    this.refunds = new RefundsResource(baseUrl, apiKey);
    this.payouts = new PayoutsResource(baseUrl, apiKey);
    this.subscriptions = new SubscriptionsResource(baseUrl, apiKey);
    this.disputes = new DisputesResource(baseUrl, apiKey);
    this.wallets = new WalletsResource(baseUrl, apiKey);
    this.paymentLinks = new PaymentLinksResource(baseUrl, apiKey);
    this.fx = new FxResource(baseUrl, apiKey);
    this.webhooks = new WebhooksResource(baseUrl, apiKey);
  }
}

export default MzzPay;
