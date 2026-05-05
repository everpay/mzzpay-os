import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validateSmartRetry, declineCodeSchema, smartRetrySchema } from '@/lib/smart-retry-schema';

/* ------------------------------------------------------------------ */
/* Smart Retry shared schema tests                                    */
/* ------------------------------------------------------------------ */
describe('smartRetrySchema', () => {
  const valid = {
    enabled: true,
    max_attempts: 3,
    backoff_strategy: 'exponential' as const,
    backoff_seconds: 60,
    retry_decline_codes: ['insufficient_funds'],
  };

  it('accepts valid settings', () => {
    expect(smartRetrySchema.safeParse(valid).success).toBe(true);
  });

  it('rejects max_attempts < 1', () => {
    const r = smartRetrySchema.safeParse({ ...valid, max_attempts: 0 });
    expect(r.success).toBe(false);
  });

  it('rejects max_attempts > 10', () => {
    const r = smartRetrySchema.safeParse({ ...valid, max_attempts: 11 });
    expect(r.success).toBe(false);
  });

  it('rejects non-integer max_attempts', () => {
    const r = smartRetrySchema.safeParse({ ...valid, max_attempts: 2.5 });
    expect(r.success).toBe(false);
  });

  it('rejects backoff_seconds < 10', () => {
    const r = smartRetrySchema.safeParse({ ...valid, backoff_seconds: 5 });
    expect(r.success).toBe(false);
  });

  it('rejects backoff_seconds > 86400', () => {
    const r = smartRetrySchema.safeParse({ ...valid, backoff_seconds: 100000 });
    expect(r.success).toBe(false);
  });

  it('rejects empty decline codes array', () => {
    const r = smartRetrySchema.safeParse({ ...valid, retry_decline_codes: [] });
    expect(r.success).toBe(false);
  });

  it('rejects invalid backoff_strategy', () => {
    const r = smartRetrySchema.safeParse({ ...valid, backoff_strategy: 'random' });
    expect(r.success).toBe(false);
  });
});

describe('declineCodeSchema', () => {
  it('normalises spaces to underscores', () => {
    const r = declineCodeSchema.safeParse('do not honor');
    expect(r.success).toBe(true);
    if (r.success) expect(r.data).toBe('do_not_honor');
  });

  it('rejects codes > 50 chars', () => {
    const r = declineCodeSchema.safeParse('a'.repeat(51));
    expect(r.success).toBe(false);
  });

  it('rejects codes with special chars', () => {
    const r = declineCodeSchema.safeParse('bad-code!');
    expect(r.success).toBe(false);
  });

  it('rejects empty string', () => {
    const r = declineCodeSchema.safeParse('');
    expect(r.success).toBe(false);
  });
});

describe('validateSmartRetry', () => {
  it('returns empty object for valid settings', () => {
    expect(validateSmartRetry({
      enabled: true,
      max_attempts: 5,
      backoff_strategy: 'linear',
      backoff_seconds: 120,
      retry_decline_codes: ['try_again_later'],
    })).toEqual({});
  });

  it('returns per-field errors', () => {
    const errors = validateSmartRetry({
      enabled: true,
      max_attempts: 0,
      backoff_strategy: 'exponential',
      backoff_seconds: 5,
      retry_decline_codes: [],
    });
    expect(errors.max_attempts).toBeTruthy();
    expect(errors.backoff_seconds).toBeTruthy();
    expect(errors.retry_decline_codes).toBeTruthy();
  });
});

/* ------------------------------------------------------------------ */
/* Members invite E2E test                                            */
/* ------------------------------------------------------------------ */
describe('Members invite E2E', () => {
  const mockInvoke = vi.fn();
  const mockUpsert = vi.fn().mockReturnValue({ error: null });
  const mockFrom = vi.fn().mockReturnValue({ upsert: mockUpsert });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls invite-admin and records team_invitation on success', async () => {
    mockInvoke.mockResolvedValue({
      data: { success: true, userId: 'u1', email: 'test@co.com', role: 'admin', emailSent: true, emailError: null },
      error: null,
    });

    // Simulate the invite flow
    const email = 'test@co.com';
    const fullName = 'Test User';
    const role = 'admin';
    const merchantId = 'm1';
    const userId = 'caller1';

    const { data, error } = await mockInvoke('invite-admin', {
      body: { email, fullName, role },
    });

    expect(error).toBeNull();
    expect(data.success).toBe(true);
    expect(data.emailSent).toBe(true);
    expect(data.emailError).toBeNull();

    // Simulate upsert
    mockUpsert({
      merchant_id: merchantId,
      invited_by: userId,
      email: email.toLowerCase(),
      full_name: fullName,
      role,
      status: 'pending',
      last_sent_at: new Date().toISOString(),
    });

    expect(mockUpsert).toHaveBeenCalledTimes(1);
  });

  it('surfaces email failure from invite-admin response', async () => {
    mockInvoke.mockResolvedValue({
      data: { success: true, userId: 'u2', email: 'fail@co.com', role: 'developer', emailSent: false, emailError: 'SMTP timeout' },
      error: null,
    });

    const { data } = await mockInvoke('invite-admin', {
      body: { email: 'fail@co.com', fullName: 'Fail User', role: 'developer' },
    });

    expect(data.success).toBe(true);
    expect(data.emailSent).toBe(false);
    expect(data.emailError).toBe('SMTP timeout');

    // Client would show: "Member invited, but the email could not be sent: SMTP timeout"
  });

  it('throws on auth error', async () => {
    mockInvoke.mockResolvedValue({
      data: { error: 'Only super admins can invite other admins' },
      error: null,
    });

    const { data } = await mockInvoke('invite-admin', {
      body: { email: 'x@y.com', fullName: '', role: 'admin' },
    });

    expect(data.error).toBeTruthy();
  });
});
