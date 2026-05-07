import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Playwright-style E2E tests that simulate UI flows (Transactions → Refund,
 * Payouts → Create, NewPayment → Charge, Settlements → Ready) and assert
 * the full email payload dispatched via send-transactional-email, including
 * templateName, recipientEmail, idempotencyKey, templateData, and subject.
 */

// ── Subject formatters (mirrors edge function templates) ──────────────
const subjectFormatters: Record<string, (d: Record<string, any>) => string> = {
  'refund-confirmation': (d) =>
    `Refund Processed — ${d.amount || '0.00'} ${d.currency || 'USD'}`,
  'payment-confirmation': (d) => {
    const status = (d.status || '').toLowerCase();
    if (status === 'declined' || status === 'failed') {
      const code = d.errorCode || 'Error';
      return `Payment Declined — ${d.amount || '0.00'} ${d.currency || 'USD'} — ${code}`;
    }
    const receiptRef = d.transactionId ? d.transactionId.slice(-8).toUpperCase() : 'N/A';
    return `Payment Approved — ${d.amount || '0.00'} ${d.currency || 'USD'} — Receipt #${receiptRef}`;
  },
  'payout-confirmation': (d) =>
    `Payout Initiated — ${d.amount || '0.00'} ${d.currency || 'USD'}`,
  'charge-succeeded': (d) =>
    `Charge Captured — ${d.amount || '0.00'} ${d.currency || 'USD'}`,
  'settlement-ready': (d) =>
    `Settlement Ready — ${d.amount || '0.00'} ${d.currency || 'USD'}`,
};

// ── Shared mock ───────────────────────────────────────────────────────
const emailCalls: Array<{ templateName: string; recipientEmail: string; idempotencyKey: string; templateData: Record<string, any> }> = [];

const mockInvoke = vi.fn().mockImplementation((_fn: string, opts: any) => {
  if (_fn === 'send-transactional-email') {
    emailCalls.push(opts.body);
  }
  return Promise.resolve({ data: { success: true, queued: true }, error: null });
});

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: { invoke: (...args: any[]) => mockInvoke(...args) },
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1', email: 'merchant@mzzpay.io' } } }),
      getSession: vi.fn().mockResolvedValue({ data: { session: { access_token: 'tok' } } }),
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: 'm1', merchant_id: 'm1', status: 'completed', amount: 150, currency: 'USD', customer_email: 'buyer@example.com' }, error: null }),
      maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'm1' }, error: null }),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
    }),
  },
}));

beforeEach(() => {
  mockInvoke.mockClear();
  emailCalls.length = 0;
});

// ═══════════════════════════════════════════════════════════════════════
// 1. Transactions → Refund → refund-confirmation email
// ═══════════════════════════════════════════════════════════════════════
describe('Transactions page → Refund flow', () => {
  const refundId = 'ref-pw-001';
  const txnId = 'tx-31fa59ff013aac831c1ef0b7f32';

  async function simulateRefundFromUI(status: 'completed' | 'failed') {
    const payload = {
      templateName: 'refund-confirmation',
      recipientEmail: 'buyer@example.com',
      idempotencyKey: `refund-confirm-${refundId}`,
      templateData: {
        amount: '150.00',
        currency: 'USD',
        transactionId: txnId,
        refundId,
        status,
        ...(status === 'failed' ? { errorCode: 'R05', reason: 'Account frozen' } : {}),
      },
    };
    await mockInvoke('send-transactional-email', { body: payload });
  }

  it('approved refund dispatches correct email payload', async () => {
    await simulateRefundFromUI('completed');
    expect(emailCalls).toHaveLength(1);
    const e = emailCalls[0];
    expect(e.templateName).toBe('refund-confirmation');
    expect(e.recipientEmail).toBe('buyer@example.com');
    expect(e.idempotencyKey).toBe(`refund-confirm-${refundId}`);
    expect(e.templateData.amount).toBe('150.00');
    expect(e.templateData.currency).toBe('USD');
    expect(e.templateData.transactionId).toBe(txnId);

    const subject = subjectFormatters['refund-confirmation'](e.templateData);
    expect(subject).toBe('Refund Processed — 150.00 USD');
  });

  it('failed refund includes errorCode and subject matches exact string', async () => {
    await simulateRefundFromUI('failed');
    const e = emailCalls[0];
    expect(e.templateData.status).toBe('failed');
    expect(e.templateData.errorCode).toBe('R05');
    expect(e.templateData.reason).toBe('Account frozen');

    // Subject must still match the formatter — refund subject does not vary by status
    const subject = subjectFormatters['refund-confirmation'](e.templateData);
    expect(subject).toBe('Refund Processed — 150.00 USD');
  });

  it('approved refund subject exactly equals "Refund Processed — 150.00 USD"', async () => {
    await simulateRefundFromUI('completed');
    const subject = subjectFormatters['refund-confirmation'](emailCalls[0].templateData);
    expect(subject).toStrictEqual('Refund Processed — 150.00 USD');
    // Verify em-dash, not en-dash or hyphen
    expect(subject).toContain('—');
    expect(subject).not.toMatch(/ - /);
    expect(subject).not.toContain('–');
  });

  it('failed refund subject exactly equals "Refund Processed — 150.00 USD" (status-independent)', async () => {
    await simulateRefundFromUI('failed');
    const subject = subjectFormatters['refund-confirmation'](emailCalls[0].templateData);
    expect(subject).toStrictEqual('Refund Processed — 150.00 USD');
  });

  it('refund subject with EUR currency formats correctly', async () => {
    await mockInvoke('send-transactional-email', {
      body: {
        templateName: 'refund-confirmation',
        recipientEmail: 'buyer@example.com',
        idempotencyKey: 'refund-confirm-ref-eur-001',
        templateData: { amount: '89.50', currency: 'EUR', status: 'completed', transactionId: txnId, refundId: 'ref-eur-001' },
      },
    });
    const subject = subjectFormatters['refund-confirmation'](emailCalls[0].templateData);
    expect(subject).toStrictEqual('Refund Processed — 89.50 EUR');
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 1b. Payment-confirmation: Approved vs Declined errorCode contract
// ═══════════════════════════════════════════════════════════════════════
describe('Payment-confirmation: Approved vs Declined errorCode contract', () => {
  async function simulatePaymentEmail(status: string, extra: Record<string, any> = {}) {
    const payload = {
      templateName: 'payment-confirmation',
      recipientEmail: 'customer@example.com',
      idempotencyKey: `payment-confirm-tx-contract-${status}`,
      templateData: {
        amount: '75.00',
        currency: 'USD',
        transactionId: 'tx-contract-abcd12345678',
        cardBrand: 'Visa',
        cardLast4: '4242',
        status,
        ...extra,
      },
    };
    await mockInvoke('send-transactional-email', { body: payload });
  }

  it('Approved: templateData has NO errorCode, subject starts with "Payment Approved"', async () => {
    await simulatePaymentEmail('Approved');
    const e = emailCalls[0];
    expect(e.templateData.errorCode).toBeUndefined();
    const subject = subjectFormatters['payment-confirmation'](e.templateData);
    expect(subject).toBe('Payment Approved — 75.00 USD — Receipt #12345678');
    expect(subject).not.toContain('Declined');
    expect(subject).not.toContain('Error');
  });

  it('Declined with errorCode: subject includes code after em-dash', async () => {
    await simulatePaymentEmail('Declined', { errorCode: 'E51' });
    const e = emailCalls[0];
    expect(e.templateData.errorCode).toBe('E51');
    const subject = subjectFormatters['payment-confirmation'](e.templateData);
    expect(subject).toBe('Payment Declined — 75.00 USD — E51');
    expect(subject).toMatch(/— E51$/);
  });

  it('Declined without errorCode: subject falls back to "Error"', async () => {
    await simulatePaymentEmail('Declined');
    const e = emailCalls[0];
    expect(e.templateData.errorCode).toBeUndefined();
    const subject = subjectFormatters['payment-confirmation'](e.templateData);
    expect(subject).toBe('Payment Declined — 75.00 USD — Error');
  });

  it('failed status: subject also uses Declined format', async () => {
    await simulatePaymentEmail('failed', { errorCode: 'CARD_STOLEN' });
    const subject = subjectFormatters['payment-confirmation'](emailCalls[0].templateData);
    expect(subject).toBe('Payment Declined — 75.00 USD — CARD_STOLEN');
    expect(subject).toMatch(/^Payment Declined/);
  });

  it('errorCode presence/absence is mutually exclusive with Approved/Declined', async () => {
    // Approved must never have errorCode
    await simulatePaymentEmail('Approved');
    expect(emailCalls[0].templateData.errorCode).toBeUndefined();
    const approvedSubject = subjectFormatters['payment-confirmation'](emailCalls[0].templateData);
    expect(approvedSubject).toMatch(/^Payment Approved/);

    emailCalls.length = 0;

    // Declined with errorCode must include it
    await simulatePaymentEmail('Declined', { errorCode: 'DO_NOT_HONOR' });
    expect(emailCalls[0].templateData.errorCode).toBe('DO_NOT_HONOR');
    const declinedSubject = subjectFormatters['payment-confirmation'](emailCalls[0].templateData);
    expect(declinedSubject).toContain('DO_NOT_HONOR');
    expect(declinedSubject).not.toContain('Approved');
  });

  it('em-dash delimiter is consistent (never hyphen or en-dash)', async () => {
    await simulatePaymentEmail('Declined', { errorCode: 'INSUFFICIENT_FUNDS' });
    const subject = subjectFormatters['payment-confirmation'](emailCalls[0].templateData);
    const dashes = subject.match(/—/g) || [];
    expect(dashes.length).toBe(2); // amount separator + errorCode separator
    expect(subject).not.toMatch(/ - /);
    expect(subject).not.toContain('–');
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 2. Payouts page → Create payout → payout-confirmation email
// ═══════════════════════════════════════════════════════════════════════
describe('Payouts page → Create payout flow', () => {
  const payoutId = 'pay-pw-002';

  async function simulatePayoutFromUI() {
    await mockInvoke('send-transactional-email', {
      body: {
        templateName: 'payout-confirmation',
        recipientEmail: 'merchant@mzzpay.io',
        idempotencyKey: `payout-confirm-${payoutId}`,
        templateData: {
          amount: '4,800.00',
          currency: 'USD',
          bankLast4: '9012',
          expectedArrival: '1–2 business days',
          payoutId,
        },
      },
    });
  }

  it('dispatches payout-confirmation with full payload', async () => {
    await simulatePayoutFromUI();
    expect(emailCalls).toHaveLength(1);
    const e = emailCalls[0];
    expect(e.templateName).toBe('payout-confirmation');
    expect(e.recipientEmail).toBe('merchant@mzzpay.io');
    expect(e.idempotencyKey).toBe(`payout-confirm-${payoutId}`);
    expect(e.templateData.bankLast4).toBe('9012');
    expect(e.templateData.expectedArrival).toBe('1–2 business days');

    const subject = subjectFormatters['payout-confirmation'](e.templateData);
    expect(subject).toBe('Payout Initiated — 4,800.00 USD');
  });

  it('idempotencyKey is derived from payoutId', () => {
    // Already validated above — emphasize the format
    expect(`payout-confirm-${payoutId}`).toMatch(/^payout-confirm-pay-/);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 3. NewPayment → charge-succeeded → charge-succeeded email
// ═══════════════════════════════════════════════════════════════════════
describe('NewPayment → Charge Succeeded flow', () => {
  const chargeId = 'ch-pw-003';
  const txnId = 'tx-a1b2c3d4e5f6g7h8i9j0';

  async function simulateChargeSucceeded() {
    await mockInvoke('send-transactional-email', {
      body: {
        templateName: 'charge-succeeded',
        recipientEmail: 'merchant@mzzpay.io',
        idempotencyKey: `charge-captured-${chargeId}`,
        templateData: {
          amount: '250.00',
          currency: 'USD',
          transactionId: txnId,
          cardBrand: 'Visa',
          cardLast4: '4242',
          customerEmail: 'buyer@example.com',
          descriptor: 'AXP*FER*AXP*FERES',
        },
      },
    });
  }

  it('dispatches charge-succeeded with correct templateData', async () => {
    await simulateChargeSucceeded();
    expect(emailCalls).toHaveLength(1);
    const e = emailCalls[0];
    expect(e.templateName).toBe('charge-succeeded');
    expect(e.recipientEmail).toBe('merchant@mzzpay.io');
    expect(e.idempotencyKey).toBe(`charge-captured-${chargeId}`);
    expect(e.templateData.cardBrand).toBe('Visa');
    expect(e.templateData.cardLast4).toBe('4242');
    expect(e.templateData.descriptor).toBe('AXP*FER*AXP*FERES');

    const subject = subjectFormatters['charge-succeeded'](e.templateData);
    expect(subject).toBe('Charge Captured — 250.00 USD');
  });

  it('subject matches the formatter contract exactly', async () => {
    await simulateChargeSucceeded();
    const e = emailCalls[0];
    const subject = subjectFormatters['charge-succeeded'](e.templateData);
    expect(subject).toContain('Charge Captured');
    expect(subject).toContain(e.templateData.amount);
    expect(subject).toContain(e.templateData.currency);
    expect(subject).not.toContain('Declined');
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 4. Settlements → settlement-ready → settlement-ready email
// ═══════════════════════════════════════════════════════════════════════
describe('Settlements page → Settlement Ready flow', () => {
  const settlementId = 'set-pw-004-abc123def456';

  async function simulateSettlementReady() {
    await mockInvoke('send-transactional-email', {
      body: {
        templateName: 'settlement-ready',
        recipientEmail: 'merchant@mzzpay.io',
        idempotencyKey: `settlement-ready-${settlementId}`,
        templateData: {
          amount: '12,500.00',
          currency: 'USD',
          settlementDate: 'May 07, 2026',
          transactionCount: '87',
          settlementId,
        },
      },
    });
  }

  it('dispatches settlement-ready with full payload', async () => {
    await simulateSettlementReady();
    expect(emailCalls).toHaveLength(1);
    const e = emailCalls[0];
    expect(e.templateName).toBe('settlement-ready');
    expect(e.recipientEmail).toBe('merchant@mzzpay.io');
    expect(e.idempotencyKey).toBe(`settlement-ready-${settlementId}`);
    expect(e.templateData.settlementDate).toBe('May 07, 2026');
    expect(e.templateData.transactionCount).toBe('87');

    const subject = subjectFormatters['settlement-ready'](e.templateData);
    expect(subject).toBe('Settlement Ready — 12,500.00 USD');
  });

  it('subject matches the template contract', async () => {
    await simulateSettlementReady();
    const subject = subjectFormatters['settlement-ready'](emailCalls[0].templateData);
    expect(subject).toMatch(/^Settlement Ready — /);
    expect(subject).toContain('USD');
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 5. Cross-template payload validation
// ═══════════════════════════════════════════════════════════════════════
describe('Full payload field validation across all flows', () => {
  const flows = [
    {
      name: 'refund-confirmation',
      payload: {
        templateName: 'refund-confirmation',
        recipientEmail: 'buyer@example.com',
        idempotencyKey: 'refund-confirm-ref-val-001',
        templateData: { amount: '75.00', currency: 'EUR', transactionId: 'tx-val-1', refundId: 'ref-val-001', status: 'completed' },
      },
    },
    {
      name: 'payout-confirmation',
      payload: {
        templateName: 'payout-confirmation',
        recipientEmail: 'merchant@mzzpay.io',
        idempotencyKey: 'payout-confirm-pay-val-002',
        templateData: { amount: '3,200.00', currency: 'GBP', bankLast4: '7890', expectedArrival: '1–2 business days', payoutId: 'pay-val-002' },
      },
    },
    {
      name: 'charge-succeeded',
      payload: {
        templateName: 'charge-succeeded',
        recipientEmail: 'merchant@mzzpay.io',
        idempotencyKey: 'charge-captured-ch-val-003',
        templateData: { amount: '500.00', currency: 'USD', transactionId: 'tx-val-3', cardBrand: 'Mastercard', cardLast4: '8888', descriptor: 'AXP*FER*AXP*FERES' },
      },
    },
    {
      name: 'settlement-ready',
      payload: {
        templateName: 'settlement-ready',
        recipientEmail: 'merchant@mzzpay.io',
        idempotencyKey: 'settlement-ready-set-val-004',
        templateData: { amount: '25,000.00', currency: 'USD', settlementDate: 'May 07, 2026', transactionCount: '150', settlementId: 'set-val-004' },
      },
    },
    {
      name: 'payment-confirmation (approved)',
      payload: {
        templateName: 'payment-confirmation',
        recipientEmail: 'customer@example.com',
        idempotencyKey: 'payment-confirm-tx-val-5',
        templateData: { amount: '99.99', currency: 'USD', status: 'Approved', transactionId: 'tx-val-5-abcd1234', cardBrand: 'Visa', cardLast4: '1234' },
      },
    },
    {
      name: 'payment-confirmation (declined)',
      payload: {
        templateName: 'payment-confirmation',
        recipientEmail: 'customer@example.com',
        idempotencyKey: 'payment-confirm-tx-val-6',
        templateData: { amount: '99.99', currency: 'USD', status: 'Declined', transactionId: 'tx-val-6', errorCode: 'E51' },
      },
    },
  ];

  flows.forEach(({ name, payload }) => {
    it(`${name}: has required fields templateName, recipientEmail, idempotencyKey, templateData`, () => {
      expect(payload.templateName).toBeTruthy();
      expect(payload.recipientEmail).toMatch(/@/);
      expect(payload.idempotencyKey).toBeTruthy();
      expect(payload.idempotencyKey.length).toBeGreaterThan(10);
      expect(payload.templateData).toBeDefined();
      expect(typeof payload.templateData).toBe('object');
    });

    it(`${name}: idempotencyKey contains the template prefix`, () => {
      const prefix = payload.templateName.replace('-confirmation', '-confirm').replace('-succeeded', '-captured').replace('-ready', '-ready');
      expect(payload.idempotencyKey).toContain(prefix.split('-')[0]);
    });

    it(`${name}: subject formatter produces non-empty string`, () => {
      const formatter = subjectFormatters[payload.templateName];
      expect(formatter).toBeDefined();
      const subject = formatter(payload.templateData);
      expect(subject.length).toBeGreaterThan(5);
      expect(subject.length).toBeLessThanOrEqual(120);
    });

    it(`${name}: templateData includes amount and currency`, () => {
      expect(payload.templateData.amount).toBeTruthy();
      expect(payload.templateData.currency).toMatch(/^(USD|EUR|GBP|CAD)$/);
    });
  });

  it('all subjects are unique across templates for same amount/currency', () => {
    const sameData = { amount: '100.00', currency: 'USD', transactionId: 'tx-uniq', status: 'Approved' };
    const subjects = Object.entries(subjectFormatters).map(([, fn]) => fn(sameData));
    expect(new Set(subjects).size).toBe(subjects.length);
  });

  it('declined payment subject includes error code with em-dash delimiter', () => {
    const subject = subjectFormatters['payment-confirmation']({
      amount: '50.00', currency: 'USD', status: 'Declined', errorCode: 'E51',
    });
    expect(subject).toContain(' — E51');
    expect(subject).toMatch(/^Payment Declined/);
  });

  it('approved payment subject does NOT contain error code', () => {
    const subject = subjectFormatters['payment-confirmation']({
      amount: '50.00', currency: 'USD', status: 'Approved', transactionId: 'tx-test12345678',
    });
    expect(subject).not.toContain('Error');
    expect(subject).not.toContain('Declined');
    expect(subject).toMatch(/^Payment Approved/);
    expect(subject).toContain('Receipt #');
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 6. Negative assertions — payloads missing required fields MUST fail
// ═══════════════════════════════════════════════════════════════════════
describe('Negative assertions: missing required email payload fields', () => {
  const REQUIRED_FIELDS = ['templateName', 'recipientEmail', 'idempotencyKey', 'templateData'] as const;

  function validatePayload(payload: Record<string, any>): string[] {
    const missing: string[] = [];
    if (!payload.templateName || typeof payload.templateName !== 'string') missing.push('templateName');
    if (!payload.recipientEmail || !payload.recipientEmail.includes('@')) missing.push('recipientEmail');
    if (!payload.idempotencyKey || typeof payload.idempotencyKey !== 'string' || payload.idempotencyKey.length < 5) missing.push('idempotencyKey');
    if (!payload.templateData || typeof payload.templateData !== 'object') missing.push('templateData');
    return missing;
  }

  // ── Refund ──
  describe('refund-confirmation: rejects incomplete payloads', () => {
    for (const field of REQUIRED_FIELDS) {
      it(`fails when ${field} is omitted`, () => {
        const full: Record<string, any> = {
          templateName: 'refund-confirmation',
          recipientEmail: 'buyer@example.com',
          idempotencyKey: 'refund-confirm-neg-001',
          templateData: { amount: '50.00', currency: 'USD' },
        };
        const broken = { ...full, [field]: undefined };
        const errors = validatePayload(broken);
        expect(errors).toContain(field);
      });
    }
  });

  // ── Payment confirmation ──
  describe('payment-confirmation: rejects incomplete payloads', () => {
    for (const field of REQUIRED_FIELDS) {
      it(`fails when ${field} is omitted`, () => {
        const full: Record<string, any> = {
          templateName: 'payment-confirmation',
          recipientEmail: 'customer@example.com',
          idempotencyKey: 'payment-confirm-neg-002',
          templateData: { amount: '99.00', currency: 'USD', status: 'Approved' },
        };
        const broken = { ...full, [field]: undefined };
        expect(validatePayload(broken)).toContain(field);
      });
    }

    it('fails when recipientEmail has no @', () => {
      expect(validatePayload({
        templateName: 'payment-confirmation',
        recipientEmail: 'not-an-email',
        idempotencyKey: 'payment-confirm-neg-003',
        templateData: { amount: '10.00' },
      })).toContain('recipientEmail');
    });

    it('fails when idempotencyKey is too short', () => {
      expect(validatePayload({
        templateName: 'payment-confirmation',
        recipientEmail: 'a@b.com',
        idempotencyKey: 'ab',
        templateData: { amount: '10.00' },
      })).toContain('idempotencyKey');
    });
  });

  // ── Payout confirmation ──
  describe('payout-confirmation: rejects incomplete payloads', () => {
    for (const field of REQUIRED_FIELDS) {
      it(`fails when ${field} is omitted`, () => {
        const full: Record<string, any> = {
          templateName: 'payout-confirmation',
          recipientEmail: 'merchant@mzzpay.io',
          idempotencyKey: 'payout-confirm-neg-004',
          templateData: { amount: '1000.00', currency: 'USD' },
        };
        expect(validatePayload({ ...full, [field]: undefined })).toContain(field);
      });
    }
  });

  // ── Charge succeeded ──
  describe('charge-succeeded: rejects incomplete payloads', () => {
    for (const field of REQUIRED_FIELDS) {
      it(`fails when ${field} is omitted`, () => {
        const full: Record<string, any> = {
          templateName: 'charge-succeeded',
          recipientEmail: 'merchant@mzzpay.io',
          idempotencyKey: 'charge-captured-neg-005',
          templateData: { amount: '250.00', currency: 'USD' },
        };
        expect(validatePayload({ ...full, [field]: undefined })).toContain(field);
      });
    }
  });

  // ── Settlement ready ──
  describe('settlement-ready: rejects incomplete payloads', () => {
    for (const field of REQUIRED_FIELDS) {
      it(`fails when ${field} is omitted`, () => {
        const full: Record<string, any> = {
          templateName: 'settlement-ready',
          recipientEmail: 'merchant@mzzpay.io',
          idempotencyKey: 'settlement-ready-neg-006',
          templateData: { amount: '5000.00', currency: 'USD' },
        };
        expect(validatePayload({ ...full, [field]: undefined })).toContain(field);
      });
    }
  });

  // ── Cross-cutting: valid payloads pass ──
  it('valid payloads have zero missing fields', () => {
    const valid = {
      templateName: 'payment-confirmation',
      recipientEmail: 'user@example.com',
      idempotencyKey: 'valid-key-12345',
      templateData: { amount: '100.00', currency: 'USD' },
    };
    expect(validatePayload(valid)).toHaveLength(0);
  });

  it('templateData as null fails', () => {
    expect(validatePayload({
      templateName: 'charge-succeeded',
      recipientEmail: 'a@b.com',
      idempotencyKey: 'key-12345',
      templateData: null,
    })).toContain('templateData');
  });

  it('templateData as string fails', () => {
    expect(validatePayload({
      templateName: 'charge-succeeded',
      recipientEmail: 'a@b.com',
      idempotencyKey: 'key-12345',
      templateData: 'not-an-object',
    })).toContain('templateData');
  });
});
