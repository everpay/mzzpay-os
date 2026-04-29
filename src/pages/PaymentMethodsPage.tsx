import { AppLayout } from '@/components/AppLayout';
import { Badge } from '@/components/ui/badge';
import { CreditCard, Building2, Smartphone } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/lib/format';
import { getMethodLogo } from '@/lib/payment-method-logos';

interface MethodItem {
  name: string;
  provider: string;
  enabled: boolean;
  volume: number;
  rate: string;
}

// Curated payment method catalog with provider assignments
const CARD_METHODS = [
  { name: 'Visa', provider: 'shieldhub' },
  { name: 'Mastercard', provider: 'shieldhub' },
  { name: 'Amex', provider: 'shieldhub' },
  { name: 'Discover', provider: 'shieldhub' },
  { name: 'Paygate10', provider: 'paygate10' },
  { name: 'ShieldHub', provider: 'shieldhub' },
  { name: 'Shopify', provider: 'shopify' },
];

const BANK_METHODS = [
  { name: 'ACH', provider: 'plaid', enabled: true },
  { name: 'SEPA', provider: 'mondo', enabled: true },
  { name: 'Open Banking', provider: 'mondo', enabled: true },
  { name: 'PIX', provider: 'paygate10', enabled: false },
  { name: 'Boleto', provider: 'paygate10', enabled: false },
  { name: 'Prometeo', provider: 'prometeo', enabled: true },
];

const WALLET_METHODS = [
  { name: 'Apple Pay', provider: 'matrix', enabled: true },
  { name: 'Google Pay', provider: 'matrix', enabled: true },
  { name: 'PayPal', provider: 'paypal', enabled: false },
  { name: 'JazzCash', provider: 'paygate10', enabled: true },
  { name: 'EasyPaisa', provider: 'paygate10', enabled: true },
  { name: 'NCash', provider: 'paygate10', enabled: true },
  { name: 'bKash', provider: 'makapay', enabled: true },
  { name: 'Nagad', provider: 'makapay', enabled: true },
];

function usePaymentMethodsData() {
  return useQuery({
    queryKey: ['payment-methods-page'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const { data: merchant } = await supabase.from('merchants').select('id').eq('user_id', user.id).single();
      if (!merchant) throw new Error('No merchant');

      const [{ data: transactions }, { data: paymentMethods }] = await Promise.all([
        supabase.from('transactions').select('id, amount, currency, status, provider, metadata, created_at')
          .eq('merchant_id', merchant.id).limit(1000),
        supabase.from('payment_methods').select('id, card_brand, card_last4').limit(500),
      ]);

      // Aggregate transaction volumes by provider
      const providerVolume: Record<string, { volume: number; success: number; total: number }> = {};
      (transactions || []).forEach((t: any) => {
        const p = (t.provider || 'unknown').toLowerCase();
        if (!providerVolume[p]) providerVolume[p] = { volume: 0, success: 0, total: 0 };
        providerVolume[p].total++;
        if (t.status === 'captured' || t.status === 'completed') {
          providerVolume[p].success++;
          providerVolume[p].volume += Number(t.amount) || 0;
        }
      });

      // Card brand counts
      const cardBrandCounts: Record<string, number> = {};
      (paymentMethods || []).forEach((pm: any) => {
        const brand = (pm.card_brand || 'unknown').toLowerCase();
        cardBrandCounts[brand] = (cardBrandCounts[brand] || 0) + 1;
      });

      const buildFromCatalog = (catalog: { name: string; provider: string; enabled?: boolean }[]): MethodItem[] => {
        return catalog.map(entry => {
          const key = entry.name.toLowerCase().replace(/\s+/g, '_');
          const provKey = entry.provider.toLowerCase();
          const pStats = providerVolume[provKey] || providerVolume[key] || { volume: 0, success: 0, total: 0 };
          const brandCount = cardBrandCounts[key] || 0;
          const hasData = pStats.total > 0 || brandCount > 0;
          const rate = pStats.total > 0 ? `${((pStats.success / pStats.total) * 100).toFixed(1)}%` : '—';

          return {
            name: entry.name,
            provider: entry.provider,
            enabled: entry.enabled !== undefined ? entry.enabled : hasData,
            volume: pStats.volume || 0,
            rate,
          };
        });
      };

      const cardItems = buildFromCatalog(CARD_METHODS);
      const bankItems = buildFromCatalog(BANK_METHODS);
      const walletItems = buildFromCatalog(WALLET_METHODS);

      return { cardItems, bankItems, walletItems };
    },
  });
}

const providerLabel: Record<string, string> = {
  shieldhub: 'ShieldHub',
  paygate10: 'Paygate10',
  shopify: 'Shopify',
  plaid: 'Plaid',
  mondo: 'Mondo',
  prometeo: 'Prometeo',
  matrix: 'Matrix',
  paypal: 'PayPal',
  makapay: 'MakaPay',
};

export default function PaymentMethodsPage() {
  const { data, isLoading } = usePaymentMethodsData();

  const methods = [
    {
      category: 'Cards',
      icon: <CreditCard className="w-5 h-5" />,
      endpoint: 'POST /payments/cards',
      items: data?.cardItems || [],
    },
    {
      category: 'Bank Debits',
      icon: <Building2 className="w-5 h-5" />,
      endpoint: 'POST /payments/ach | /payments/sepa',
      items: data?.bankItems || [],
    },
    {
      category: 'Digital Wallets',
      icon: <Smartphone className="w-5 h-5" />,
      endpoint: 'POST /payments/wallet',
      items: data?.walletItems || [],
    },
  ];

  return (
    <AppLayout>
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">Payment Methods</h1>
        <p className="mt-1 text-sm text-muted-foreground">Unified interface for global payment method support</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid gap-6">
          {methods.map((group) => (
            <div key={group.category} className="rounded-xl border border-border bg-card p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                    {group.icon}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">{group.category}</h3>
                    <p className="font-mono text-xs text-muted-foreground">{group.endpoint}</p>
                  </div>
                </div>
              </div>
              {group.items.length === 0 ? (
                <p className="text-muted-foreground text-center py-6 text-sm">No {group.category.toLowerCase()} data yet</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left pb-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Method</th>
                        <th className="text-left pb-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                        <th className="text-right pb-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Volume (30d)</th>
                        <th className="text-right pb-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Auth Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.items.map((item: MethodItem) => (
                        <tr key={item.name} className="border-b border-border last:border-0">
                          <td className="py-3 font-medium">
                            <div className="flex items-center gap-2">
                              {(() => {
                                const logo = getMethodLogo(item.name);
                                return logo ? <img src={logo} alt={item.name} className="h-5 w-auto max-w-[28px] object-contain" loading="lazy" /> : null;
                              })()}
                              {item.name}
                            </div>
                          </td>
                          <td className="py-3">
                            <Badge variant={item.enabled ? 'default' : 'secondary'}>{item.enabled ? 'Active' : 'Inactive'}</Badge>
                          </td>
                          <td className="py-3 text-right font-mono text-sm">{formatCurrency(item.volume, 'USD')}</td>
                          <td className="py-3 text-right font-mono text-sm text-emerald-500">{item.rate}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </AppLayout>
  );
}
