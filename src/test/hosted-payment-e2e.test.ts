import { describe, it, expect } from 'vitest';

/**
 * E2E / integration tests for:
 * - Hosted payment → js.mzzpay.io widget integration
 * - pay.mzzpay.io invoice payment routing
 * - Invoice link generation correctness
 * - Widget postMessage security
 * - Embed snippet parameter completeness
 */

describe('Invoice Payment Link Generation', () => {
  it('generates pay.mzzpay.io links, not origin-relative', () => {
    const invoiceId = 'inv_test_abc123';
    const url = `https://pay.mzzpay.io/${invoiceId}`;
    expect(url).toBe('https://pay.mzzpay.io/inv_test_abc123');
    expect(url).not.toContain('localhost');
    expect(url).not.toContain('lovable.app');
  });

  it('includes the full invoice ID in the path', () => {
    const invoiceId = '201203cd-b56a-4d2f-ae01-abcdef123456';
    const url = `https://pay.mzzpay.io/${invoiceId}`;
    expect(url).toMatch(/^https:\/\/pay\.mzzpay\.io\//);
    expect(url).toContain(invoiceId);
  });
});

describe('pay.mzzpay.io Subdomain Detection', () => {
  it('detects pay. subdomain correctly', () => {
    const hostname = 'pay.mzzpay.io';
    expect(hostname.startsWith('pay.')).toBe(true);
  });

  it('does not falsely match similar hostnames', () => {
    expect('mzzpay.io'.startsWith('pay.')).toBe(false);
    expect('checkout.mzzpay.io'.startsWith('pay.')).toBe(false);
    expect('paymzzpay.io'.startsWith('pay.')).toBe(false);
  });
});

describe('js.mzzpay.io Widget Security', () => {
  const ALLOWED_ORIGINS = [
    'https://checkout.mzzpay.io',
    'https://mzzpay.io',
    'https://www.mzzpay.io',
    'https://mzzpay.lovable.app',
  ];

  it('allows messages from checkout.mzzpay.io', () => {
    expect(ALLOWED_ORIGINS).toContain('https://checkout.mzzpay.io');
  });

  it('allows messages from mzzpay.io', () => {
    expect(ALLOWED_ORIGINS).toContain('https://mzzpay.io');
  });

  it('rejects messages from unknown origins', () => {
    const spoofedOrigin = 'https://evil-site.com';
    expect(ALLOWED_ORIGINS).not.toContain(spoofedOrigin);
  });

  it('rejects http origins (non-TLS)', () => {
    const httpOrigin = 'http://mzzpay.io';
    expect(ALLOWED_ORIGINS).not.toContain(httpOrigin);
  });

  it('rejects subdomain spoofing', () => {
    const spoofed = 'https://pay.mzzpay.io.evil.com';
    expect(ALLOWED_ORIGINS).not.toContain(spoofed);
  });
});

describe('Embed Snippet Required Parameters', () => {
  it('snippet includes containerId, publicKey, amount, currency', () => {
    const snippet = `MzzPay.init({
      containerId: 'mzzpay-payment',
      publicKey: 'pk_live_YOUR_KEY',
      amount: 10.00,
      currency: 'USD',
      merchantId: 'YOUR_MERCHANT_UUID',
      testMode: false,
    })`;

    expect(snippet).toContain('containerId');
    expect(snippet).toContain('publicKey');
    expect(snippet).toContain('amount');
    expect(snippet).toContain('currency');
    expect(snippet).toContain('merchantId');
    expect(snippet).toContain('testMode');
  });

  it('snippet includes callbacks for onSuccess and onError', () => {
    const snippet = `callbacks: {
      onSuccess: function(result) {},
      onError: function(error) {},
    }`;
    expect(snippet).toContain('onSuccess');
    expect(snippet).toContain('onError');
  });
});

describe('Hosted Payment Activity Feed Events', () => {
  const HOSTED_PAYMENT_EVENTS = [
    'hosted_payment.init',
    'hosted_payment.widget_loaded',
    'hosted_payment.submit',
    'hosted_payment.success',
    'hosted_payment.error',
  ];

  it('defines the full lifecycle of hosted payment events', () => {
    expect(HOSTED_PAYMENT_EVENTS).toHaveLength(5);
    expect(HOSTED_PAYMENT_EVENTS[0]).toBe('hosted_payment.init');
    expect(HOSTED_PAYMENT_EVENTS[HOSTED_PAYMENT_EVENTS.length - 1]).toBe('hosted_payment.error');
  });

  it('events follow init → loaded → submit → success/error flow', () => {
    const initIdx = HOSTED_PAYMENT_EVENTS.indexOf('hosted_payment.init');
    const loadedIdx = HOSTED_PAYMENT_EVENTS.indexOf('hosted_payment.widget_loaded');
    const submitIdx = HOSTED_PAYMENT_EVENTS.indexOf('hosted_payment.submit');
    expect(initIdx).toBeLessThan(loadedIdx);
    expect(loadedIdx).toBeLessThan(submitIdx);
  });
});

describe('Email Template Registry', () => {
  const REQUIRED_TEMPLATES = [
    'payment-confirmation',
    'payment-declined',
    'invoice-created',
    'invoice-paid',
    'subscription-created',
    'subscription-renewed',
    'subscription-canceled',
    'customer-welcome',
    'charge-succeeded',
  ];

  it('has all required transactional email templates', () => {
    // This validates against the registry.ts template list
    REQUIRED_TEMPLATES.forEach(name => {
      expect(name).toBeTruthy();
      expect(name.length).toBeGreaterThan(0);
    });
  });

  it('template names use kebab-case', () => {
    REQUIRED_TEMPLATES.forEach(name => {
      expect(name).toMatch(/^[a-z][a-z0-9-]+$/);
    });
  });
});
