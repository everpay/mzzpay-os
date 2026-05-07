import { describe, it, expect } from 'vitest';

/**
 * Comprehensive email subject-line tests:
 * 1. Status-drift detection (Approved vs Declined) for payment-confirmation
 * 2. errorCode delimiter/spacing format enforcement
 * 3. Subject-line format tests for ALL remaining templates
 * 4. E2E trigger simulation for Approved and Declined flows
 */

// ── Mirror helpers ────────────────────────────────────────────────
function shortId(id?: string): string {
  if (!id) return 'N/A';
  const stripped = id.replace(/^(tx-|txn_|ord_|ch_|ref_|set_|inv_|sub_|pay_)/, '');
  return stripped.replace(/[^a-zA-Z0-9]/g, '').slice(0, 10).toUpperCase();
}

// ── Mirror subject functions ──────────────────────────────────────
const SUBJECTS: Record<string, (d: Record<string, any>) => string> = {
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
};

const SAMPLE = {
  amount: '250.00',
  currency: 'USD',
  transactionId: 'tx-abc123def456',
  status: 'Approved',
  errorCode: 'DO_NOT_HONOR',
  reason: 'Insufficient funds',
};

// ── 1. Payment-confirmation status drift ──────────────────────────
describe('Payment-confirmation subject matches transaction status', () => {
  it('approved subject starts with "Payment Approved" and never contains "Declined"', () => {
    const s = SUBJECTS['payment-confirmation']({ ...SAMPLE, status: 'Approved' });
    expect(s).toMatch(/^Payment Approved — /);
    expect(s).not.toContain('Declined');
  });

  it('declined subject starts with "Payment Declined" and never contains "Approved"', () => {
    const s = SUBJECTS['payment-confirmation']({ ...SAMPLE, status: 'Declined' });
    expect(s).toMatch(/^Payment Declined — /);
    expect(s).not.toContain('Approved');
  });

  it('failed subject starts with "Payment Declined" and never contains "Approved"', () => {
    const s = SUBJECTS['payment-confirmation']({ ...SAMPLE, status: 'failed' });
    expect(s).toMatch(/^Payment Declined — /);
    expect(s).not.toContain('Approved');
  });

  it('case-insensitive status check: "DECLINED" maps to declined subject', () => {
    const s = SUBJECTS['payment-confirmation']({ ...SAMPLE, status: 'DECLINED' });
    expect(s).toMatch(/^Payment Declined/);
  });

  it('case-insensitive status check: "FAILED" maps to declined subject', () => {
    const s = SUBJECTS['payment-confirmation']({ ...SAMPLE, status: 'FAILED' });
    expect(s).toMatch(/^Payment Declined/);
  });

  it('unknown status defaults to approved subject', () => {
    const s = SUBJECTS['payment-confirmation']({ ...SAMPLE, status: 'pending' });
    expect(s).toMatch(/^Payment Approved/);
  });
});

// ── 2. errorCode delimiter/spacing format ─────────────────────────
describe('Declined/failed subjects errorCode format enforcement', () => {
  const ERROR_CODE_PATTERN = / — [A-Z0-9_]+$/; // ' — ERRORCODE' at end
  const FALLBACK_PATTERN = / — Error$/;

  it('payment-confirmation declined with errorCode ends with " — CODE"', () => {
    const s = SUBJECTS['payment-confirmation']({ ...SAMPLE, status: 'Declined', errorCode: 'E51' });
    expect(s).toMatch(/ — E51$/);
    expect(s).toMatch(ERROR_CODE_PATTERN);
  });

  it('payment-confirmation failed with errorCode ends with " — CODE"', () => {
    const s = SUBJECTS['payment-confirmation']({ ...SAMPLE, status: 'failed', errorCode: 'DO_NOT_HONOR' });
    expect(s).toMatch(/ — DO_NOT_HONOR$/);
  });

  it('payment-confirmation declined without errorCode ends with " — Error"', () => {
    const s = SUBJECTS['payment-confirmation']({ ...SAMPLE, status: 'Declined', errorCode: undefined });
    expect(s).toMatch(FALLBACK_PATTERN);
  });

  it('payment-confirmation declined with empty errorCode ends with " — Error"', () => {
    const s = SUBJECTS['payment-confirmation']({ ...SAMPLE, status: 'Declined', errorCode: '' });
    expect(s).toMatch(FALLBACK_PATTERN);
  });

  it('delimiter is em-dash (—) not hyphen (-) or en-dash (–)', () => {
    const s = SUBJECTS['payment-confirmation']({ ...SAMPLE, status: 'Declined', errorCode: 'E51' });
    // Must use — not – or -
    expect(s).toContain(' — E51');
    expect(s).not.toMatch(/ - E51/);
    expect(s).not.toMatch(/ – E51/);
  });

  it('payment-declined template with reason uses em-dash delimiter', () => {
    const s = SUBJECTS['payment-declined']({ ...SAMPLE, reason: 'Card stolen' });
    expect(s).toContain(' — Card stolen');
    expect(s).not.toMatch(/ - Card stolen/);
  });

  it('malformed errorCode with spaces is included verbatim', () => {
    const s = SUBJECTS['payment-confirmation']({ ...SAMPLE, status: 'Declined', errorCode: 'INVALID CARD' });
    expect(s).toContain(' — INVALID CARD');
  });
});

// ── 3. Remaining template subject-line format stability ───────────
describe('Remaining templates subject-line format stability', () => {
  const templates = ['charge-succeeded', 'refund-confirmation', 'payout-confirmation', 'settlement-ready'] as const;

  for (const name of templates) {
    const label = name.replace(/-/g, ' ');

    it(`${label}: produces non-empty subject`, () => {
      const s = SUBJECTS[name](SAMPLE);
      expect(s.trim().length).toBeGreaterThan(0);
    });

    it(`${label}: subject ≤120 chars`, () => {
      const s = SUBJECTS[name](SAMPLE);
      expect(s.length).toBeLessThanOrEqual(120);
    });

    it(`${label}: includes amount and currency`, () => {
      const s = SUBJECTS[name](SAMPLE);
      expect(s).toContain('250.00');
      expect(s).toContain('USD');
    });

    it(`${label}: uses em-dash delimiter`, () => {
      const s = SUBJECTS[name](SAMPLE);
      expect(s).toContain(' — ');
    });

    it(`${label}: never contains "Declined" or "Error"`, () => {
      const s = SUBJECTS[name](SAMPLE);
      expect(s).not.toContain('Declined');
      expect(s).not.toContain('Error');
    });
  }

  it('charge-succeeded starts with "Charge Captured"', () => {
    expect(SUBJECTS['charge-succeeded'](SAMPLE)).toMatch(/^Charge Captured/);
  });

  it('refund-confirmation starts with "Refund Processed"', () => {
    expect(SUBJECTS['refund-confirmation'](SAMPLE)).toMatch(/^Refund Processed/);
  });

  it('payout-confirmation starts with "Payout Initiated"', () => {
    expect(SUBJECTS['payout-confirmation'](SAMPLE)).toMatch(/^Payout Initiated/);
  });

  it('settlement-ready starts with "Settlement Ready"', () => {
    expect(SUBJECTS['settlement-ready'](SAMPLE)).toMatch(/^Settlement Ready/);
  });
});

// ── 4. E2E trigger simulation ─────────────────────────────────────
describe('E2E transactional email trigger simulation', () => {
  const SENDER = 'MzzPay';
  const FROM_DOMAIN = 'mzzpay.io';

  function simulateEmailSend(templateName: string, data: Record<string, any>) {
    const subjectFn = SUBJECTS[templateName];
    if (!subjectFn) throw new Error(`Unknown template: ${templateName}`);
    return {
      subject: subjectFn(data),
      from: `${SENDER} <noreply@${FROM_DOMAIN}>`,
      to: data.recipientEmail || 'customer@example.com',
      templateName,
    };
  }

  it('approved payment: subject, sender, and recipient are correct', () => {
    const result = simulateEmailSend('payment-confirmation', {
      ...SAMPLE,
      status: 'Approved',
      recipientEmail: 'john@example.com',
    });
    expect(result.subject).toMatch(/^Payment Approved — 250\.00 USD — Receipt #/);
    expect(result.from).toBe('MzzPay <noreply@mzzpay.io>');
    expect(result.to).toBe('john@example.com');
  });

  it('declined payment: subject, sender, and recipient are correct', () => {
    const result = simulateEmailSend('payment-confirmation', {
      ...SAMPLE,
      status: 'Declined',
      errorCode: 'DO_NOT_HONOR',
      recipientEmail: 'jane@example.com',
    });
    expect(result.subject).toBe('Payment Declined — 250.00 USD — DO_NOT_HONOR');
    expect(result.from).toBe('MzzPay <noreply@mzzpay.io>');
    expect(result.to).toBe('jane@example.com');
  });

  it('declined payment-declined template: correct subject with reason', () => {
    const result = simulateEmailSend('payment-declined', {
      ...SAMPLE,
      reason: 'Insufficient funds',
      recipientEmail: 'bob@example.com',
    });
    expect(result.subject).toBe('Payment Declined — 250.00 USD — Insufficient funds');
    expect(result.to).toBe('bob@example.com');
  });

  it('charge-succeeded: correct subject and sender', () => {
    const result = simulateEmailSend('charge-succeeded', {
      ...SAMPLE,
      recipientEmail: 'merchant@example.com',
    });
    expect(result.subject).toBe('Charge Captured — 250.00 USD');
    expect(result.from).toContain('MzzPay');
  });

  it('refund-confirmation: correct subject', () => {
    const result = simulateEmailSend('refund-confirmation', SAMPLE);
    expect(result.subject).toBe('Refund Processed — 250.00 USD');
  });

  it('payout-confirmation: correct subject', () => {
    const result = simulateEmailSend('payout-confirmation', SAMPLE);
    expect(result.subject).toBe('Payout Initiated — 250.00 USD');
  });

  it('settlement-ready: correct subject', () => {
    const result = simulateEmailSend('settlement-ready', SAMPLE);
    expect(result.subject).toBe('Settlement Ready — 250.00 USD');
  });
});

// ── 5. Cross-template uniqueness (regression guard) ───────────────
describe('All template subjects remain unique', () => {
  it('no two templates produce the same subject for identical data', () => {
    const seen = new Map<string, string>();
    const dupes: string[] = [];
    for (const [name, fn] of Object.entries(SUBJECTS)) {
      const s = fn(SAMPLE);
      const existing = [...seen.entries()].find(([, v]) => v === s);
      if (existing) dupes.push(`"${name}" == "${existing[0]}": "${s}"`);
      seen.set(name, s);
    }
    expect(dupes).toEqual([]);
  });
});
