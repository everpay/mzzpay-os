import { useProviderEvents } from '@/hooks/useProviderEvents';
import { Badge } from '@/components/ui/badge';
import { formatRelativeTime } from '@/lib/format';
import { Zap } from 'lucide-react';

export function ActivityFeed({ limit = 5 }: { limit?: number }) {
  const { data: allEvents = [], isLoading } = useProviderEvents();
  const events = allEvents.slice(0, limit);

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-card animate-fade-in">
      <div className="mb-4 flex items-center gap-2">
        <Zap className="h-4 w-4 text-primary" />
        <h3 className="font-heading text-sm font-semibold text-foreground">Activity Feed</h3>
      </div>
      {isLoading ? (
        <div className="flex items-center justify-center p-6">
          <p className="text-sm text-muted-foreground">Loading events...</p>
        </div>
      ) : events.length === 0 ? (
        <div className="flex items-center justify-center p-6">
          <p className="text-sm text-muted-foreground">No recent events</p>
        </div>
      ) : (
        <div className="space-y-3">
          {events.map((event) => (
          <div key={event.id} className="flex items-start gap-3 rounded-lg p-2 transition-colors hover:bg-muted/30">
            <div className="mt-0.5 h-2 w-2 rounded-full bg-primary animate-pulse-glow flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <Badge variant="provider" className="text-[10px]">{event.provider}</Badge>
                <span className="text-xs font-medium text-foreground">{event.event_type}</span>
              </div>
              <div className="mt-1 flex items-center gap-2">
                {event.transaction_id && (
                  <span className="font-mono text-[10px] text-muted-foreground">{event.transaction_id}</span>
                )}
                <span className="text-[10px] text-muted-foreground">{formatRelativeTime(event.created_at)}</span>
              </div>
            </div>
          </div>
          ))}
        </div>
      )}
    </div>
  );
}
