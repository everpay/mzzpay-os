import { AppLayout } from '@/components/AppLayout';
import { FileText, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { mockEvidence } from '@/lib/dispute-mock-data';

export default function MerchantEvidence() {
  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">Evidence Library</h1>
            <p className="text-sm text-muted-foreground mt-1">Manage evidence files for your disputes</p>
          </div>
          <Button className="gap-2">
            <Upload className="w-4 h-4" />
            Upload Evidence
          </Button>
        </div>

        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Recent Evidence ({mockEvidence.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {mockEvidence.map((ev) => (
                <div key={ev.id} className="flex items-center gap-3 p-3 rounded-md bg-muted/50 hover:bg-muted transition-colors">
                  <div className="p-2 rounded bg-card">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground capitalize">{ev.evidence_type.replace(/_/g, ' ')}</p>
                    <p className="text-xs text-muted-foreground">Chargeback {ev.chargeback_id.slice(-8)}</p>
                  </div>
                  {ev.file_url ? (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">PDF</span>
                  ) : (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-medium">DATA</span>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}