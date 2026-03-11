import { AppLayout } from '@/components/AppLayout';
import { useDisputes } from '@/hooks/useDisputes';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Shield, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency, formatDate } from '@/lib/format';

export default function MerchantDisputes() {
  const { data: disputes = [], isLoading } = useDisputes();

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
      default: return <Shield className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const renderList = (items: typeof disputes) => (
    items.length === 0 ? (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Shield className="h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">No disputes found</p>
        </CardContent>
      </Card>
    ) : (
      <div className="rounded-lg border border-border bg-card overflow-hidden divide-y divide-border">
        {items.map((d) => (
          <div key={d.id} className="p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted">{getStatusIcon(d.status)}</div>
              <div>
                <p className="text-sm font-medium text-foreground">{formatCurrency(d.amount, d.currency as any)}</p>
                <p className="text-xs text-muted-foreground">{d.reason || 'No reason'} {d.provider && `· ${d.provider}`}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {getStatusBadge(d.status)}
              <span className="text-xs text-muted-foreground">{formatDate(d.created_at)}</span>
            </div>
          </div>
        ))}
      </div>
    )
  );

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">Disputes</h1>
          <p className="text-sm text-muted-foreground mt-1">Track your chargeback disputes — auto-synced via Chargeflow</p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center p-12"><div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
        ) : (
          <Tabs defaultValue="open">
            <TabsList>
              <TabsTrigger value="open">Open ({open.length})</TabsTrigger>
              <TabsTrigger value="resolved">Resolved ({resolved.length})</TabsTrigger>
              <TabsTrigger value="all">All ({disputes.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="open" className="mt-4">{renderList(open)}</TabsContent>
            <TabsContent value="resolved" className="mt-4">{renderList(resolved)}</TabsContent>
            <TabsContent value="all" className="mt-4">{renderList(disputes)}</TabsContent>
          </Tabs>
        )}
      </div>
    </AppLayout>
  );
}
