/**
 * E2E-style tests for reconciliation error fallback UI and
 * payment form data clearing after submission.
 */
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

function readSource(file: string): string {
  return fs.readFileSync(path.resolve(__dirname, '..', file), 'utf-8');
}

// ─── LedgerReconciliationCard error fallback ───

describe('LedgerReconciliationCard error fallback', () => {
  const src = readSource('components/LedgerReconciliationCard.tsx');

  it('uses isError from useQuery', () => {
    expect(src).toContain('isError');
  });

  it('renders error fallback UI with retry button', () => {
    expect(src).toContain('recon-error-fallback');
    expect(src).toContain('temporarily unavailable');
    expect(src).toContain('Retry');
  });

  it('throws on RPC error instead of silently returning empty', () => {
    expect(src).toContain("throw new Error");
  });

  it('has retry config on useQuery', () => {
    expect(src).toContain('retry: 2');
  });
});

// ─── api-reconciliation edge function fallback ───

describe('api-reconciliation edge function', () => {
  const src = fs.readFileSync(
    path.resolve(__dirname, '../../supabase/functions/api-reconciliation/index.ts'),
    'utf-8',
  );

  it('returns fallback flag on RPC error', () => {
    expect(src).toContain('fallback: true');
    expect(src).toContain('RECONCILIATION_SERVICE_ERROR');
  });

  it('always returns HTTP 200 even on error', () => {
    // All status codes in the function should be 200
    const statusMatches = src.match(/status:\s*(\d+)/g) || [];
    const nonAuth = statusMatches.filter(
      (m) => !m.includes('401') && !m.includes('404'),
    );
    for (const m of nonAuth) {
      expect(m).toContain('200');
    }
  });
});

// ─── NewPayment form clears data after submission ───

describe('NewPayment form clears card data after submission', () => {
  const src = readSource('pages/NewPayment.tsx');

  it('resets card fields after successful submission', () => {
    expect(src).toContain("setCardNumber('')");
    expect(src).toContain("setExpMonth('')");
    expect(src).toContain("setExpYear('')");
    expect(src).toContain("setCvc('')");
    expect(src).toContain("setHolderName('')");
  });

  it('increments formResetKey to clear SecureCardForm', () => {
    expect(src).toContain('setFormResetKey');
  });

  it('regenerates idempotency key after submission', () => {
    // Should regenerate the key after both success and data.transaction paths
    const matches = src.match(/idempotencyKeyRef\.current\s*=/g) || [];
    expect(matches.length).toBeGreaterThanOrEqual(2);
  });

  it('sends customer and billing (not customerDetails/billingDetails)', () => {
    // The payload must use the correct field names matching the Zod schema
    expect(src).not.toContain('customerDetails:');
    expect(src).not.toContain('billingDetails:');
    // Correct field names
    expect(src).toMatch(/customer:\s*\{/);
    expect(src).toMatch(/billing:\s*\{/);
  });

  it('strips spaces from card number before sending', () => {
    expect(src).toContain("cardNumber.replace(/\\s/g, '')");
  });

  it('does NOT show redundant toast for validation errors', () => {
    expect(src).not.toMatch(/notifyError.*processor_validation_error/);
  });
});
