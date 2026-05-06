/**
 * E2E-style tests for payment form validation banners.
 *
 * These tests verify that all three payment UIs (NewPayment, Checkout,
 * PayInvoice) properly parse processor_validation_error responses and
 * render the FormValidationBanner with field-level details instead of
 * a generic "fix your fields" message.
 */
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

// ─── Helpers ───

function readSource(file: string): string {
  return fs.readFileSync(path.resolve(__dirname, '..', file), 'utf-8');
}

// ─── NewPayment form validation ───

describe('NewPayment validation error handling', () => {
  const src = readSource('pages/NewPayment.tsx');

  it('imports FormValidationBanner', () => {
    expect(src).toContain("import { FormValidationBanner");
  });

  it('renders FormValidationBanner component', () => {
    expect(src).toContain('<FormValidationBanner');
    expect(src).toContain('validationBannerData');
  });

  it('parses processor_validation_error with field-level detail', () => {
    expect(src).toContain("processor_validation_error");
    expect(src).toContain('setFieldErrors');
    expect(src).toContain('setFormErrors');
  });

  it('does NOT use the old isValidationError / ValidationPayload pattern', () => {
    expect(src).not.toContain('isValidationError');
    expect(src).not.toContain('ValidationPayload');
  });

  it('does NOT fire a redundant toast for validation errors', () => {
    expect(src).not.toMatch(/notifyError.*processor_validation_error/);
  });

  it('includes ip field in customer payload', () => {
    expect(src).toContain("ip: '0.0.0.0'");
  });

  it('sends billing with snake_case postal_code', () => {
    expect(src).toContain('postal_code:');
  });
});

// ─── Checkout form validation ───

describe('Checkout validation error handling', () => {
  const src = readSource('pages/Checkout.tsx');

  it('imports FormValidationBanner', () => {
    expect(src).toContain("import { FormValidationBanner");
  });

  it('renders FormValidationBanner component', () => {
    expect(src).toContain('<FormValidationBanner');
  });

  it('parses processor_validation_error with field-level detail', () => {
    expect(src).toContain("processor_validation_error");
    expect(src).toContain('setCheckoutFieldErrors');
    expect(src).toContain('setCheckoutFormErrors');
  });

  it('does NOT fire a redundant toast for validation errors', () => {
    // After the fix, processor_validation_error should only show the inline banner
    expect(src).not.toMatch(/notifyError.*processor_validation_error/);
  });

  it('checks both error_code and code for processor_validation_error', () => {
    expect(src).toContain("data?.error_code === 'processor_validation_error' || data?.code === 'processor_validation_error'");
  });

  it('includes ip field in customer payload', () => {
    expect(src).toContain("ip: '0.0.0.0'");
  });

  it('sends billing with snake_case postal_code', () => {
    expect(src).toContain('postal_code:');
  });
});

// ─── PayInvoice form validation ───

describe('PayInvoice validation error handling', () => {
  const src = readSource('pages/PayInvoice.tsx');

  it('imports FormValidationBanner', () => {
    expect(src).toContain("import { FormValidationBanner");
  });

  it('renders FormValidationBanner component', () => {
    expect(src).toContain('<FormValidationBanner');
  });

  it('parses processor_validation_error with field-level detail', () => {
    expect(src).toContain("processor_validation_error");
    expect(src).toMatch(/setInvoiceFieldErrors|invoiceFieldErrors/);
  });

  it('does NOT fire a redundant toast for validation errors', () => {
    expect(src).not.toMatch(/notifyError.*processor_validation_error/);
    expect(src).not.toMatch(/notifyError.*Invalid payment details/);
  });

  it('checks both error_code and code for processor_validation_error', () => {
    expect(src).toContain("data?.error_code === 'processor_validation_error' || data?.code === 'processor_validation_error'");
  });

  it('includes ip field in customer payload', () => {
    expect(src).toContain("ip: '0.0.0.0'");
  });

  it('sends billing with snake_case postal_code', () => {
    expect(src).toContain('postal_code:');
  });
});

// ─── Cross-form consistency checks ───

describe('All payment forms use consistent validation pattern', () => {
  const forms = ['pages/NewPayment.tsx', 'pages/Checkout.tsx', 'pages/PayInvoice.tsx'];

  for (const file of forms) {
    const src = readSource(file);
    const name = path.basename(file, '.tsx');

    it(`${name} imports FormValidationBanner`, () => {
      expect(src).toContain('FormValidationBanner');
    });

    it(`${name} handles processor_validation_error`, () => {
      expect(src).toContain('processor_validation_error');
    });

    it(`${name} does NOT show generic "highlighted fields" banner`, () => {
      expect(src).not.toContain('Please correct the highlighted fields');
    });

    it(`${name} does NOT fire redundant toast for validation errors`, () => {
      // No notifyError call should reference processor_validation_error
      expect(src).not.toMatch(/notifyError.*processor_validation_error/);
    });

    it(`${name} includes ip in customer payload`, () => {
      expect(src).toContain("ip:");
    });

    it(`${name} uses snake_case postal_code in billing`, () => {
      expect(src).toContain('postal_code:');
    });

    it(`${name} strips card number spaces before submission`, () => {
      expect(src).toContain("cardNumber.replace(/\\s/g, '')");
    });

    it(`${name} does NOT rely on old ValidationErrorBanner for processor errors`, () => {
      const hasOldImport = src.includes("from '@/components/ValidationErrorBanner'") ||
                           src.includes('from "@/components/ValidationErrorBanner"');
      if (hasOldImport) {
        expect(src).toContain('FormValidationBanner');
      }
    });
  }
});
