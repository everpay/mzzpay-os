import { useRollingReserves } from '@/hooks/useRollingReserves';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatDate } from '@/lib/format';
import { Shield, Clock, CheckCircle2 } from 'lucide-react';

export function RollingReserveCard() {
  const { data: reserves = [], isLoading } = useRollingReserves();

  const heldReserves = reserves.filter(r => r.status === 'held');
  const releasedReserves = reserves.filter(r => r.status === 'released');

  const totalHeld = heldReserves.reduce((sum, r) => sum + Number(r.amount), 0);
  const totalReleased = releasedReserves.reduce((sum, r) => sum + Number(r.amount), 0);

  // Group by currency
  const heldByCurrency = heldReserves.reduce((acc, r) => {
    acc[r.currency] = (acc[r.currency] || 0) + Number(r.amount);
    return acc;
  }, {} as Record<string, number>);

  return (
    <Card className="border-border bg-card shadow-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Shield className="h-4 w-4 text-amber-500" />
          Rolling Reserve (10%)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : reserves.length === 0 ? (
          <p className="text-sm text-muted-foreground">No reserves yet. Reserves are created on successful payments.</p>
        ) : (
          <>
            {/* Summary */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-amber-500/10 p-3">
                <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                  <Clock className="h-3 w-3" />
                  Held
                </div>
                <p className="mt-1 text-lg font-bold text-foreground">
                  ${totalHeld.toFixed(2)}
                </p>
                <p className="text-xs text-muted-foreground">{heldReserves.length} reserves</p>
              </div>
              <div className="rounded-lg bg-emerald-500/10 p-3">
                <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-3 w-3" />
                  Released
                </div>
                <p className="mt-1 text-lg font-bold text-foreground">
                  ${totalReleased.toFixed(2)}
                </p>
                <p className="text-xs text-muted-foreground">{releasedReserves.length} reserves</p>
              </div>
            </div>

            {/* By currency */}
            {Object.keys(heldByCurrency).length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase">Held by Currency</p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(heldByCurrency).map(([curr, amt]) => (
                    <Badge key={curr} variant="outline" className="text-xs gap-1">
                      {curr}: {formatCurrency(amt, curr)}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Recent reserves */}
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase">Recent Reserves</p>
              <div className="max-h-40 overflow-y-auto space-y-1">
                {reserves.slice(0, 10).map(r => (
                  <div key={r.id} className="flex items-center justify-between text-xs py-1 border-b border-border last:border-0">
                    <div className="flex items-center gap-2">
                      <Badge variant={r.status === 'held' ? 'secondary' : 'default'} className="text-[10px]">
                        {r.status}
                      </Badge>
                      <span className="font-mono text-muted-foreground">{r.transaction_id.slice(0, 8)}…</span>
                    </div>
                    <div className="text-right">
                      <span className="font-medium">{formatCurrency(r.amount, r.currency)}</span>
                      <span className="ml-2 text-muted-foreground">
                        release: {new Date(r.release_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
