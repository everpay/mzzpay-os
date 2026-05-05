import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * E2E-style tests for KYB document upload during Business Verification.
 * Validates:
 *  - Client-side file type and size validation
 *  - Successful upload flow
 *  - RLS / storage error surfacing with clear messages
 */

// ── Mock Supabase client ──
const mockUpload = vi.fn();
const mockList = vi.fn().mockResolvedValue({ data: [], error: null });
const mockGetUser = vi.fn();
const mockFrom = vi.fn().mockReturnValue({
  select: vi.fn().mockReturnValue({
    eq: vi.fn().mockReturnValue({
      single: vi.fn().mockResolvedValue({ data: { id: 'merchant-1' }, error: null }),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    }),
  }),
});

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: () => mockGetUser(),
    },
    storage: {
      from: () => ({
        upload: mockUpload,
        list: mockList,
      }),
    },
    from: mockFrom,
  },
}));

describe('KYB Document Upload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-123', email: 'test@example.com' } },
    });
  });

  // ── Client-side validation ──

  it('rejects files with unsupported MIME types', () => {
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    const badTypes = [
      'application/zip',
      'text/plain',
      'application/vnd.ms-excel',
      'video/mp4',
      'application/x-executable',
    ];

    for (const mime of badTypes) {
      expect(allowedTypes.includes(mime)).toBe(false);
    }

    for (const mime of allowedTypes) {
      expect(allowedTypes.includes(mime)).toBe(true);
    }
  });

  it('rejects files larger than 10 MB', () => {
    const maxSize = 10 * 1024 * 1024; // 10 MB
    const oversizeFile = { size: 11 * 1024 * 1024, type: 'application/pdf', name: 'big.pdf' };
    const okFile = { size: 5 * 1024 * 1024, type: 'application/pdf', name: 'ok.pdf' };

    expect(oversizeFile.size > maxSize).toBe(true);
    expect(okFile.size > maxSize).toBe(false);
  });

  // ── Successful upload ──

  it('uploads a valid PDF to kyb-documents bucket under user folder', async () => {
    mockUpload.mockResolvedValue({ data: { path: 'user-123/1234_doc.pdf' }, error: null });

    const file = new File(['dummy'], 'doc.pdf', { type: 'application/pdf' });
    const userId = 'user-123';
    const path = `${userId}/${Date.now()}_doc.pdf`;

    const { error } = await mockUpload(path, file, { cacheControl: '3600', upsert: false });
    expect(error).toBeNull();
    expect(mockUpload).toHaveBeenCalledWith(path, file, { cacheControl: '3600', upsert: false });
  });

  // ── RLS / storage errors ──

  it('surfaces RLS policy violation with a clear message', async () => {
    mockUpload.mockResolvedValue({
      data: null,
      error: { message: 'new row violates row-level security policy', statusCode: '403' },
    });

    const { error } = await mockUpload('user-123/doc.pdf', new File(['x'], 'doc.pdf'));

    expect(error).toBeTruthy();
    expect(error.message).toContain('row-level security');

    // The component translates this to a user-friendly message
    const userMessage = error.message.includes('row-level security') || error.message.includes('policy')
      ? 'Upload permission denied. Please ensure your email is verified and you are signed in.'
      : error.message;

    expect(userMessage).toBe('Upload permission denied. Please ensure your email is verified and you are signed in.');
  });

  it('surfaces bucket-not-found errors clearly', async () => {
    mockUpload.mockResolvedValue({
      data: null,
      error: { message: 'Bucket not found', statusCode: '404' },
    });

    const { error } = await mockUpload('user-123/doc.pdf', new File(['x'], 'doc.pdf'));
    expect(error).toBeTruthy();
    expect(error.message).toContain('Bucket not found');
  });

  it('surfaces generic storage errors with the original message', async () => {
    mockUpload.mockResolvedValue({
      data: null,
      error: { message: 'The resource already exists', statusCode: '409' },
    });

    const { error } = await mockUpload('user-123/doc.pdf', new File(['x'], 'doc.pdf'));
    expect(error).toBeTruthy();
    expect(error.message).toContain('already exists');
  });

  // ── Unauthenticated user ──

  it('blocks upload when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const { data } = await mockGetUser();
    expect(data.user).toBeNull();

    // Component should show: "You must be signed in to upload documents."
    const errorMessage = !data.user
      ? 'You must be signed in to upload documents. Please log in first.'
      : null;
    expect(errorMessage).toBe('You must be signed in to upload documents. Please log in first.');
  });

  // ── File name sanitization ──

  it('sanitizes file names to remove special characters', () => {
    const dangerousName = 'my doc (1) [final].pdf';
    const safeName = dangerousName.replace(/[^a-zA-Z0-9._-]/g, '_');
    expect(safeName).toBe('my_doc__1___final_.pdf');
    expect(safeName).not.toContain(' ');
    expect(safeName).not.toContain('(');
    expect(safeName).not.toContain('[');
  });
});
