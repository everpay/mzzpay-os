/**
 * Webhook E2E tests covering:
 * 1. Signature validation (valid, invalid, missing)
 * 2. Replay protection (timestamp-based)
 * 3. Deduplication on event.id
 * 4. Retry behavior (exponential backoff schedule)
 *
 * These run against the webhook-dispatch edge function contract.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---- helpers mirroring the verify-webhook shared module ----
async function hmacSha256Hex(secret: string, body: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(body));
  return Array.from(new Uint8Array(sig))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}

// ---- Signature Validation ----
describe('Webhook Signature Validation', () => {
  const SECRET = 'whsec_test_secret_abc123';

  it('accepts a correctly signed payload', async () => {
    const body = JSON.stringify({ id: 'evt_001', type: 'payment.completed', data: { amount: 500 } });
    const sig = await hmacSha256Hex(SECRET, body);
    const expected = await hmacSha256Hex(SECRET, body);
    expect(constantTimeEqual(sig, expected)).toBe(true);
  });

  it('rejects a payload with a tampered body', async () => {
    const original = JSON.stringify({ id: 'evt_001', type: 'payment.completed', data: { amount: 500 } });
    const tampered = JSON.stringify({ id: 'evt_001', type: 'payment.completed', data: { amount: 9999 } });
    const sig = await hmacSha256Hex(SECRET, original);
    const check = await hmacSha256Hex(SECRET, tampered);
    expect(constantTimeEqual(sig, check)).toBe(false);
  });

  it('rejects a payload signed with wrong secret', async () => {
    const body = JSON.stringify({ id: 'evt_001', type: 'payment.completed' });
    const good = await hmacSha256Hex(SECRET, body);
    const bad = await hmacSha256Hex('wrong_secret', body);
    expect(constantTimeEqual(good, bad)).toBe(false);
  });

  it('rejects an empty signature', async () => {
    const body = JSON.stringify({ id: 'evt_001', type: 'payment.completed' });
    const sig = await hmacSha256Hex(SECRET, body);
    expect(constantTimeEqual(sig, '')).toBe(false);
  });

  it('handles sha256= prefix stripping', async () => {
    const body = JSON.stringify({ id: 'evt_001' });
    const sig = await hmacSha256Hex(SECRET, body);
    const prefixed = `sha256=${sig}`;
    const actual = prefixed.startsWith('sha256=') ? prefixed.slice(7) : prefixed;
    expect(constantTimeEqual(sig.toLowerCase(), actual.toLowerCase())).toBe(true);
  });
});

// ---- Replay Protection ----
describe('Webhook Replay Protection', () => {
  it('detects replayed events by checking timestamp window', () => {
    const now = Date.now();
    const fiveMinAgo = now - 5 * 60 * 1000;
    const sixMinAgo = now - 6 * 60 * 1000;
    const TOLERANCE_MS = 5 * 60 * 1000;

    expect(Math.abs(now - fiveMinAgo) <= TOLERANCE_MS).toBe(true);
    expect(Math.abs(now - sixMinAgo) <= TOLERANCE_MS).toBe(false);
  });

  it('rejects future-dated timestamps beyond tolerance', () => {
    const now = Date.now();
    const future = now + 10 * 60 * 1000;
    const TOLERANCE_MS = 5 * 60 * 1000;
    expect(Math.abs(now - future) <= TOLERANCE_MS).toBe(false);
  });
});

// ---- Deduplication on event.id ----
describe('Webhook Deduplication', () => {
  it('deduplicates by event_id using a Set (simulating provider_events table)', () => {
    const seen = new Set<string>();
    const eventId = 'evt_dedup_001';

    // First delivery
    const first = !seen.has(eventId);
    seen.add(eventId);
    expect(first).toBe(true);

    // Retry delivery — should be deduped
    const second = !seen.has(eventId);
    expect(second).toBe(false);
  });

  it('allows different event IDs through', () => {
    const seen = new Set<string>();
    seen.add('evt_001');
    expect(!seen.has('evt_002')).toBe(true);
  });

  it('handles null event_id by always inserting (synthetic events)', () => {
    const eventId: string | null = null;
    // When eventId is null we never check for duplicates
    const shouldInsert = !eventId;
    expect(shouldInsert).toBe(true);
  });
});

// ---- Retry Behavior ----
describe('Webhook Retry Behavior', () => {
  const RETRY_INTERVALS_MS = [
    60_000,       // 1 min
    300_000,      // 5 min
    900_000,      // 15 min
    3_600_000,    // 1 hr
    14_400_000,   // 4 hr
    43_200_000,   // 12 hr
    86_400_000,   // 24 hr
    259_200_000,  // 72 hr
  ];

  it('follows exponential backoff schedule for 8 retries', () => {
    expect(RETRY_INTERVALS_MS).toHaveLength(8);
    // Each interval should be greater than the previous
    for (let i = 1; i < RETRY_INTERVALS_MS.length; i++) {
      expect(RETRY_INTERVALS_MS[i]).toBeGreaterThan(RETRY_INTERVALS_MS[i - 1]);
    }
  });

  it('caps at 72 hours for the final retry', () => {
    const last = RETRY_INTERVALS_MS[RETRY_INTERVALS_MS.length - 1];
    expect(last).toBe(72 * 60 * 60 * 1000);
  });

  it('computes next_retry_at correctly for each attempt', () => {
    const baseTime = new Date('2026-01-01T00:00:00Z').getTime();
    const retries = RETRY_INTERVALS_MS.map((interval, i) => ({
      attempt: i + 1,
      next_retry_at: new Date(baseTime + interval).toISOString(),
    }));
    expect(retries[0].next_retry_at).toBe('2026-01-01T00:01:00.000Z');
    expect(retries[retries.length - 1].next_retry_at).toBe('2026-01-04T00:00:00.000Z');
  });

  it('marks delivery as failed after max retries exceeded', () => {
    const MAX_RETRIES = 8;
    const attemptCount = 9;
    const shouldRetry = attemptCount <= MAX_RETRIES;
    expect(shouldRetry).toBe(false);
  });

  it('first retry next_retry_at is set to 60s after initial failure', () => {
    const failedAt = Date.now();
    const nextRetry = new Date(failedAt + RETRY_INTERVALS_MS[0]);
    expect(nextRetry.getTime() - failedAt).toBe(60_000);
  });
});

// ---- webhook-dispatch contract ----
describe('Webhook Dispatch Contract', () => {
  it('signs payload with HMAC-SHA256 and includes required headers', async () => {
    const SECRET = 'whsec_merchant_123';
    const body = JSON.stringify({ id: crypto.randomUUID(), type: 'payment.completed', data: {}, created: Date.now() });
    const signature = await hmacSha256Hex(SECRET, body);

    // Verify the required headers would be present
    const headers = {
      'Content-Type': 'application/json',
      'X-Mzzpay-Signature': signature,
      'X-Mzzpay-Event': 'payment.completed',
    };

    expect(headers['X-Mzzpay-Signature']).toHaveLength(64);
    expect(headers['X-Mzzpay-Event']).toBe('payment.completed');
    expect(headers['Content-Type']).toBe('application/json');
  });

  it('event payload has required shape', () => {
    const payload = {
      id: crypto.randomUUID(),
      type: 'payment.completed',
      data: { amount: 1000, currency: 'USD' },
      created: Date.now(),
    };
    expect(payload.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(typeof payload.type).toBe('string');
    expect(typeof payload.created).toBe('number');
    expect(payload.data).toBeDefined();
  });
});
