import { useState } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency, formatDate } from '@/lib/format';
import { Shield, AlertTriangle, Clock, CheckCircle2, XCircle, RefreshCw, ExternalLink } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Dispute {
  id: string;
  chargeflow_id: string | null;
  amount: number;
  currency: string;
  status: string;
  reason: string | null;
  evidence_due_date: string | null;
  provider: string | null;
  customer_email: string | null;
  description: string | null;
  outcome: string | null;
  created_at: string;
}

export default function Chargebacks() {
  const queryClient = useQueryClient();

  const { data: disputes = [], isLoading } = useQuery({
    queryKey: ['disputes'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: merchant } = await supabase
        .from('merchants')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!merchant) throw new Error('Merchant not found');

      const { data, error } = await supabase
        .from('disputes')
        .select('*')
        .eq('merchant_id', merchant.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Dispute[];
    },
  });

  const syncDisputes = useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/chargeflow?action=sync-disputes`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({}),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to sync disputes');
      }

      return response.json();
    },
    onSuccess: (data) => {
      toast.success(`Synced ${data.synced || 0} disputes from Chargeflow`);
      queryClient.invalidateQueries({ queryKey: ['disputes'] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to sync');
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'won': return <Badge className="bg-success/10 text-success border-success/20">Won</Badge>;
      case 'lost': return <Badge variant="destructive">Lost</Badge>;
      case 'open': return <Badge className="bg-warning/10 text-warning border-warning/20">Open</Badge>;
      case 'evidence_submitted': return <Badge className="bg-primary/10 text-primary border-primary/20">Evidence Submitted</Badge>;
      case 'under_review': return <Badge className="bg-chart-3/10 text-chart-3 border-chart-3/20">Under Review</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'won': return <CheckCircle2 className="h-5 w-5 text-success" />;
      case 'lost': return <XCircle className="h-5 w-5 text-destructive" />;
      case 'open': return <AlertTriangle className="h-5 w-5 text-warning" />;
      case 'evidence_submitted': return <Clock className="h-5 w-5 text-primary" />;
      default: return <Shield className="h-5 w-5 text-muted-foreground" />;
    }
  };

  // Summary stats
  const openCount = disputes.filter(d => d.status === 'open').length;
  const wonCount = disputes.filter(d => d.status === 'won').length;
  const lostCount = disputes.filter(d => d.status === 'lost').length;
  const totalAmount = disputes.reduce((sum, d) => sum + d.amount, 0);
  const winRate = disputes.length > 0 ? ((wonCount / disputes.length) * 100).toFixed(1) : '0';

  return (
    <AppLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Shield className="h-6 w-6" />
            Chargebacks
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage disputes and chargebacks powered by Chargeflow
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => syncDisputes.mutate()}
            disabled={syncDisputes.isPending}
          >
            <RefreshCw className={`h-4 w-4 ${syncDisputes.isPending ? 'animate-spin' : ''}`} />
            Sync Disputes
          </Button>
          <Button variant="outline" className="gap-2" asChild>
            <a href="https://app.chargeflow.io" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4" />
              Chargeflow Dashboard
            </a>
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Open Disputes</p>
                <p className="text-2xl font-heading font-bold text-warning">{openCount}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-warning/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Won</p>
                <p className="text-2xl font-heading font-bold text-success">{wonCount}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-success/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Lost</p>
                <p className="text-2xl font-heading font-bold text-destructive">{lostCount}</p>
              </div>
              <XCircle className="h-8 w-8 text-destructive/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Win Rate</p>
                <p className="text-2xl font-heading font-bold">{winRate}%</p>
              </div>
              <Shield className="h-8 w-8 text-primary/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Disputes List */}
      {isLoading ? (
        <div className="flex items-center justify-center p-12 rounded-xl border border-border bg-card">
          <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : disputes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="p-4 rounded-full bg-muted mb-4">
              <Shield className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="font-heading font-semibold text-lg mb-2">No Disputes</h3>
            <p className="text-muted-foreground text-center max-w-sm mb-4">
              No chargebacks or disputes found. Connect your Chargeflow account to automatically manage disputes.
            </p>
            <Button variant="outline" className="gap-2" onClick={() => syncDisputes.mutate()}>
              <RefreshCw className="h-4 w-4" />
              Sync from Chargeflow
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h2 className="font-heading font-semibold">Disputes ({disputes.length})</h2>
            <p className="text-sm text-muted-foreground">
              Total disputed: {formatCurrency(totalAmount, 'USD')}
            </p>
          </div>
          <div className="divide-y divide-border">
            {disputes.map((dispute) => (
              <div key={dispute.id} className="p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="p-2 rounded-lg bg-muted">
                    {getStatusIcon(dispute.status)}
                  </div>
                  <div>
                    <p className="font-medium text-foreground">
                      {formatCurrency(dispute.amount, dispute.currency as any)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {dispute.reason || 'No reason specified'} 
                      {dispute.customer_email && ` • ${dispute.customer_email}`}
                    </p>
                    {dispute.chargeflow_id && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Chargeflow ID: {dispute.chargeflow_id}
                      </p>
                    )}
                  </div>
                </div>
                <div className="text-right flex items-center gap-4">
                  {getStatusBadge(dispute.status)}
                  <div>
                    <p className="text-xs text-muted-foreground">{formatDate(dispute.created_at)}</p>
                    {dispute.evidence_due_date && (
                      <p className="text-xs text-warning">
                        Due: {formatDate(dispute.evidence_due_date)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Chargeflow Info */}
      <div className="mt-8 rounded-xl border border-border bg-card/50 p-6">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-lg bg-primary/10">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="font-heading font-semibold text-foreground mb-1">Powered by Chargeflow</h3>
            <p className="text-sm text-muted-foreground mb-3">
              Chargeflow automatically fights chargebacks using AI-generated evidence and representment. 
              Connect your Chargeflow account to sync disputes and manage them from this dashboard.
            </p>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">AI Evidence Generation</Badge>
              <Badge variant="outline">Automated Representment</Badge>
              <Badge variant="outline">Real-time Webhooks</Badge>
              <Badge variant="outline">85%+ Win Rate</Badge>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
