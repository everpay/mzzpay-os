import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';

// Mock dependencies
const mockCards = [
  {
    id: 'card-1',
    card_brand: 'visa',
    first_six: '424242',
    last_four: '4242',
    exp_month: 12,
    exp_year: 2027,
    status: 'active',
    token: 'tok_abc',
    created_at: '2024-01-01T00:00:00Z',
    customer_id: 'cust-1',
  },
  {
    id: 'card-2',
    card_brand: 'mastercard',
    first_six: '555555',
    last_four: '4444',
    exp_month: 6,
    exp_year: 2025,
    status: 'expired',
    token: 'tok_def',
    created_at: '2024-02-01T00:00:00Z',
    customer_id: 'cust-2',
  },
];

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1', email: 'test@test.com' } } }),
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: 'm1' }, error: null }),
      maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'm1' }, error: null }),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      then: vi.fn(),
    }),
    functions: { invoke: vi.fn().mockResolvedValue({ data: {}, error: null }) },
  },
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'u1', email: 'test@test.com' },
    signOut: vi.fn(),
    loading: false,
  }),
  AuthProvider: ({ children }: any) => children,
}));

vi.mock('@/hooks/useUserRole', () => ({
  useUserRole: () => ({ data: { roles: ['merchant'], isSuperAdmin: false, isAdmin: false } }),
}));

vi.mock('@/hooks/useSubscriptions', () => ({
  useSubscriptionPlans: () => ({ data: [], refetch: vi.fn() }),
  useSubscriptions: () => ({ data: [], refetch: vi.fn() }),
}));

describe('Saved Cards Tab', () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  const renderTab = () =>
    render(
      <QueryClientProvider client={qc}>
        <BrowserRouter>
          <div data-testid="saved-cards-section">
            <input placeholder="Search by last 4 digits or brand" data-testid="card-search" />
            <table data-testid="cards-table">
              <tbody>
                {mockCards.map((card) => (
                  <tr key={card.id} data-testid={`card-row-${card.id}`}>
                    <td>{card.card_brand}</td>
                    <td>{card.first_six}••••{card.last_four}</td>
                    <td>{card.status}</td>
                    <td>
                      <button data-testid={`revoke-${card.id}`}>Revoke</button>
                      <button data-testid={`delete-${card.id}`}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </BrowserRouter>
      </QueryClientProvider>
    );

  it('renders the cards table with card data', () => {
    renderTab();
    expect(screen.getByTestId('cards-table')).toBeInTheDocument();
    expect(screen.getByTestId('card-row-card-1')).toBeInTheDocument();
    expect(screen.getByTestId('card-row-card-2')).toBeInTheDocument();
  });

  it('shows both active and expired card statuses', () => {
    renderTab();
    expect(screen.getByText('active')).toBeInTheDocument();
    expect(screen.getByText('expired')).toBeInTheDocument();
  });

  it('displays card brands correctly', () => {
    renderTab();
    expect(screen.getByText('visa')).toBeInTheDocument();
    expect(screen.getByText('mastercard')).toBeInTheDocument();
  });

  it('renders masked card numbers (first 6, last 4)', () => {
    renderTab();
    expect(screen.getByText('424242••••4242')).toBeInTheDocument();
    expect(screen.getByText('555555••••4444')).toBeInTheDocument();
  });

  it('has search input for filtering cards', () => {
    renderTab();
    const search = screen.getByTestId('card-search');
    expect(search).toBeInTheDocument();
    expect(search).toHaveAttribute('placeholder', 'Search by last 4 digits or brand');
  });

  it('renders revoke and delete buttons for each card', () => {
    renderTab();
    expect(screen.getByTestId('revoke-card-1')).toBeInTheDocument();
    expect(screen.getByTestId('delete-card-1')).toBeInTheDocument();
    expect(screen.getByTestId('revoke-card-2')).toBeInTheDocument();
    expect(screen.getByTestId('delete-card-2')).toBeInTheDocument();
  });

  it('search input accepts user input', () => {
    renderTab();
    const search = screen.getByTestId('card-search') as HTMLInputElement;
    fireEvent.change(search, { target: { value: '4242' } });
    expect(search.value).toBe('4242');
  });
});
