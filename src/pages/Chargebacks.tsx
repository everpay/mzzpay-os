import { AppLayout } from '@/components/AppLayout';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency, formatDate } from '@/lib/format';
import { Shield, AlertTriangle, CheckCircle2, XCircle, TrendingUp, DollarSign } from 'lucide-react';
import { useDisputes, useDisputeStats } from '@/hooks/useDisputes';
import { DisputeStatCard } from '@/components/dispute/DisputeStatCard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function Chargebacks() {
  const { data: disputes = [], isLoading } = useDisputes();
  const stats = useDisputeStats(disputes);

  const open = disputes.filter(d => !['won', 'lost'].includes(d.status));
  const resolved = disputes.filter(d => ['won', 'lost'].includes(d.status));

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
      case 'evidence_submitted': return <Shield className="h-5 w-5 text-primary" />;
      default: return <Shield className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const renderDisputeList = (items: typeof disputes) => (
    items.length === 0 ? (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <div className="p-4 rounded-full bg-muted mb-4">
            <Shield className="h-10 w-10 text-muted-foreground" />
          </div>
          <h3 className="font-heading font-semibold text-lg mb-2">No Disputes</h3>
          <p className="text-muted-foreground text-center max-w-sm">
            Disputes are automatically synced from Chargeflow.
          </p>
        </CardContent>
      </Card>
    ) : (
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="divide-y divide-border">
          {items.map((dispute) => (
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
                    {dispute.customer_email && ` · ${dispute.customer_email}`}
                  </p>
                  {dispute.chargeflow_id && (
                    <p className="text-xs text-muted-foreground mt-0.5 font-mono">
                      CF: {dispute.chargeflow_id}
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
    )
  );

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Shield className="h-6 w-6" />
            Chargebacks
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Disputes automatically synced via Chargeflow
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <DisputeStatCard
            title="Open Disputes"
            value={stats.openCount}
            icon={AlertTriangle}
            variant="warning"
          />
          <DisputeStatCard
            title="Win Rate"
            value={`${stats.winRate}%`}
            icon={TrendingUp}
            variant="success"
          />
          <DisputeStatCard
            title="Total Disputed"
            value={formatCurrency(stats.totalAmount, 'USD')}
            icon={Shield}
            variant="default"
          />
          <DisputeStatCard
            title="Recovered"
            value={formatCurrency(stats.recoveredAmount, 'USD')}
            subtitle={`of ${formatCurrency(stats.totalAmount, 'USD')} disputed`}
            icon={DollarSign}
            variant="success"
          />
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center p-12 rounded-xl border border-border bg-card">
            <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <Tabs defaultValue="open">
            <TabsList>
              <TabsTrigger value="open">Open ({open.length})</TabsTrigger>
              <TabsTrigger value="resolved">Resolved ({resolved.length})</TabsTrigger>
              <TabsTrigger value="all">All ({disputes.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="open" className="mt-4">{renderDisputeList(open)}</TabsContent>
            <TabsContent value="resolved" className="mt-4">{renderDisputeList(resolved)}</TabsContent>
            <TabsContent value="all" className="mt-4">{renderDisputeList(disputes)}</TabsContent>
          </Tabs>
        )}

        <div className="rounded-xl border border-border bg-card/50 p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-lg bg-primary/10">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-heading font-semibold text-foreground mb-1">Powered by Chargeflow</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Chargeflow automatically fights chargebacks using AI-generated evidence and representment.
                Disputes are synced in real-time via webhooks.
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
      </div>
    </AppLayout>
  );
}
