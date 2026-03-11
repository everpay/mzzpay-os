import { useCardVelocity } from '@/hooks/useRollingReserves';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Gauge, AlertTriangle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

const MAX_VELOCITY = 3;

export function CardVelocityCard() {
  const { data: velocity = [], isLoading } = useCardVelocity();

  const today = new Date().toISOString().split('T')[0];
  const todayRecords = velocity.filter(v => v.transaction_date === today);
  const atLimit = todayRecords.filter(v => v.transaction_count >= MAX_VELOCITY);

  return (
    <Card className="border-border bg-card shadow-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Gauge className="h-4 w-4 text-blue-500" />
          Card Velocity (3/day/customer)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : velocity.length === 0 ? (
          <p className="text-sm text-muted-foreground">No velocity data yet.</p>
        ) : (
          <>
            {/* Today's summary */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">Today's Active Customers</p>
                <p className="text-2xl font-bold">{todayRecords.length}</p>
              </div>
              {atLimit.length > 0 && (
                <Badge variant="destructive" className="gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {atLimit.length} at limit
                </Badge>
              )}
            </div>

            {/* Customer velocity list */}
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {todayRecords.map(v => {
                const percent = (v.transaction_count / MAX_VELOCITY) * 100;
                const isAtLimit = v.transaction_count >= MAX_VELOCITY;
                return (
                  <div key={v.id} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono text-muted-foreground truncate max-w-[150px]">
                        {v.customer_identifier}
                      </span>
                      <span className={`font-medium ${isAtLimit ? 'text-destructive' : 'text-foreground'}`}>
                        {v.transaction_count}/{MAX_VELOCITY}
                      </span>
                    </div>
                    <Progress 
                      value={Math.min(percent, 100)} 
                      className={`h-1.5 ${isAtLimit ? '[&>div]:bg-destructive' : ''}`} 
                    />
                  </div>
                );
              })}
            </div>

            {/* Historical data */}
            {velocity.length > todayRecords.length && (
              <div className="pt-2 border-t border-border">
                <p className="text-xs text-muted-foreground">
                  {velocity.length} total velocity records tracked
                </p>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
