/**
 * Extracts human-readable transaction status with processor response details
 * from transaction metadata (provider_response) and payment_attempts.
 */

export interface TransactionStatusInfo {
  /** Display label: "Approved", "Pending", "Declined", "Refunded" */
  label: string;
  /** Decline reason / response message from the processor */
  reason?: string;
  /** Raw response code from the processor */
  responseCode?: string;
  /** Variant for Badge component */
  variant: 'success' | 'warning' | 'secondary' | 'destructive' | 'outline';
}

export function getTransactionStatusInfo(
  status: string,
  metadata?: Record<string, any>
): TransactionStatusInfo {
  const providerResponse = metadata?.provider_response || {};
  const rawMessage = providerResponse.message || providerResponse.respmsg || providerResponse.error?.message || '';
  const rawCode = metadata?.threeds_failure_subtype || providerResponse.error?.code || providerResponse.statusCode || providerResponse.respcode || providerResponse.response_code || '';

  // "Failed 3DS" — issuer requested authentication but the redirect couldn't complete
  const errCodeStr = String(rawCode || '').toUpperCase();
  const isFailed3DS =
    errCodeStr === '3DS_REDIRECT_MISSING_URL' ||
    errCodeStr === '3DS_TIMEOUT' ||
    errCodeStr === '3DS_FAILED' ||
    String(providerResponse.status || '').toLowerCase() === 'failed3ds';

  if (isFailed3DS) {
    const subtypeMessage = errCodeStr === '3DS_TIMEOUT'
      ? 'The issuer 3DS challenge timed out before the OTP/authentication response was received.'
      : errCodeStr === '3DS_REDIRECT_MISSING_URL'
        ? 'The issuer requested 3DS, but ShieldHub did not return a challenge URL.'
        : 'Issuer requested authentication but the 3DS challenge could not be completed.';
    return {
      label: errCodeStr === '3DS_TIMEOUT' ? 'Failed 3DS: Timeout' : errCodeStr === '3DS_REDIRECT_MISSING_URL' ? 'Failed 3DS: Missing URL' : 'Failed 3DS',
      reason: subtypeMessage,
      responseCode: String(rawCode || '3DS_FAILED'),
      variant: 'destructive',
    };
  }

  switch (status) {
    case 'completed':
      return {
        label: 'Approved',
        reason: rawMessage || 'Transaction approved',
        responseCode: rawCode || '00',
        variant: 'success',
      };

    case 'pending':
    case 'processing':
      return {
        label: 'Pending',
        reason: rawMessage || 'Awaiting processor confirmation',
        responseCode: rawCode || undefined,
        variant: 'warning',
      };

    case 'failed': {
      const declineReason = extractDeclineReason(rawMessage, rawCode, providerResponse);
      return {
        label: 'Declined',
        reason: declineReason,
        responseCode: rawCode || undefined,
        variant: 'destructive',
      };
    }

    case 'refunded':
      return {
        label: 'Refunded',
        reason: rawMessage || 'Transaction refunded',
        variant: 'outline',
      };

    default:
      return {
        label: status.charAt(0).toUpperCase() + status.slice(1),
        reason: rawMessage || undefined,
        variant: 'secondary',
      };
  }
}

function extractDeclineReason(message: string, code: string, providerResponse: any): string {
  if (message && message !== 'Transaction declined' && message !== 'Declined') {
    return message;
  }

  const codeMap: Record<string, string> = {
    '05': 'Do not honor',
    '14': 'Invalid card number',
    '51': 'Insufficient funds',
    '54': 'Expired card',
    '55': 'Incorrect PIN',
    '57': 'Transaction not permitted',
    '61': 'Exceeds withdrawal limit',
    '62': 'Restricted card',
    '65': 'Activity count limit exceeded',
    '75': 'PIN tries exceeded',
    '78': 'Blocked, first use',
    '91': 'Issuer unavailable',
    '800': '3D Secure required by issuer — try a different card',
    '96': 'System malfunction',
    'N7': 'CVV mismatch',
    'R1': 'Revocation of authorization',
    'card_declined': 'Card declined by issuer',
    'insufficient_funds': 'Insufficient funds',
    'expired_card': 'Expired card',
    'incorrect_cvc': 'Incorrect CVC/CVV',
    'processing_error': 'Processing error',
    'lost_card': 'Card reported lost',
    'stolen_card': 'Card reported stolen',
    'fraud_suspected': 'Suspected fraud',
    'do_not_honor': 'Do not honor',
    'invalid_account': 'Invalid account',
    'velocity_exceeded': 'Too many attempts',
  };

  if (code && codeMap[code]) return codeMap[code];
  if (code && codeMap[String(code).toLowerCase()]) return codeMap[String(code).toLowerCase()];

  if (providerResponse.status === 'Declined' || providerResponse.status === 'Failed') {
    if (providerResponse.error?.messsage) return providerResponse.error.messsage;
    if (providerResponse.error?.message) return providerResponse.error.message;
  }

  if (code) return `Decline code: ${code}`;
  return 'Transaction declined by processor';
}
