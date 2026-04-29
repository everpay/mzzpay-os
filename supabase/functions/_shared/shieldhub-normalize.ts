/**
 * ShieldHub response normalization — shared & unit-testable.
 *
 * ShieldHub response normalization. Direct approvals/declines stay terminal;
 * issuer-requested 3DS is represented as Redirect when ShieldHub returns an
 * actionable challenge URL. There is still no fallback processor.
 */

export interface ShieldHubRaw {
  id?: string | number;
  status?: string;
  amount?: string | number;
  currency?: string;
  redirect_url?: string;
  redirectback_url?: string;
  url?: string;
  payment_url?: string;
  acs_url?: string;
  threeds_url?: string;
  authorization?: string;
  error?: { code?: string | number; message?: string };
  message?: string;
  respcode?: string;
  response_code?: string;
  statusCode?: string | number;
  [k: string]: unknown;
}

export interface NormalizedShieldHub {
  status: 'Approved' | 'Declined' | 'Redirect' | 'Failed3DS' | 'Pending' | 'Failed';
  transaction_reference?: string;
  redirect_url?: string;
  error?: { code: string; message: string };
  [k: string]: unknown;
}

const REDIRECT_URL_KEYS: (keyof ShieldHubRaw)[] = [
  'redirect_url', 'redirectback_url', 'url', 'payment_url', 'acs_url', 'threeds_url',
];

export function extractRedirectUrl(raw: ShieldHubRaw | null | undefined): string | null {
  if (!raw) return null;
  for (const k of REDIRECT_URL_KEYS) {
    const v = raw[k];
    if (typeof v === 'string' && /^https?:\/\//i.test(v)) return v;
  }
  return null;
}

export function normalizeShieldHubResponse(raw: ShieldHubRaw, ref: string): NormalizedShieldHub {
  const status = String(raw?.status || '').toLowerCase();
  // Strip raw `error`/`status` so the spread doesn't fight our normalized shape.
  const { error: _rawError, status: _rawStatus, ...rest } = raw ?? {};

  if (status === 'redirect') {
    const code = String(raw?.error?.code || raw?.respcode || raw?.response_code || '800');
    const redirectUrl = extractRedirectUrl(raw);
    if (redirectUrl) {
      return {
        ...rest,
        transaction_reference: ref,
        status: 'Redirect',
        redirect_url: redirectUrl,
        error: { code, message: raw?.error?.message || raw?.message || 'Issuer requires 3D Secure authentication' },
      };
    }

    return {
      ...rest,
      transaction_reference: ref,
      status: 'Failed3DS',
      error: { code: '3DS_REDIRECT_MISSING_URL', message: raw?.error?.message || raw?.message || 'Issuer requested 3D Secure authentication but no challenge URL was returned' },
    };
  }

  if (status === 'approved') return { ...rest, transaction_reference: ref, status: 'Approved' };
  if (['declined', 'blocked', 'failed'].includes(status)) {
    return {
      ...rest,
      transaction_reference: ref,
      status: 'Declined',
      error: {
        code: String(raw?.error?.code || raw?.respcode || raw?.response_code || 'unknown'),
        message: raw?.error?.message || raw?.message || 'Transaction declined',
      },
    };
  }
  const fallback = (raw?.status as NormalizedShieldHub['status']) || 'Pending';
  return { ...rest, transaction_reference: ref, status: fallback };
}
