/**
 * Zod response schemas for payment API endpoints.
 *
 * These schemas guarantee that sensitive fields (descriptor, client_id,
 * shieldhub_client_id, processor_raw_response, providerResponse) are
 * NEVER present in parsed responses. Use `.parse()` or `.safeParse()`
 * on every API response before the data reaches the UI.
 *
 * Field policy:
 * - `descriptor` / `descriptor_text`: ALLOWED — shown on admin TransactionTable,
 *   Receipt page, and transactional emails.
 * - `client_id` / `shieldhub_client_id`: ALLOWED in data (not stripped) but
 *   NEVER rendered on any frontend surface.
 * - `providerResponse` / `processor_raw_response`: ALWAYS STRIPPED — may contain
 *   raw processor payloads with sensitive details.
 */

import { z } from 'zod';

// ── Shared field strips ─────────────────────────────────────────────
// Fields that must never appear in any frontend response.
// descriptor and client_id are intentionally NOT in this list.
const STRIPPED_FIELDS = [
  'providerResponse',
  'processor_raw_response',
] as const;

/**
 * Removes all sensitive keys from an object.
 * Use as a Zod `.transform()` step.
 */
function stripSensitive<T extends Record<string, unknown>>(obj: T): Omit<T, (typeof STRIPPED_FIELDS)[number]> {
  const cleaned = { ...obj };
  for (const key of STRIPPED_FIELDS) {
    delete (cleaned as any)[key];
  }
  return cleaned as any;
}

// ── Transaction schema (shared between payments & balance) ──────────
const transactionBaseSchema = z.object({
  id: z.string(),
  merchant_id: z.string().optional(),
  amount: z.number(),
  currency: z.string(),
  status: z.string(),
  provider: z.string().optional().nullable(),
  provider_ref: z.string().optional().nullable(),
  customer_email: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  idempotency_key: z.string().optional().nullable(),
  fx_rate: z.number().optional().nullable(),
  settlement_currency: z.string().optional().nullable(),
  settlement_amount: z.number().optional().nullable(),
  card_bin: z.string().optional().nullable(),
  card_last4: z.string().optional().nullable(),
  card_brand: z.string().optional().nullable(),
  payment_method_type: z.string().optional().nullable(),
  customer_ip: z.string().optional().nullable(),
  user_agent: z.string().optional().nullable(),
  customer_country: z.string().optional().nullable(),
  customer_phone: z.string().optional().nullable(),
  customer_first_name: z.string().optional().nullable(),
  customer_last_name: z.string().optional().nullable(),
  billing_address: z.record(z.any()).optional().nullable(),
  processor_error_code: z.string().optional().nullable(),
  processor_error_message: z.string().optional().nullable(),
  surcharge_amount: z.number().optional().nullable(),
  total_amount: z.number().optional().nullable(),
  // Explicitly allowed — shown on admin surfaces and receipts
  descriptor: z.string().optional().nullable(),
  descriptor_text: z.string().optional().nullable(),
  // Explicitly allowed in data — NEVER rendered in UI
  client_id: z.string().optional().nullable(),
  shieldhub_client_id: z.string().optional().nullable(),
  created_at: z.string(),
  updated_at: z.string().optional(),
}).passthrough().transform(stripSensitive);

// ── /api/payments response ──────────────────────────────────────────
export const paymentResponseSchema = z.object({
  success: z.boolean().optional(),
  transaction: transactionBaseSchema.optional(),
  decline_message: z.string().optional(),
  decline_code: z.string().optional(),
  error: z.string().optional(),
  redirect_url: z.string().optional().nullable(),
}).passthrough().transform(stripSensitive);

export type SafePaymentResponse = z.output<typeof paymentResponseSchema>;

// ── /api/payouts response ───────────────────────────────────────────
export const payoutResponseSchema = z.object({
  id: z.string(),
  merchant_id: z.string().optional(),
  amount: z.number(),
  currency: z.string(),
  status: z.string(),
  destination: z.string().optional(),
  created_at: z.string(),
}).passthrough().transform(stripSensitive);

export type SafePayoutResponse = z.output<typeof payoutResponseSchema>;

// ── /api/balance response ───────────────────────────────────────────
const accountSchema = z.object({
  id: z.string(),
  merchant_id: z.string().optional(),
  currency: z.string(),
  balance: z.number(),
  pending_balance: z.number().optional(),
  available_balance: z.number().optional(),
}).passthrough().transform(stripSensitive);

export const balanceResponseSchema = z.object({
  accounts: z.array(accountSchema).optional(),
  account: accountSchema.optional(),
}).passthrough().transform(stripSensitive);

export type SafeBalanceResponse = z.output<typeof balanceResponseSchema>;

// ── Convenience parser ──────────────────────────────────────────────
/**
 * Parse and sanitize any API response through the appropriate schema.
 * Falls back to manual stripping if the response doesn't match a known schema.
 */
export function parsePaymentResponse(raw: unknown): SafePaymentResponse {
  return paymentResponseSchema.parse(raw);
}

export function parsePayoutResponse(raw: unknown): SafePayoutResponse {
  return payoutResponseSchema.parse(raw);
}

export function parseBalanceResponse(raw: unknown): SafeBalanceResponse {
  return balanceResponseSchema.parse(raw);
}

/**
 * Generic safety net: strip sensitive fields from any object.
 * Use when the response shape is unknown or doesn't match a schema.
 */
export function stripSensitiveFields(obj: Record<string, any>): Record<string, any> {
  const cleaned = { ...obj };
  for (const key of STRIPPED_FIELDS) {
    delete cleaned[key];
  }
  if (cleaned.transaction && typeof cleaned.transaction === 'object') {
    cleaned.transaction = stripSensitiveFields({ ...cleaned.transaction });
  }
  return cleaned;
}
