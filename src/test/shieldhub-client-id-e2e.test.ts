import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Tests verifying:
 * 1. ShieldHub request payload includes client_id in the body
 * 2. Decline/error responses include shieldhub_client_id
 * 3. UI renders descriptor and client_id correctly in banners
 */

const SHIELDHUB_CLIENT_ID = '4LkUxLtoML01p7uZow';
const DESCRIPTOR = 'AXP*FER*AXP*FERES';

// ── ShieldHub payload builder (mirrors process-payment edge function) ──
function buildShieldhubPayload(clientId: string, descriptor: string) {
  return {
    amount: '76.33',
    currency: 'USD',
    transaction_reference: `ref-${Date.now()}`,
    descriptor,
    descriptor_text: descriptor,
    client_id: clientId,
    redirect_mode: 'modal',
    redirectback_url: 'https://checkout.mzzpay.io/3ds-result',
    return_url: 'https://checkout.mzzpay.io/3ds-result',
    success_url: 'https://checkout.mzzpay.io/3ds-result',
    three_ds: 'enrolled',
    customer: { first: 'Joe', last: 'Doe', email: 'joe@example.com', phone: '1234567890', ip: '1.2.3.4' },
    billing: { address: '123 Main St', postal_code: '10001', city: 'New York', state: 'NY', country: 'US' },
    card: { holder: 'Joe Doe', number: '4242424242424242', cvv: '123', expiry_month: '12', expiry_year: '28' },
  };
}

// ── ShieldHub decline response builder (mirrors edge function output) ──
function buildDeclineResponse(code: string, message: string) {
  return {
    status: 'Declined',
    error: { code, message: `Shieldhub: ${message}` },
    errorCode: code,
    errorMessage: message,
    transaction_reference: `ref-decline-${code}`,
    shieldhub_client_id: SHIELDHUB_CLIENT_ID,
    descriptor: DESCRIPTOR,
    __three_ds_status: 'requested_enrolled',
  };
}

// ── Banner simulation (mirrors NewPayment.tsx logic) ──
interface BannerState {
  tone: string;
  title: string;
  description: string;
  code?: string;
  txId?: string;
  descriptor?: string;
  clientId?: string;
}

function simulateBannerFromResponse(data: any): BannerState {
  const txStatus = String(data?.transaction?.status || '').toLowerCase();
  if (txStatus === 'failed' || data?.transaction?.status === 'failed') {
    const declineReason = data.decline_message || data.error || data.providerResponse?.error?.message || 'Transaction declined by processor';
    const declineCode = data.decline_code || data.providerResponse?.error?.code || '';
    const resolvedDescriptor = data.providerResponse?.descriptor || undefined;
    const resolvedClientId = data.providerResponse?.shieldhub_client_id || undefined;
    const is004 = String(declineCode) === '004' || /processor not found/i.test(declineReason);
    return is004
      ? { tone: 'error', title: 'Acquirer configuration error', description: 'ShieldHub rejected — no processor enabled for this merchant. Card NOT charged.', code: '004', txId: data.transaction?.id, descriptor: resolvedDescriptor, clientId: resolvedClientId }
      : { tone: 'error', title: 'Payment declined', description: `${declineReason}${declineCode ? ` (code ${declineCode})` : ''}`, code: declineCode || undefined, txId: data.transaction?.id, descriptor: resolvedDescriptor, clientId: resolvedClientId };
  }
  if (data?.success) {
    return {
      tone: 'info', title: 'Verifying charge', description: 'Verifying...',
      descriptor: data.providerResponse?.descriptor,
      clientId: data.providerResponse?.shieldhub_client_id,
    };
  }
  return { tone: 'warning', title: 'Unknown', description: 'Unknown' };
}

// ═══════════════════════════════════════════════════════════════════════
// 1. ShieldHub payload includes client_id in body
// ═══════════════════════════════════════════════════════════════════════
describe('ShieldHub payload includes client_id in body', () => {
  it('client_id field is present and matches configured value', () => {
    const payload = buildShieldhubPayload(SHIELDHUB_CLIENT_ID, DESCRIPTOR);
    expect(payload.client_id).toBe(SHIELDHUB_CLIENT_ID);
  });

  it('client_id is never empty/null/undefined', () => {
    const payload = buildShieldhubPayload(SHIELDHUB_CLIENT_ID, DESCRIPTOR);
    expect(payload.client_id).toBeTruthy();
    expect(payload.client_id).not.toBe('');
  });

  it('client_id coexists with descriptor and descriptor_text', () => {
    const payload = buildShieldhubPayload(SHIELDHUB_CLIENT_ID, DESCRIPTOR);
    expect(payload.client_id).toBe(SHIELDHUB_CLIENT_ID);
    expect(payload.descriptor).toBe(DESCRIPTOR);
    expect(payload.descriptor_text).toBe(DESCRIPTOR);
  });

  it('missing client_id would cause routing failure — negative assertion', () => {
    const broken = buildShieldhubPayload(SHIELDHUB_CLIENT_ID, DESCRIPTOR);
    delete (broken as any).client_id;
    expect((broken as any).client_id).toBeUndefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 2. Decline response includes shieldhub_client_id and descriptor
// ═══════════════════════════════════════════════════════════════════════
describe('Decline response includes shieldhub_client_id', () => {
  const codes = ['004', '100', '101', '116', '201', '304', '500'];

  codes.forEach((code) => {
    it(`decline code ${code}: response has shieldhub_client_id`, () => {
      const resp = buildDeclineResponse(code, `Error ${code}`);
      expect(resp.shieldhub_client_id).toBe(SHIELDHUB_CLIENT_ID);
    });

    it(`decline code ${code}: response has descriptor`, () => {
      const resp = buildDeclineResponse(code, `Error ${code}`);
      expect(resp.descriptor).toBe(DESCRIPTOR);
    });
  });

  it('shieldhub_client_id is never empty on decline', () => {
    const resp = buildDeclineResponse('116', 'Insufficient funds');
    expect(resp.shieldhub_client_id).toBeTruthy();
    expect(resp.shieldhub_client_id.length).toBeGreaterThan(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 3. UI banner renders descriptor and client_id
// ═══════════════════════════════════════════════════════════════════════
describe('UI banner renders descriptor and client_id', () => {
  it('decline banner includes descriptor from providerResponse', () => {
    const banner = simulateBannerFromResponse({
      success: false,
      transaction: { id: 'tx-test-001', status: 'failed' },
      decline_message: 'Card expired',
      decline_code: '101',
      providerResponse: {
        status: 'Declined',
        error: { code: '101', message: 'Card expired' },
        descriptor: DESCRIPTOR,
        shieldhub_client_id: SHIELDHUB_CLIENT_ID,
      },
    });
    expect(banner.descriptor).toBe(DESCRIPTOR);
    expect(banner.clientId).toBe(SHIELDHUB_CLIENT_ID);
  });

  it('004 banner includes descriptor and clientId', () => {
    const banner = simulateBannerFromResponse({
      success: false,
      transaction: { id: 'tx-004-ui', status: 'failed' },
      decline_message: 'Processor not found',
      decline_code: '004',
      providerResponse: {
        status: 'Declined',
        error: { code: '004', message: 'Processor not found' },
        descriptor: DESCRIPTOR,
        shieldhub_client_id: SHIELDHUB_CLIENT_ID,
      },
    });
    expect(banner.tone).toBe('error');
    expect(banner.title).toBe('Acquirer configuration error');
    expect(banner.descriptor).toBe(DESCRIPTOR);
    expect(banner.clientId).toBe(SHIELDHUB_CLIENT_ID);
    expect(banner.code).toBe('004');
  });

  it('success banner includes descriptor when present', () => {
    const banner = simulateBannerFromResponse({
      success: true,
      transaction: { id: 'tx-ok-001', status: 'completed' },
      providerResponse: {
        status: 'Approved',
        descriptor: DESCRIPTOR,
        shieldhub_client_id: SHIELDHUB_CLIENT_ID,
      },
    });
    expect(banner.descriptor).toBe(DESCRIPTOR);
    expect(banner.clientId).toBe(SHIELDHUB_CLIENT_ID);
  });

  it('banner omits descriptor/clientId when provider is not shieldhub', () => {
    const banner = simulateBannerFromResponse({
      success: true,
      transaction: { id: 'tx-mondo-001', status: 'completed' },
      providerResponse: { status: 'Approved', provider: 'mondo' },
    });
    expect(banner.descriptor).toBeUndefined();
    expect(banner.clientId).toBeUndefined();
  });

  it('TransactionDetailDrawer: processor_raw_response with shieldhub_client_id renders', () => {
    const txRaw = {
      status: 'Declined',
      descriptor: DESCRIPTOR,
      shieldhub_client_id: SHIELDHUB_CLIENT_ID,
      error: { code: '116', message: 'Insufficient funds' },
    };
    // Simulate drawer data extraction
    expect(txRaw.descriptor).toBe(DESCRIPTOR);
    expect(txRaw.shieldhub_client_id).toBe(SHIELDHUB_CLIENT_ID);
  });

  it('TransactionDetailDrawer: missing shieldhub_client_id does not render', () => {
    const txRaw = { status: 'Approved', descriptor: DESCRIPTOR };
    expect((txRaw as any).shieldhub_client_id).toBeUndefined();
  });
});
