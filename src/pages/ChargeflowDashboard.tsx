import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Shield, TrendingUp, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export default function ChargeflowDashboard() {
  const { user } = useAuth();
  const { data: stats } = useQuery({
    queryKey: ['chargeflow-stats'], enabled: !!user,
    queryFn: async () => {
      const { data: m } = await supabase.from('merchants').select('id').eq('user_id', user!.id).single();
      if (!m) return null;
      const { data: disputes } = await supabase.from('disputes').select('*').eq('merchant_id', m.id);
      const open = disputes?.filter(d => d.status === 'open' || d.status === 'pending').length || 0;
      const won = disputes?.filter(d => d.outcome === 'won').length || 0;
      const lost = disputes?.filter(d => d.outcome === 'lost').length || 0;
      const winRate = won + lost > 0 ? (won / (won + lost)) * 100 : 0;
      const totalRecovered = disputes?.filter(d => d.outcome === 'won').reduce((s, d) => s + Number(d.amount), 0) || 0;
      return { open, won, lost, winRate, totalRecovered, total: disputes?.length || 0 };
    },
  });

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div><h1 className="font-heading text-2xl font-bold flex items-center gap-2"><Shield className="h-6 w-6 text-primary" />Chargeflow Dashboard</h1><p className="text-sm text-muted-foreground mt-1">Automated dispute defense overview</p></div>
          <Link to="/chargebacks/disputes"><Button className="rounded-full">View All Disputes</Button></Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-warning/10"><AlertTriangle className="h-5 w-5 text-warning" /></div><div><p className="text-sm text-muted-foreground">Open</p><p className="text-2xl font-bold">{stats?.open || 0}</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-success/10"><CheckCircle2 className="h-5 w-5 text-success" /></div><div><p className="text-sm text-muted-foreground">Won</p><p className="text-2xl font-bold">{stats?.won || 0}</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-primary/10"><TrendingUp className="h-5 w-5 text-primary" /></div><div><p className="text-sm text-muted-foreground">Win Rate</p><p className="text-2xl font-bold">{stats?.winRate.toFixed(0) || 0}%</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-chart-2/10"><Shield className="h-5 w-5 text-chart-2" /></div><div><p className="text-sm text-muted-foreground">Recovered</p><p className="text-2xl font-bold">${stats?.totalRecovered.toFixed(2) || '0.00'}</p></div></div></CardContent></Card>
        </div>
        <Card><CardHeader><CardTitle>Automation Status</CardTitle></CardHeader><CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg border border-border"><span className="text-sm">Chargeflow integration</span><Badge className="bg-success/10 text-success border-success/20">Active</Badge></div>
            <div className="flex items-center justify-between p-3 rounded-lg border border-border"><span className="text-sm">Webhook sync</span><Badge className="bg-success/10 text-success border-success/20">Connected</Badge></div>
            <div className="flex items-center justify-between p-3 rounded-lg border border-border"><span className="text-sm">Auto-response</span><Badge variant="secondary">Enabled</Badge></div>
          </div>
        </CardContent></Card>
      </div>
    </AppLayout>
  );
}
