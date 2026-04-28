import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, renderHook } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RoleProtectedRoute, type AppRole } from '@/components/RoleProtectedRoute';
import { navSections } from '@/components/AppSidebar';
import { useUserRole } from '@/hooks/useUserRole';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

const merchantUser = { id: 'merchant-user-1', email: 'merchant@example.com' };
const merchantAllowedRoles: AppRole[] = [
  'super_admin',
  'admin',
  'merchant',
  'reseller',
  'developer',
  'compliance_officer',
  'agent',
  'employee',
];

const merchantSidebarPaths = Array.from(
  new Set([
    ...navSections.flatMap((section) =>
      section.items
        .filter((item) => !item.visibleTo || item.visibleTo.includes('merchant'))
        .map((item) => item.to),
    ),
    '/settings',
  ]),
);

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}</div>;
}

function ProtectedPath({ path }: { path: string }) {
  return (
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route
          path={path}
          element={
            <RoleProtectedRoute strict allowedRoles={merchantAllowedRoles}>
              <div>Merchant route content</div>
              <LocationProbe />
            </RoleProtectedRoute>
          }
        />
        <Route path="/dashboard" element={<div>Dashboard redirect target</div>} />
        <Route path="/login" element={<div>Login redirect target</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  });
}

function wrapperWithClient({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={createQueryClient()}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useAuth).mockReturnValue({
    user: merchantUser as any,
    session: null,
    loading: false,
    signOut: vi.fn(),
  });
});

describe('merchant sidebar route access', () => {
  it('derives merchant access from an owned merchant record even when user_roles has no explicit role', async () => {
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'user_roles') {
        return {
          select: () => ({
            eq: () => Promise.resolve({ data: [], error: null }),
          }),
        } as any;
      }

      if (table === 'merchants') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () => Promise.resolve({ data: { id: 'merchant-1' }, error: null }),
            }),
          }),
        } as any;
      }

      throw new Error(`Unexpected table: ${table}`);
    });

    const { result } = renderHook(() => useUserRole(), { wrapper: wrapperWithClient });

    await waitFor(() => expect(result.current.data?.roles).toContain('merchant'));
    expect(result.current.data?.isMerchant).toBe(true);
  });

  it.each(merchantSidebarPaths)('allows merchant users to open %s without redirecting to /dashboard', async (path) => {
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'user_roles') {
        return {
          select: () => ({
            eq: () => Promise.resolve({ data: [{ role: 'merchant' }], error: null }),
          }),
        } as any;
      }

      if (table === 'merchants') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () => Promise.resolve({ data: { id: 'merchant-1' }, error: null }),
            }),
          }),
        } as any;
      }

      throw new Error(`Unexpected table: ${table}`);
    });

    render(
      <QueryClientProvider client={createQueryClient()}>
        <ProtectedPath path={path} />
      </QueryClientProvider>,
    );

    await waitFor(() => expect(screen.getByText('Merchant route content')).toBeInTheDocument());
    expect(screen.getByTestId('location')).toHaveTextContent(path);
    expect(screen.queryByText('Dashboard redirect target')).not.toBeInTheDocument();
  });
});
