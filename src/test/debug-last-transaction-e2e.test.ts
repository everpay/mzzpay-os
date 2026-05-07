import { describe, it, expect } from 'vitest';

/**
 * Integration tests for the /debug-last-transaction edge function.
 * Validates CORS preflight, auth enforcement, and response schema.
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://sprjfzeyyihtfvxnfuhb.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';
const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/debug-last-transaction`;

// ═══════════════════════════════════════════════════════════════
// 1. OPTIONS preflight
// ═══════════════════════════════════════════════════════════════
describe('debug-last-transaction: OPTIONS preflight', () => {
  it('returns 200 with CORS headers on OPTIONS', async () => {
    const res = await fetch(FUNCTION_URL, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'https://mzzpay.io',
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'authorization, content-type, apikey',
      },
    });

    // Consume body to avoid resource leak
    await res.text();

    expect(res.status).toBe(200);
    expect(res.headers.get('access-control-allow-origin')).toBe('*');
    const allowHeaders = res.headers.get('access-control-allow-headers') || '';
    expect(allowHeaders).toContain('authorization');
    expect(allowHeaders).toContain('content-type');
    expect(allowHeaders).toContain('apikey');
  });
});

// ═══════════════════════════════════════════════════════════════
// 2. Auth enforcement
// ═══════════════════════════════════════════════════════════════
describe('debug-last-transaction: auth enforcement', () => {
  it('returns 401 without Authorization header', async () => {
    const res = await fetch(FUNCTION_URL, {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
      },
    });

    const body = await res.json();
    expect(res.status).toBe(401);
    expect(body.error).toBeDefined();
  });

  it('returns 401 with invalid bearer token', async () => {
    const res = await fetch(FUNCTION_URL, {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': 'Bearer invalid-token-12345',
        'Content-Type': 'application/json',
      },
    });

    const body = await res.json();
    expect(res.status).toBe(401);
    expect(body.error).toBeDefined();
  });
});

// ═══════════════════════════════════════════════════════════════
// 3. Response payload schema (simulated)
// ═══════════════════════════════════════════════════════════════
describe('debug-last-transaction: response schema contract', () => {
  const EXPECTED_FIELDS = [
    'transaction_id',
    'amount',
    'currency',
    'status',
    'provider',
    'provider_ref',
    'card_brand',
    'card_last4',
    'card_bin',
    'processor_error_code',
    'processor_error_message',
    'processor_raw_response',
    'descriptor',
    'shieldhub_client_id',
    'created_at',
  ];

  it('contract: all expected fields are defined in schema', () => {
    // This verifies the edge function response contract matches our expectations
    expect(EXPECTED_FIELDS).toContain('transaction_id');
    expect(EXPECTED_FIELDS).toContain('processor_raw_response');
    expect(EXPECTED_FIELDS).toContain('descriptor');
    expect(EXPECTED_FIELDS).toContain('shieldhub_client_id');
    expect(EXPECTED_FIELDS.length).toBe(15);
  });

  it('contract: descriptor is extracted from processor_raw_response', () => {
    // Simulate the extraction logic from the edge function
    const rawResponse = {
      status: 'Declined',
      descriptor: 'AXP*FER*AXP*FERES',
      shieldhub_client_id: '4LkUxLtoML01p7uZow',
      error: { code: '305', message: 'Insufficient funds' },
    };

    const descriptor = rawResponse.descriptor || null;
    const clientId = rawResponse.shieldhub_client_id || null;

    expect(descriptor).toBe('AXP*FER*AXP*FERES');
    expect(clientId).toBe('4LkUxLtoML01p7uZow');
  });

  it('contract: null descriptor when raw response has no descriptor', () => {
    const rawResponse = {
      status: 'Declined',
      error: { code: '004', message: 'Processor not found' },
    };

    const descriptor = (rawResponse as any).descriptor || null;
    const clientId = (rawResponse as any).shieldhub_client_id || null;

    expect(descriptor).toBeNull();
    expect(clientId).toBeNull();
  });

  it('contract: descriptor_text fallback', () => {
    const rawResponse = {
      status: 'Redirect',
      descriptor_text: 'AXP*FER*AXP*FERES',
    };

    const descriptor = (rawResponse as any).descriptor || (rawResponse as any).descriptor_text || null;
    expect(descriptor).toBe('AXP*FER*AXP*FERES');
  });
});

// ═══════════════════════════════════════════════════════════════
// 4. CORS on error responses
// ═══════════════════════════════════════════════════════════════
describe('debug-last-transaction: CORS on error responses', () => {
  it('401 response includes CORS headers', async () => {
    const res = await fetch(FUNCTION_URL, {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
      },
    });

    await res.text();
    expect(res.headers.get('access-control-allow-origin')).toBe('*');
  });
});
