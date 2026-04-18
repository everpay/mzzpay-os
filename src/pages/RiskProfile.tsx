import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Shield, AlertTriangle, TrendingUp, CheckCircle2 } from 'lucide-react';

export default function RiskProfile() {
  const { user } = useAuth();
  const { data: risk } = useQuery({
    queryKey: ['risk-score'], enabled: !!user,
    queryFn: async () => {
      const { data: m } = await supabase.from('merchants').select('id').eq('user_id', user!.id).single();
      if (!m) return null;
      const { data } = await supabase.from('merchant_risk_scores').select('*').eq('merchant_id', m.id).maybeSingle();
      return data;
    },
  });

  const score = risk?.score ?? 0;
  const level = risk?.level ?? 'low';
  const factors = (risk?.factors as any[]) || [];

  const levelColor = level === 'high' ? 'destructive' : level === 'medium' ? 'secondary' : 'default';
  const Icon = level === 'high' ? AlertTriangle : level === 'medium' ? TrendingUp : CheckCircle2;
  const iconColor = level === 'high' ? 'text-destructive' : level === 'medium' ? 'text-warning' : 'text-success';

  return (
    <AppLayout>
      <div className="space-y-6 max-w-3xl">
        <div><h1 className="font-heading text-2xl font-bold flex items-center gap-2"><Shield className="h-6 w-6 text-primary" />Risk Profile</h1><p className="text-sm text-muted-foreground mt-1">Your account's risk score and contributing factors</p></div>
        <Card>
          <CardHeader><div className="flex items-center justify-between"><div><CardTitle>Current Risk Level</CardTitle><CardDescription>Last calculated: {risk?.last_calculated_at ? new Date(risk.last_calculated_at).toLocaleString() : 'Never'}</CardDescription></div><Icon className={`h-10 w-10 ${iconColor}`} /></div></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">Score</span><span className="text-2xl font-bold">{score}/100</span></div>
            <Progress value={score} className="h-3" />
            <Badge variant={levelColor as any} className="capitalize">{level} risk</Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Contributing Factors</CardTitle><CardDescription>What's driving your current score</CardDescription></CardHeader>
          <CardContent>
            {factors.length === 0 ? <p className="text-sm text-muted-foreground py-4">No risk factors recorded. Your account is in good standing.</p> : (
              <div className="space-y-2">{factors.map((f: any, i: number) => <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-border"><span className="text-sm">{f.label || f.name}</span><Badge variant="outline">{f.weight || f.impact}</Badge></div>)}</div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
