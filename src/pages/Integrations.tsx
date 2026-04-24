import { useState } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Globe, CreditCard, Smartphone, Building2, Landmark, ShieldCheck, Zap, ArrowRight, ExternalLink } from 'lucide-react';
import { getProviderLogo } from '@/lib/payment-method-logos';
import { IntegrationConfigureModal } from '@/components/integrations/IntegrationConfigureModal';
import { integrations as supportedGateways, CATEGORIES } from '@/data/integrations-directory';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { processorLabel, processorDescription } from '@/lib/processor-labels';

interface Integration {
  id: string;
  name: string;
  description: string;
  category: string;
  status: 'connected' | 'available' | 'coming_soon';
  regions: string[];
  methods: string[];
  icon: React.ElementType;
  color: string;
  docsUrl?: string;
}

const integrations: Integration[] = [
  { id: 'shieldhub', name: processorLabel('shieldhub'), description: processorDescription('shieldhub')!, category: 'gateways', status: 'connected', regions: ['US', 'MX', 'Global'], methods: ['Card', 'ACH', '3DS'], icon: ShieldCheck, color: 'hsl(var(--chart-2))' },
  { id: 'mondo', name: processorLabel('mondo'), description: processorDescription('mondo')!, category: 'gateways', status: 'connected', regions: ['EU', 'UK'], methods: ['Card', 'SEPA', 'Open Banking'], icon: Building2, color: 'hsl(var(--chart-3))' },
  { id: 'paygate10', name: 'Paygate10', description: 'Emerging markets — IN, PK, LATAM, AFR. UPI, PIX, JazzCash, EasyPaisa.', category: 'gateways', status: 'connected', regions: ['IN', 'PK', 'BR', 'MX', 'CO', 'AR', 'EG'], methods: ['UPI', 'PIX', 'JazzCash', 'EasyPaisa', 'Bank Transfer'], icon: Globe, color: 'hsl(25 95% 53%)' },
  { id: 'matrix', name: processorLabel('matrix'), description: processorDescription('matrix')!, category: 'gateways', status: 'available', regions: ['EU', 'Global'], methods: ['Card', 'APM', 'Subscription'], icon: Zap, color: 'hsl(270 70% 55%)' },
  { id: 'moneto', name: 'Moneto', description: 'Canadian wallet & bank transfer for CAD.', category: 'gateways', status: 'connected', regions: ['CA'], methods: ['Wallet', 'Bank Transfer'], icon: Landmark, color: 'hsl(var(--chart-5))' },
  { id: 'shopify', name: 'Shopify', description: 'Shopify storefront sync & order fulfillment.', category: 'ecommerce', status: 'available', regions: ['Global'], methods: ['Card'], icon: Globe, color: 'hsl(120 60% 40%)' },
  { id: 'woocommerce', name: 'WooCommerce', description: 'WordPress checkout plugin.', category: 'ecommerce', status: 'available', regions: ['Global'], methods: ['Card'], icon: Globe, color: 'hsl(280 60% 45%)' },
  { id: 'chargeflow', name: 'Chargeflow', description: 'Automated chargeback & dispute management.', category: 'fraud', status: 'connected', regions: ['Global'], methods: [], icon: ShieldCheck, color: 'hsl(0 72% 50%)' },
  { id: 'tapix', name: 'Tapix Enrichment', description: 'Transaction enrichment with merchant logos & categories.', category: 'fraud', status: 'connected', regions: ['Global'], methods: [], icon: Zap, color: 'hsl(45 90% 50%)' },
];

export default function Integrations() {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [configModal, setConfigModal] = useState<{ open: boolean; id: string; name: string; connected: boolean }>({ open: false, id: '', name: '', connected: false });
  const { user } = useAuth();

  const { data: merchant } = useQuery({
    queryKey: ['merchant-for-integrations', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase.from('merchants').select('id').eq('user_id', user.id).maybeSingle();
      return data;
    },
    enabled: !!user?.id,
  });

  const supportedItems = supportedGateways.filter((g) => g.category === 'supported');

  const filtered = activeCategory === 'supported'
    ? supportedItems.filter((i) => !search || i.name.toLowerCase().includes(search.toLowerCase()))
    : integrations.filter((i) => {
        const ms = !search || i.name.toLowerCase().includes(search.toLowerCase()) || i.description.toLowerCase().includes(search.toLowerCase());
        const mc = activeCategory === 'all' || i.category === activeCategory;
        return ms && mc;
      });

  const connectedCount = integrations.filter((i) => i.status === 'connected').length;

  const openConfig = (id: string, name: string, connected: boolean) =>
    setConfigModal({ open: true, id, name, connected });

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Integrations & Providers</h1>
            <p className="text-muted-foreground mt-1">
              {connectedCount} of {integrations.length} direct integrations connected · 130+ supported gateways via Active Merchant
            </p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search integrations..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
        </div>

        <Tabs value={activeCategory} onValueChange={setActiveCategory}>
          <TabsList>
            {CATEGORIES.map((cat) => (
              <TabsTrigger key={cat.key} value={cat.key}>{cat.label}</TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {activeCategory !== 'supported' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(filtered as Integration[]).map((integration) => {
              const provLogo = getProviderLogo(integration.id);
              return (
                <Card key={integration.id} className="relative overflow-hidden hover:shadow-md transition-shadow border-border">
                  <CardContent className="p-5 space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        {provLogo ? (
                          <div className="h-10 w-10 rounded-lg flex items-center justify-center bg-background border border-border p-1">
                            <img src={provLogo} alt={integration.name} className="h-7 w-7 object-contain" loading="lazy" />
                          </div>
                        ) : (
                          <div className="h-10 w-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${integration.color}20` }}>
                            <integration.icon className="h-5 w-5" style={{ color: integration.color }} />
                          </div>
                        )}
                        <h3 className="font-semibold text-foreground">{integration.name}</h3>
                      </div>
                      <Badge variant={integration.status === 'connected' ? 'default' : integration.status === 'available' ? 'outline' : 'secondary'}>
                        {integration.status === 'connected' ? 'Connected' : integration.status === 'available' ? 'Available' : 'Coming Soon'}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">{integration.description}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {integration.regions.slice(0, 5).map((r) => (
                        <Badge key={r} variant="secondary" className="text-[10px] px-1.5 py-0">{r}</Badge>
                      ))}
                    </div>
                    {integration.methods.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {integration.methods.slice(0, 4).map((m) => (
                          <span key={m} className="text-[10px] px-2 py-0.5 rounded-full bg-accent text-accent-foreground">{m}</span>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center gap-2 pt-1">
                      <Button size="sm" variant={integration.status === 'available' ? 'outline' : 'ghost'} className="text-xs gap-1.5" onClick={() => openConfig(integration.id, integration.name, integration.status === 'connected')}>
                        {integration.status === 'connected' ? 'Configure' : 'Connect'} <ArrowRight className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {activeCategory === 'supported' && (
          <>
            <p className="text-sm text-muted-foreground">
              Route payments to any of 130+ processors worldwide via the Active Merchant compatibility layer.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {(filtered as typeof supportedItems).map((gw) => (
                <Card key={gw.name} className="hover:shadow-md transition-shadow border-border">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center text-lg overflow-hidden">
                          {gw.icon.startsWith('/') ? (
                            <img src={gw.icon} alt={gw.name} className="h-6 w-6 object-contain" loading="lazy" />
                          ) : gw.icon === '💳' ? (
                            <CreditCard className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <span>{gw.icon}</span>
                          )}
                        </div>
                        <h3 className="font-semibold text-sm text-foreground">{gw.name}</h3>
                      </div>
                      <Badge variant="outline" className="text-[10px]">Active Merchant</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{gw.description}</p>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" className="text-xs gap-1.5" onClick={() => openConfig(gw.name.toLowerCase().replace(/[\s.'-]+/g, '_'), gw.name, false)}>
                        Connect <ArrowRight className="h-3 w-3" />
                      </Button>
                      {gw.learnMore && (
                        <Button size="sm" variant="ghost" className="text-xs gap-1.5" asChild>
                          <a href={gw.learnMore} target="_blank" rel="noopener noreferrer">Docs <ExternalLink className="h-3 w-3" /></a>
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}

        {filtered.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Globe className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="font-medium">No integrations found</p>
          </div>
        )}

        <IntegrationConfigureModal
          open={configModal.open}
          onOpenChange={(o) => setConfigModal((p) => ({ ...p, open: o }))}
          integrationId={configModal.id}
          integrationName={configModal.name}
          merchantId={merchant?.id}
          isConnected={configModal.connected}
        />
      </div>
    </AppLayout>
  );
}
