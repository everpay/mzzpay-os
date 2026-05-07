import { describe, it, expect } from 'vitest';

/**
 * Enforces that ALL transactional email template subject lines are unique.
 * If a new template is added with a duplicate subject line, this test will fail.
 *
 * We replicate the subject functions from the registry here so the test
 * runs in the Vitest (Node) environment without Deno imports.
 */

// Mirror every template's subject function exactly as defined in the .tsx files.
// When adding a new template, you MUST add its subject function here too.
const TEMPLATE_SUBJECTS: Record<string, (data: Record<string, any>) => string> = {
  'payment-confirmation': (d) => {
    const isDeclined = d.status?.toLowerCase() === 'declined' || d.status?.toLowerCase() === 'failed';
    if (isDeclined) {
      return `Payment Declined — ${d.amount || '0.00'} ${d.currency || 'USD'}${d.errorCode ? ` — ${d.errorCode}` : ' — Error'}`;
    }
    return `Payment Approved — ${d.amount || '0.00'} ${d.currency || 'USD'} — Receipt #${d.transactionId ? d.transactionId.slice(-8).toUpperCase() : 'N/A'}`;
  },
  'payment-declined': (d) =>
    `Payment Declined — ${d.amount || '0.00'} ${d.currency || 'USD'}${d.reason ? ` — ${d.reason}` : ''}`,
  'charge-succeeded': (d) =>
    `Charge Captured — ${d.amount || '0.00'} ${d.currency || 'USD'}`,
  'refund-confirmation': (d) =>
    `Refund Processed — ${d.amount || '0.00'} ${d.currency || 'USD'}`,
  'payout-confirmation': (d) =>
    `Payout Initiated — ${d.amount || '0.00'} ${d.currency || 'USD'}`,
  'settlement-ready': (d) =>
    `Settlement Ready — ${d.amount || '0.00'} ${d.currency || 'USD'}`,
  'invoice-created': () => 'New Invoice from MzzPay',
  'invoice-paid': (d) =>
    `Invoice Paid — ${d.amount || '0.00'} ${d.currency || 'USD'}`,
  'customer-welcome': () => 'Welcome to MzzPay',
  'chargeback-notification': (d) =>
    `Chargeback Filed — ${d.amount || '0.00'} ${d.currency || 'USD'}`,
  'transfer-notification': (d) =>
    `Transfer Notification — ${d.amount || '0.00'} ${d.currency || 'USD'}`,
  'transfer-sent': (d) =>
    `Transfer Sent — ${d.amount || '0.00'} ${d.currency || 'USD'}`,
  'transfer-received': (d) =>
    `Transfer Received — ${d.amount || '0.00'} ${d.currency || 'USD'}`,
  'deposit-confirmation': (d) =>
    `Deposit Confirmed — ${d.amount || '0.00'} ${d.currency || 'USD'}`,
  'subscription-created': (d) =>
    `Subscription Created — ${d.planName || 'Plan'}`,
  'subscription-renewed': (d) =>
    `Subscription Renewed — ${d.planName || 'Plan'}`,
  'subscription-canceled': (d) =>
    `Subscription Canceled — ${d.planName || 'Plan'}`,
  'team-invite': () => "You've been invited to MzzPay",
  'admin-new-signup': () => 'New Merchant Signup',
};

const SAMPLE_DATA = {
  amount: '100.00',
  currency: 'USD',
  transactionId: 'tx-abc123def456',
  reason: 'Insufficient funds',
  planName: 'Pro Plan',
  status: 'Approved',
  errorCode: 'E100',
};

describe('Email subject line uniqueness (all templates)', () => {
  it('every template produces a unique subject line given the same data', () => {
    const subjects: Record<string, string> = {};
    const duplicates: string[] = [];

    for (const [name, fn] of Object.entries(TEMPLATE_SUBJECTS)) {
      const subject = fn(SAMPLE_DATA);
      const existing = Object.entries(subjects).find(([, s]) => s === subject);
      if (existing) {
        duplicates.push(`"${name}" duplicates "${existing[0]}": "${subject}"`);
      }
      subjects[name] = subject;
    }

    expect(duplicates).toEqual([]);
  });

  it('payment-confirmation (approved) differs from payment-declined', () => {
    const approved = TEMPLATE_SUBJECTS['payment-confirmation']({ ...SAMPLE_DATA, status: 'Approved' });
    const declined = TEMPLATE_SUBJECTS['payment-declined'](SAMPLE_DATA);
    expect(approved).not.toBe(declined);
  });

  it('payment-confirmation (declined) differs from payment-declined template', () => {
    const confirmDeclined = TEMPLATE_SUBJECTS['payment-confirmation']({ ...SAMPLE_DATA, status: 'Declined' });
    const declinedTemplate = TEMPLATE_SUBJECTS['payment-declined'](SAMPLE_DATA);
    expect(confirmDeclined).not.toBe(declinedTemplate);
  });

  it('no subject line is empty', () => {
    for (const [name, fn] of Object.entries(TEMPLATE_SUBJECTS)) {
      const subject = fn(SAMPLE_DATA);
      expect(subject.trim().length, `${name} has empty subject`).toBeGreaterThan(0);
    }
  });

  it('no subject line exceeds 120 characters', () => {
    for (const [name, fn] of Object.entries(TEMPLATE_SUBJECTS)) {
      const subject = fn(SAMPLE_DATA);
      expect(subject.length, `${name} subject too long: "${subject}"`).toBeLessThanOrEqual(120);
    }
  });

  it('payment-confirmation approved subject starts with "Payment Approved"', () => {
    const subject = TEMPLATE_SUBJECTS['payment-confirmation']({ ...SAMPLE_DATA, status: 'Approved' });
    expect(subject).toMatch(/^Payment Approved/);
    expect(subject).not.toMatch(/Declined/);
  });

  it('payment-confirmation declined subject starts with "Payment Declined"', () => {
    const subject = TEMPLATE_SUBJECTS['payment-confirmation']({ ...SAMPLE_DATA, status: 'Declined' });
    expect(subject).toMatch(/^Payment Declined/);
    expect(subject).not.toMatch(/Approved/);
  });

  it('payment-confirmation failed subject starts with "Payment Declined"', () => {
    const subject = TEMPLATE_SUBJECTS['payment-confirmation']({ ...SAMPLE_DATA, status: 'failed' });
    expect(subject).toMatch(/^Payment Declined/);
  });

  it('declined subject includes errorCode when present', () => {
    const subject = TEMPLATE_SUBJECTS['payment-confirmation']({ ...SAMPLE_DATA, status: 'Declined', errorCode: 'E51' });
    expect(subject).toContain('E51');
    expect(subject).toMatch(/— E51$/);
  });

  it('failed subject includes errorCode when present', () => {
    const subject = TEMPLATE_SUBJECTS['payment-confirmation']({ ...SAMPLE_DATA, status: 'failed', errorCode: 'DO_NOT_HONOR' });
    expect(subject).toContain('DO_NOT_HONOR');
  });

  it('declined subject without errorCode falls back to "Error"', () => {
    const subject = TEMPLATE_SUBJECTS['payment-confirmation']({ ...SAMPLE_DATA, status: 'Declined', errorCode: undefined });
    expect(subject).toMatch(/— Error$/);
  });

  it('payment-declined template includes reason when provided', () => {
    const subject = TEMPLATE_SUBJECTS['payment-declined']({ ...SAMPLE_DATA, reason: 'Insufficient funds' });
    expect(subject).toContain('Insufficient funds');
  });
});
