import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ArrowUpDown, DollarSign, Globe, Landmark } from 'lucide-react';
import { format } from 'date-fns';

export default function Treasury() {
  const { data: pools } = useQuery({ queryKey: ['liquidity-pools'], queryFn: async () => { const { data } = await supabase.from('liquidity_pools').select('*'); return data || []; } });
  const { data: fxRates } = useQuery({ queryKey: ['fx-rates'], queryFn: async () => { const { data } = await supabase.from('fx_rates').select('*').order('fetched_at', { ascending: false }).limit(50); return data || []; } });

  const totalLiquidity = pools?.reduce((s, p) => s + Number(p.balance || 0), 0) || 0;
  const currencies = [...new Set(pools?.map(p => p.currency) || [])];
  const regions = [...new Set(pools?.map(p => p.region).filter(Boolean) || [])];

  return (
    <AppLayout>
      <div className="space-y-6">
        <div><h1 className="font-heading text-2xl font-bold">Treasury & Liquidity</h1><p className="text-sm text-muted-foreground">Manage liquidity pools, FX rates, and settlement flows</p></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-primary/10"><DollarSign className="h-5 w-5 text-primary" /></div><div><p className="text-xs text-muted-foreground">Total Liquidity</p><p className="text-xl font-bold">${totalLiquidity.toLocaleString()}</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-accent/10"><Globe className="h-5 w-5" /></div><div><p className="text-xs text-muted-foreground">Currencies</p><p className="text-xl font-bold">{currencies.length}</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-secondary/50"><Landmark className="h-5 w-5" /></div><div><p className="text-xs text-muted-foreground">Regions</p><p className="text-xl font-bold">{regions.length}</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-primary/10"><ArrowUpDown className="h-5 w-5 text-primary" /></div><div><p className="text-xs text-muted-foreground">FX Pairs</p><p className="text-xl font-bold">{fxRates?.length || 0}</p></div></div></CardContent></Card>
        </div>
        <Tabs defaultValue="pools">
          <TabsList><TabsTrigger value="pools">Pools</TabsTrigger><TabsTrigger value="fx">FX Rates</TabsTrigger></TabsList>
          <TabsContent value="pools" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pools?.map(p => <Card key={p.id}><CardContent className="pt-6"><div className="flex justify-between items-start"><div><p className="font-semibold">{p.currency}</p><p className="text-xs text-muted-foreground">{p.region || 'Global'}</p></div><Badge variant="outline">${Number(p.balance).toLocaleString()}</Badge></div></CardContent></Card>)}
            </div>
          </TabsContent>
          <TabsContent value="fx" className="space-y-4">
            <Card><CardHeader><CardTitle className="text-sm">Recent FX Rates</CardTitle></CardHeader><CardContent>
              <div className="rounded-lg border border-border overflow-hidden"><table className="w-full text-sm"><thead className="bg-muted/50"><tr><th className="px-4 py-2 text-left text-muted-foreground font-medium">Base</th><th className="px-4 py-2 text-left text-muted-foreground font-medium">Quote</th><th className="px-4 py-2 text-right text-muted-foreground font-medium">Rate</th><th className="px-4 py-2 text-left text-muted-foreground font-medium">Source</th><th className="px-4 py-2 text-right text-muted-foreground font-medium">Updated</th></tr></thead><tbody>{fxRates?.map(r => <tr key={r.id} className="border-t border-border"><td className="px-4 py-2 font-medium">{r.base_currency}</td><td className="px-4 py-2">{r.quote_currency}</td><td className="px-4 py-2 text-right font-mono">{Number(r.rate).toFixed(4)}</td><td className="px-4 py-2"><Badge variant="secondary" className="text-xs">{r.source || 'manual'}</Badge></td><td className="px-4 py-2 text-right text-muted-foreground text-xs">{format(new Date(r.fetched_at), 'MMM d, HH:mm')}</td></tr>)}</tbody></table></div>
            </CardContent></Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
