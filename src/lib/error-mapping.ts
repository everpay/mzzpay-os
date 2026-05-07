/**
 * Centralized error-mapping helper.
 *
 * Converts raw provider/processor errors into user-safe messages.
 * NEVER leaks transaction IDs, descriptors, client_ids, or raw
 * processor payloads to the frontend.
 */

import type { PaymentResultBannerData } from '@/components/PaymentResultBanner';

// ── Provider error code → user-safe message ─────────────────────────
const ERROR_MAP: Record<string, string> = {
  '004': 'Processor configuration error — your card was NOT charged. Please contact support.',
  '100': 'Transaction declined by the payment network.',
  '101': 'Card expired. Please use a different card.',
  '102': 'Card restricted. Please use a different card.',
  '104': 'Card number is invalid.',
  '105': 'Card type not supported.',
  '110': 'Amount exceeds card limit.',
  '116': 'Insufficient funds. Please try a smaller amount or a different card.',
  '117': 'Incorrect PIN entered.',
  '200': 'General decline — please try another payment method.',
  '201': 'Expired card. Please use a different card.',
  '202': 'Possible fraudulent transaction. Please contact your bank.',
  '203': 'Contact your card issuer for more information.',
  '204': 'Restricted card — please use a different card.',
  '304': 'Transaction declined by the issuer. Please contact your bank.',
  '399': 'Transaction declined. Please verify your card details or try another card.',
  '500': 'Processor error — please try again later.',
  '501': 'Processor temporarily unavailable.',
  '999': 'An unexpected error occurred. Please try again.',
};

const PATTERN_MESSAGES: Array<[RegExp, string]> = [
  [/processor not found/i, 'Processor configuration error — your card was NOT charged. Please contact support.'],
  [/insufficient funds/i, 'Insufficient funds. Please try a smaller amount or a different card.'],
  [/expired/i, 'Card expired. Please use a different card.'],
  [/fraud|suspicious/i, 'Transaction flagged — please contact your bank.'],
  [/velocity|rate.?limit/i, 'Too many attempts. Please wait a moment and try again.'],
  [/3d.?secure|authentication/i, 'Card authentication failed. Please try again.'],
  [/timeout|timed? out/i, 'The payment processor did not respond in time. Please try again.'],
];

const GENERIC_DECLINE = 'Payment could not be processed. Please try a different payment method or contact your bank.';

/**
 * Convert a raw provider error into a user-safe message string.
 */
export function mapProviderError(
  rawMessage?: string | null,
  errorCode?: string | null,
): string {
  // Try exact code match
  if (errorCode && ERROR_MAP[errorCode]) {
    return ERROR_MAP[errorCode];
  }

  // Try pattern match on the raw message
  if (rawMessage) {
    for (const [pattern, message] of PATTERN_MESSAGES) {
      if (pattern.test(rawMessage)) return message;
    }
  }

  return GENERIC_DECLINE;
}

/**
 * Build a PaymentResultBannerData from a raw API response.
 * Strips all internal identifiers (tx id, descriptor, client_id) so
 * nothing sensitive reaches the UI.
 */
export function buildBannerFromResponse(data: Record<string, any>): PaymentResultBannerData {
  const txStatus = String(data?.transaction?.status || '').toLowerCase();

  if (txStatus === 'failed' || data?.transaction?.status === 'failed') {
    const rawDecline = data.decline_message || data.error || 'Transaction declined by processor';
    const declineCode = data.decline_code || '';
    const is004 = String(declineCode) === '004' || /processor not found/i.test(rawDecline);

    const userMessage = mapProviderError(rawDecline, declineCode || null);

    return is004
      ? {
          tone: 'error',
          title: 'Acquirer configuration error',
          description: 'Processor configuration error — your card was NOT charged. Please contact support.',
          code: '004',
        }
      : {
          tone: 'error',
          title: 'Payment declined',
          description: userMessage,
          code: declineCode || undefined,
        };
  }

  if (data?.success) {
    return {
      tone: 'info',
      title: 'Verifying charge',
      description: 'Your payment is being verified. Please wait…',
    };
  }

  if (data?.transaction?.status === 'pending') {
    return {
      tone: 'info',
      title: 'Payment processing',
      description: 'Your payment is being processed…',
    };
  }

  return {
    tone: 'warning',
    title: 'Payment pending',
    description: `Status: ${data?.transaction?.status || 'unknown'}`,
  };
}

/**
 * Sanitize a raw API response object, stripping fields that
 * must never reach the frontend.
 */
export function sanitizePaymentResponse(raw: Record<string, any>): Record<string, any> {
  const cleaned = { ...raw };
  delete cleaned.providerResponse;
  if (cleaned.transaction && typeof cleaned.transaction === 'object') {
    const tx = { ...cleaned.transaction };
    delete tx.processor_raw_response;
    cleaned.transaction = tx;
  }
  return cleaned;
}
