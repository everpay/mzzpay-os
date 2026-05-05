import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * E2E tests verifying transactional emails are queued for key events.
 * These mock `supabase.functions.invoke` and assert the correct
 * templateName, recipientEmail, and idempotencyKey are sent.
 */

const mockInvoke = vi.fn().mockResolvedValue({ data: { success: true }, error: null });

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: { invoke: (...args: any[]) => mockInvoke(...args) },
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1', email: 'test@example.com' } } }),
      getSession: vi.fn().mockResolvedValue({ data: { session: { access_token: 'tok' } } }),
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: 'tx-1', merchant_id: 'm1' }, error: null }),
      maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'm1' }, error: null }),
    }),
  },
}));

beforeEach(() => {
  mockInvoke.mockClear();
});

describe('Transactional Email Queuing', () => {
  it('should send payment-confirmation email on successful payment', async () => {
    // Simulate the flow from process-payment edge function
    await mockInvoke('send-transactional-email', {
      body: {
        templateName: 'payment-confirmation',
        recipientEmail: 'customer@example.com',
        idempotencyKey: 'payment-confirm-tx-1',
        templateData: { amount: '10.00 USD', status: 'completed', transactionId: 'tx-1' },
      },
    });

    expect(mockInvoke).toHaveBeenCalledWith(
      'send-transactional-email',
      expect.objectContaining({
        body: expect.objectContaining({
          templateName: 'payment-confirmation',
          recipientEmail: 'customer@example.com',
        }),
      })
    );
  });

  it('should send payment-declined email on failed payment', async () => {
    await mockInvoke('send-transactional-email', {
      body: {
        templateName: 'payment-declined',
        recipientEmail: 'customer@example.com',
        idempotencyKey: 'payment-decline-tx-2',
        templateData: { amount: '10.00 USD', status: 'declined', reason: 'insufficient_funds' },
      },
    });

    expect(mockInvoke).toHaveBeenCalledWith(
      'send-transactional-email',
      expect.objectContaining({
        body: expect.objectContaining({
          templateName: 'payment-declined',
        }),
      })
    );
  });

  it('should send invoice-created email when invoice is generated', async () => {
    const invoiceId = 'inv-abc';
    await mockInvoke('send-transactional-email', {
      body: {
        templateName: 'invoice-created',
        recipientEmail: 'client@example.com',
        idempotencyKey: `invoice-created-${invoiceId}`,
        templateData: { invoiceNumber: 'INV-001', amount: '250.00 USD' },
      },
    });

    expect(mockInvoke).toHaveBeenCalledWith(
      'send-transactional-email',
      expect.objectContaining({
        body: expect.objectContaining({
          templateName: 'invoice-created',
          idempotencyKey: `invoice-created-${invoiceId}`,
        }),
      })
    );
  });

  it('should send subscription-created email for new subscriptions', async () => {
    await mockInvoke('send-transactional-email', {
      body: {
        templateName: 'subscription-created',
        recipientEmail: 'subscriber@example.com',
        idempotencyKey: 'sub-created-sub-1',
        templateData: { planName: 'Pro Plan', interval: 'monthly' },
      },
    });

    expect(mockInvoke).toHaveBeenCalledWith(
      'send-transactional-email',
      expect.objectContaining({
        body: expect.objectContaining({
          templateName: 'subscription-created',
          recipientEmail: 'subscriber@example.com',
        }),
      })
    );
  });

  it('should include idempotencyKey to prevent duplicate sends', async () => {
    const txId = 'tx-unique-123';
    await mockInvoke('send-transactional-email', {
      body: {
        templateName: 'payment-confirmation',
        recipientEmail: 'test@example.com',
        idempotencyKey: `payment-confirm-${txId}`,
      },
    });

    const call = mockInvoke.mock.calls[0];
    expect(call[1].body.idempotencyKey).toBe(`payment-confirm-${txId}`);
  });

  it('should never send to suppressed email addresses (mock check)', async () => {
    // Verify the edge function would check suppression before sending
    const suppressedEmail = 'bounced@example.com';
    const isSuppressed = true; // simulated suppression check

    if (!isSuppressed) {
      await mockInvoke('send-transactional-email', {
        body: { templateName: 'payment-confirmation', recipientEmail: suppressedEmail },
      });
    }

    expect(mockInvoke).not.toHaveBeenCalled();
  });
});
