/**
 * Matrix Pay canonical transaction statuses + result codes.
 *
 * The Matrix gateway returns its own status vocabulary that does NOT match
 * our internal `TransactionStatus` enum. This module is the single source of
 * truth for:
 *   - the canonical Matrix status list (initial/pending/success/error/...)
 *   - the numeric result-code → human description map
 *   - mapping helpers that go BOTH ways (Matrix ↔ internal)
 *
 * Used by:
 *   - supabase/functions/matrix-process: tags every step event with a
 *     normalized `matrix_status`.
 *   - supabase/functions/process-payment: turns Matrix status/code into our
 *     internal `transactions.status` so the table renders the right badge.
 *   - src/components/ProcessorValidationRulesDrawer: explains each status to
 *     the merchant before they submit a payment.
 *   - src/lib/format.ts: badge variant for the Matrix-specific values.
 */

import type { TransactionStatus } from '@/lib/types';

export type MatrixStatus =
  | 'initial'
  | 'pending'
  | 'success'
  | 'error'
  | 'declined'
  | 'suspended'
  | 'blocked';

export const MATRIX_STATUS_DESCRIPTIONS: Record<MatrixStatus, string> = {
  initial: "Transaction is created on our side but doesn't initiated on Provider/Acquirer side",
  pending: 'Transaction is sent to Provider/Acquirer side',
  success: 'Successful transaction',
  error: 'Error in transaction processing',
  declined: 'Declined by Acquirer with decline code/reason',
  suspended: 'Suspended by antifraud rules. Appears in Review tab for manual approval',
  blocked: 'Suspended transaction was blocked manually from a Review tab',
};

/** Numeric result codes returned by Matrix on the `code` field. */
export const MATRIX_RESULT_CODES: Record<number, { label: string; status: MatrixStatus }> = {
  0:    { label: 'Successful transaction',                                  status: 'success' },
  1003: { label: 'No payment routes found',                                 status: 'error' },
  1020: { label: 'Transaction is suspended',                                status: 'suspended' },
  1030: { label: 'Transaction is blocked',                                  status: 'blocked' },
  1500: { label: 'Internal error',                                          status: 'error' },
  2010: { label: 'Cancelled by customer',                                   status: 'declined' },
  2020: { label: 'Declined by Antifraud',                                   status: 'declined' },
  2022: { label: 'Declined by 3-D Secure',                                  status: 'declined' },
  2025: { label: 'Declined by Bank',                                        status: 'declined' },
  2026: { label: 'Declined by Bank: No Requisites',                         status: 'declined' },
  2030: { label: 'Limit reached',                                           status: 'declined' },
  2031: { label: 'Customer limit reached',                                  status: 'declined' },
  2035: { label: 'Card limit reached',                                      status: 'declined' },
  2040: { label: 'Insufficient funds',                                      status: 'declined' },
  2050: { label: 'Incorrect card data',                                     status: 'declined' },
  2099: { label: 'Pending cascading after 3DS to be launched or canceled',  status: 'pending' },
};

/**
 * Resolve a Matrix transaction `code` (0, 1020, 2025, …) to its canonical
 * Matrix status. Falls back to 'error' for unknown codes.
 */
export function matrixStatusForCode(code: number | string | null | undefined): MatrixStatus {
  if (code === null || code === undefined) return 'pending';
  const n = typeof code === 'string' ? Number(code) : code;
  if (Number.isNaN(n)) return 'error';
  return MATRIX_RESULT_CODES[n]?.status ?? 'error';
}

/** Translate a Matrix canonical status into our internal TransactionStatus. */
export function matrixToInternalStatus(s: MatrixStatus | string | null | undefined): TransactionStatus {
  switch (s) {
    case 'success':    return 'completed';
    case 'declined':
    case 'error':
    case 'blocked':    return 'failed';
    case 'suspended':  return 'processing'; // sits in review queue
    case 'pending':    return 'processing';
    case 'initial':
    default:           return 'pending';
  }
}

/**
 * Required + recommended fields for a Matrix /api/payments submission.
 * Drives both the in-app drawer and the server-side validator.
 */
export interface MatrixFieldRule {
  field: string;
  required: boolean;
  format: string;
  description: string;
  example?: string;
}

export const MATRIX_FIELD_RULES: MatrixFieldRule[] = [
  {
    field: 'reference',
    required: true,
    format: '6–64 chars, [A-Za-z0-9_-]',
    description: 'Merchant transaction reference. Must be unique per attempt.',
    example: 'ord_2026_04_25_0001',
  },
  {
    field: 'order_id',
    required: true,
    format: '6–64 chars, [A-Za-z0-9_-]',
    description: 'Stable order identifier — kept across retries / cascades.',
    example: 'order-9f8a72c3',
  },
  {
    field: 'customer_token',
    required: true,
    format: '32-char token from /v1/customer/token',
    description:
      'Card flows MUST first call `customer_token`, then chain the returned token into `pay`. Inline cardDetails are rejected by live MIDs.',
    example: 'ct_5e9b1a2c3d4e5f6789a0b1c2d3e4f567',
  },
  {
    field: 'api_key',
    required: true,
    format: '35 runes (server-managed secret)',
    description:
      'Matrix expects the 35-rune public key inside the request body as `api_key` (mapped to GetProjectRequest.ApiKey). Wired automatically server-side.',
  },
  {
    field: 'amount',
    required: true,
    format: 'positive number, max 1,000,000',
    description: 'Transaction amount in major currency units (e.g. 19.99).',
    example: '49.50',
  },
  {
    field: 'currency',
    required: true,
    format: 'ISO-4217 (3 uppercase letters)',
    description: 'Settlement currency. Matrix supports EUR/GBP/USD on standard MIDs.',
    example: 'EUR',
  },
  {
    field: 'billing.country',
    required: true,
    format: 'ISO-3166-1 alpha-2',
    description:
      'Customer country. **US is rejected** — Matrix is not available for US-based customers.',
    example: 'DE',
  },
  {
    field: 'customerEmail',
    required: false,
    format: 'RFC 5322 email',
    description: 'Recommended for receipt + chargeback evidence.',
    example: 'jane@example.com',
  },
  {
    field: 'idempotencyKey',
    required: false,
    format: '8–120 chars, recommended UUID',
    description:
      'If present, Matrix returns the cached response for replays so you never double-charge.',
    example: 'idk_2c1f4a9b…',
  },
];
