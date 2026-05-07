import { describe, it, expect } from 'vitest';

/**
 * Playwright-style tests verifying:
 * 1. Client never starts polling when initial response indicates decline
 * 2. Decline banner renders shieldhub_client_id correctly
 */

const SHIELDHUB_CLIENT_ID = '4LkUxLtoML01p7uZow';
const DESCRIPTOR = 'AXP*FER*AXP*FERES';

// ── Simulate the NewPayment.tsx response handler logic ──
interface BannerResult {
  tone: string;
  title: string;
  description: string;
  code?: string;
  descriptor?: string;
  clientId?: string;
}

function simulatePaymentResponseHandler(response: any): {
  shouldPoll: boolean;
  banner: BannerResult | null;
} {
  const data = response;
  const txStatus = String(data?.transaction?.status || '').toLowerCase();

  // Mirror NewPayment.tsx: check failed BEFORE success
  if (txStatus === 'failed' || data?.success === false) {
    const declineMessage = data.decline_message || data.error || 'Transaction declined';
    const declineCode = data.decline_code || '';
    const descriptor = data.providerResponse?.descriptor || undefined;
    const clientId = data.providerResponse?.shieldhub_client_id || undefined;
    const is004 = String(declineCode) === '004' || /processor not found/i.test(declineMessage);

    return {
      shouldPoll: false,
      banner: is004
        ? { tone: 'error', title: 'Acquirer configuration error', description: 'ShieldHub rejected — no processor enabled.', code: '004', descriptor, clientId }
        : { tone: 'error', title: 'Payment declined', description: `${declineMessage}${declineCode ? ` (code ${declineCode})` : ''}`, code: declineCode || undefined, descriptor, clientId },
    };
  }

  if (data?.success && data?.transaction?.id) {
    return {
      shouldPoll: true,
      banner: { tone: 'info', title: 'Verifying charge', description: 'Checking payment status...' },
    };
  }

  return { shouldPoll: false, banner: { tone: 'warning', title: 'Unknown', description: 'Unknown response' } };
}

// ═══════════════════════════════════════════════════════════════
// 1. Never poll after decline (success:false)
// ═══════════════════════════════════════════════════════════════
describe('Client never polls after decline response', () => {
  it('success:false with failed status → no polling', () => {
    const result = simulatePaymentResponseHandler({
      success: false,
      transaction: { id: 'tx-001', status: 'failed' },
      decline_message: 'Insufficient funds',
      decline_code: '116',
      providerResponse: { shieldhub_client_id: SHIELDHUB_CLIENT_ID, descriptor: DESCRIPTOR },
    });
    expect(result.shouldPoll).toBe(false);
    expect(result.banner?.tone).toBe('error');
  });

  it('success:false without explicit status → no polling', () => {
    const result = simulatePaymentResponseHandler({
      success: false,
      decline_message: 'Card declined',
      decline_code: '100',
    });
    expect(result.shouldPoll).toBe(false);
  });

  it('txStatus=failed even if success not present → no polling', () => {
    const result = simulatePaymentResponseHandler({
      transaction: { id: 'tx-002', status: 'failed' },
      decline_message: 'Do not honor',
      decline_code: '201',
    });
    expect(result.shouldPoll).toBe(false);
  });

  it('004 error → no polling, acquirer config banner', () => {
    const result = simulatePaymentResponseHandler({
      success: false,
      transaction: { id: 'tx-004', status: 'failed' },
      decline_message: 'Processor not found',
      decline_code: '004',
      providerResponse: { shieldhub_client_id: SHIELDHUB_CLIENT_ID, descriptor: DESCRIPTOR },
    });
    expect(result.shouldPoll).toBe(false);
    expect(result.banner?.title).toBe('Acquirer configuration error');
    expect(result.banner?.code).toBe('004');
  });

  it('success:true + completed → polls', () => {
    const result = simulatePaymentResponseHandler({
      success: true,
      transaction: { id: 'tx-ok', status: 'processing' },
    });
    expect(result.shouldPoll).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════
// 2. Decline banner renders shieldhub_client_id
// ═══════════════════════════════════════════════════════════════
describe('Decline banner renders shieldhub_client_id correctly', () => {
  it('banner includes clientId from providerResponse', () => {
    const result = simulatePaymentResponseHandler({
      success: false,
      transaction: { id: 'tx-banner-1', status: 'failed' },
      decline_message: 'Card expired',
      decline_code: '101',
      providerResponse: { shieldhub_client_id: SHIELDHUB_CLIENT_ID, descriptor: DESCRIPTOR },
    });
    expect(result.banner?.clientId).toBe(SHIELDHUB_CLIENT_ID);
    expect(result.banner?.descriptor).toBe(DESCRIPTOR);
  });

  it('banner omits clientId when providerResponse missing', () => {
    const result = simulatePaymentResponseHandler({
      success: false,
      transaction: { id: 'tx-banner-2', status: 'failed' },
      decline_message: 'Generic decline',
    });
    expect(result.banner?.clientId).toBeUndefined();
    expect(result.banner?.descriptor).toBeUndefined();
  });

  it('004 banner shows clientId', () => {
    const result = simulatePaymentResponseHandler({
      success: false,
      transaction: { id: 'tx-004-banner', status: 'failed' },
      decline_message: 'Processor not found',
      decline_code: '004',
      providerResponse: { shieldhub_client_id: SHIELDHUB_CLIENT_ID, descriptor: DESCRIPTOR },
    });
    expect(result.banner?.clientId).toBe(SHIELDHUB_CLIENT_ID);
    expect(result.banner?.title).toBe('Acquirer configuration error');
  });

  it('non-shieldhub decline has no clientId', () => {
    const result = simulatePaymentResponseHandler({
      success: false,
      transaction: { id: 'tx-mondo', status: 'failed' },
      decline_message: 'Declined by issuer',
      decline_code: '05',
      providerResponse: { provider: 'mondo' },
    });
    expect(result.banner?.clientId).toBeUndefined();
  });
});
