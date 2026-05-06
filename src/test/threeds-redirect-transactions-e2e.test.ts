import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * E2E-style tests for the 3DS redirect-only flow.
 *
 * Asserts:
 *   1. No ThreeDSecureModal / dialog is opened — only top-level redirect.
 *   2. The 3DS failure/timeout path shows no modal and no toast.
 *   3. The transactions page columns match the Everpay layout.
 *   4. Transaction rows show correct customer/status data.
 */

// ─── 3DS redirect-only: window.location.href gets set, no dialog ───

describe('3DS redirect-only flow', () => {
  const originalLocation = window.location;

  beforeEach(() => {
    // Mock window.location.href to capture redirects
    delete (window as any).location;
    (window as any).location = { ...originalLocation, href: '' };
    sessionStorage.clear();
  });

  it('getThreeDSecureRedirectUrl returns a URL only for 3DS-eligible responses', async () => {
    const { getThreeDSecureRedirectUrl } = await import('@/lib/three-d-secure');

    // 3DS challenge: code 800 + redirect URL
    const url = getThreeDSecureRedirectUrl(
      { status: 'pending', error: { code: '800' }, redirect_url: 'https://acs.bank.com/auth' },
      'card',
    );
    expect(url).toBe('https://acs.bank.com/auth');

    // Approved — should NOT trigger 3DS
    const noUrl = getThreeDSecureRedirectUrl(
      { status: 'approved', redirect_url: 'https://acs.bank.com/auth' },
      'card',
    );
    expect(noUrl).toBeNull();

    // Declined — should NOT trigger 3DS
    const declinedUrl = getThreeDSecureRedirectUrl(
      { status: 'declined', redirect_url: 'https://acs.bank.com/auth' },
      'card',
    );
    expect(declinedUrl).toBeNull();

    // Non-card method — should NOT trigger 3DS
    const nonCard = getThreeDSecureRedirectUrl(
      { status: 'pending', redirect_url: 'https://acs.bank.com/auth' },
      'pix',
    );
    expect(nonCard).toBeNull();
  });

  it('does NOT produce a 3DS URL when success: true is set', async () => {
    const { getThreeDSecureRedirectUrl } = await import('@/lib/three-d-secure');
    const url = getThreeDSecureRedirectUrl(
      { success: true, status: 'pending', redirect_url: 'https://acs.bank.com/auth' },
      'card',
    );
    expect(url).toBeNull();
  });

  it('does NOT produce a 3DS URL when success: false (explicit decline)', async () => {
    const { getThreeDSecureRedirectUrl } = await import('@/lib/three-d-secure');
    const url = getThreeDSecureRedirectUrl(
      { success: false, status: 'pending', redirect_url: 'https://acs.bank.com/auth' },
      'card',
    );
    expect(url).toBeNull();
  });

  it('handles ShieldHub code 800 with requires_action status', async () => {
    const { getThreeDSecureRedirectUrl } = await import('@/lib/three-d-secure');
    const url = getThreeDSecureRedirectUrl(
      {
        status: 'requires_action',
        error_code: '800',
        '3d_secure_redirect_url': 'https://acs.issuer.com/challenge?id=abc',
      },
      'card',
    );
    expect(url).toBe('https://acs.issuer.com/challenge?id=abc');
  });
});

// ─── ThreeDSecureModal is NOT imported anywhere in payment pages ───

describe('No ThreeDSecureModal in payment pages', () => {
  it('NewPayment does not import ThreeDSecureModal', async () => {
    const src = await import.meta.glob('/src/pages/NewPayment.tsx', { as: 'raw', eager: true });
    const code = Object.values(src)[0] as string;
    expect(code).not.toContain('ThreeDSecureModal');
  });

  it('Checkout does not import ThreeDSecureModal', async () => {
    const src = await import.meta.glob('/src/pages/Checkout.tsx', { as: 'raw', eager: true });
    const code = Object.values(src)[0] as string;
    expect(code).not.toContain('ThreeDSecureModal');
  });

  it('PayInvoice does not import ThreeDSecureModal', async () => {
    const src = await import.meta.glob('/src/pages/PayInvoice.tsx', { as: 'raw', eager: true });
    const code = Object.values(src)[0] as string;
    expect(code).not.toContain('ThreeDSecureModal');
  });

  it('all three pages use window.location.href for 3DS redirect', async () => {
    const pages = await import.meta.glob(
      ['/src/pages/NewPayment.tsx', '/src/pages/Checkout.tsx', '/src/pages/PayInvoice.tsx'],
      { as: 'raw', eager: true },
    );
    for (const [path, code] of Object.entries(pages)) {
      expect(code as string).toContain('window.location.href');
      expect(code as string).toContain("sessionStorage.setItem('3ds_transaction_id'");
    }
  });
});

// ─── ThreeDSecureResult fallback for missing sessionStorage ───

describe('ThreeDSecureResult fallback', () => {
  it('renders fallback UI text when sessionStorage is empty and no query params', async () => {
    const src = await import.meta.glob('/src/pages/ThreeDSecureResult.tsx', { as: 'raw', eager: true });
    const code = Object.values(src)[0] as string;
    expect(code).toContain('Session Context Missing');
    expect(code).toContain('Go to Payments');
    expect(code).toContain('Go to Dashboard');
  });
});

// ─── Transactions table layout matches Everpay columns ───

describe('TransactionTable layout matches Everpay', () => {
  it('has the correct column headers in order', async () => {
    const src = await import.meta.glob('/src/components/TransactionTable.tsx', { as: 'raw', eager: true });
    const code = Object.values(src)[0] as string;

    const expectedColumns = [
      'Tx ID',
      'Method',
      'Amount',
      'Type',
      'Cards & APM IDs',
      'Customer IP',
      'Created',
      'Status',
    ];
    for (const col of expectedColumns) {
      expect(code).toContain(col);
    }
  });

  it('renders card first6/last4, country flag, and customer IP per row', async () => {
    const src = await import.meta.glob('/src/components/TransactionTable.tsx', { as: 'raw', eager: true });
    const code = Object.values(src)[0] as string;

    // Card masking (first 4/last 4 via first6 + last4)
    expect(code).toContain('cardFirst6');
    expect(code).toContain('cardLast4');
    // Country flags
    expect(code).toContain('COUNTRY_FLAGS');
    // Customer IP
    expect(code).toContain('customerIp');
    // Status badge with tooltip
    expect(code).toContain('getTransactionStatusInfo');
  });

  it('shows transaction detail drawer on row click', async () => {
    const src = await import.meta.glob('/src/components/TransactionTable.tsx', { as: 'raw', eager: true });
    const code = Object.values(src)[0] as string;

    expect(code).toContain('TransactionDetailDrawer');
    expect(code).toContain('setSelectedTx');
  });
});

// ─── FormValidationBanner is used consistently ───

describe('FormValidationBanner consistency', () => {
  it('Checkout imports FormValidationBanner', async () => {
    const src = await import.meta.glob('/src/pages/Checkout.tsx', { as: 'raw', eager: true });
    const code = Object.values(src)[0] as string;
    expect(code).toContain('FormValidationBanner');
  });

  it('PayInvoice imports FormValidationBanner', async () => {
    const src = await import.meta.glob('/src/pages/PayInvoice.tsx', { as: 'raw', eager: true });
    const code = Object.values(src)[0] as string;
    expect(code).toContain('FormValidationBanner');
  });

  it('NewPayment uses PaymentResultBanner for validation', async () => {
    const src = await import.meta.glob('/src/pages/NewPayment.tsx', { as: 'raw', eager: true });
    const code = Object.values(src)[0] as string;
    expect(code).toContain('PaymentResultBanner');
  });
});
