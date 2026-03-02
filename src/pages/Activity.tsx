import { AppLayout } from '@/components/AppLayout';
import { mockEvents } from '@/lib/mock-data';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/format';
import { Zap } from 'lucide-react';

export default function Activity() {
  return (
    <AppLayout>
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">Activity</h1>
        <p className="mt-1 text-sm text-muted-foreground">Provider webhook events and system activity</p>
      </div>

      <div className="rounded-xl border border-border bg-card shadow-card">
        <div className="divide-y divide-border">
          {mockEvents.map((event) => (
            <div key={event.id} className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-muted/30">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 flex-shrink-0">
                <Zap className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">{event.event_type}</span>
                  <Badge variant="provider" className="text-[10px]">{event.provider}</Badge>
                </div>
                <div className="mt-0.5 flex items-center gap-2">
                  {event.transaction_id && (
                    <span className="font-mono text-xs text-muted-foreground">{event.transaction_id}</span>
                  )}
                </div>
              </div>
              <span className="text-xs text-muted-foreground flex-shrink-0">{formatDate(event.created_at)}</span>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
