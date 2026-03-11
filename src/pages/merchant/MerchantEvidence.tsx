import { AppLayout } from '@/components/AppLayout';
import { FileText, Shield } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useDisputes } from '@/hooks/useDisputes';
import { formatDate } from '@/lib/format';

export default function MerchantEvidence() {
  const { data: disputes = [], isLoading } = useDisputes();

  // Show disputes that have chargeflow evidence (chargeflow_payload is non-empty)
  const withEvidence = disputes.filter(d => d.chargeflow_payload && Object.keys(d.chargeflow_payload).length > 0);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">Evidence Library</h1>
          <p className="text-sm text-muted-foreground mt-1">Evidence collected by Chargeflow for your disputes</p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center p-12">
            <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Dispute Evidence ({withEvidence.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {withEvidence.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Shield className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">No evidence collected yet. Evidence is automatically gathered by Chargeflow.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {withEvidence.map((d) => (
                    <div key={d.id} className="flex items-center gap-3 p-3 rounded-md bg-muted/50 hover:bg-muted transition-colors">
                      <div className="p-2 rounded bg-card">
                        <FileText className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">{d.reason || 'Dispute evidence'}</p>
                        <p className="text-xs text-muted-foreground">
                          {d.customer_email || 'Unknown customer'} · {formatDate(d.created_at)}
                        </p>
                      </div>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">
                        {d.status.replace(/_/g, ' ').toUpperCase()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
