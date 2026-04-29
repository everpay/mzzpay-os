import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Activity, TrendingUp, Zap, AlertTriangle } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { format } from "date-fns";

interface RealtimeEvent {
  id: string;
  type: string;
  amount?: number;
  currency?: string;
  status?: string;
  provider?: string;
  timestamp: string;
}

export default function LiveAnalytics() {
  const [events, setEvents] = useState<RealtimeEvent[]>([]);
  const [tps, setTps] = useState(0);
  const [volumeData, setVolumeData] = useState<{ time: string; count: number; volume: number }[]>([]);

  useEffect(() => {
    // Subscribe to realtime transaction changes
    const channel = supabase
      .channel('live-transactions')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'transactions' },
        (payload) => {
          const record = payload.new as any;
          if (!record) return;

          const event: RealtimeEvent = {
            id: record.id,
            type: payload.eventType === 'INSERT' ? 'new_payment' : 'status_update',
            amount: record.amount,
            currency: record.currency,
            status: record.status,
            provider: record.provider,
            timestamp: new Date().toISOString(),
          };

          setEvents(prev => [event, ...prev].slice(0, 50));

          // Update volume data
          const minute = format(new Date(), 'HH:mm');
          setVolumeData(prev => {
            const existing = prev.find(d => d.time === minute);
            if (existing) {
              return prev.map(d => d.time === minute
                ? { ...d, count: d.count + 1, volume: d.volume + (record.amount || 0) }
                : d
              );
            }
            return [...prev, { time: minute, count: 1, volume: record.amount || 0 }].slice(-30);
          });
        }
      )
      .subscribe();

    // Subscribe to disputes
    const disputeChannel = supabase
      .channel('live-disputes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'disputes' },
        (payload) => {
          const record = payload.new as any;
          setEvents(prev => [{
            id: record.id,
            type: 'dispute',
            amount: record.amount,
            currency: record.currency,
            status: record.status,
            timestamp: new Date().toISOString(),
          }, ...prev].slice(0, 50));
        }
      )
      .subscribe();

    // TPS counter
    const tpsInterval = setInterval(() => {
      const oneSecAgo = Date.now() - 1000;
      setEvents(prev => {
        const recent = prev.filter(e => new Date(e.timestamp).getTime() > oneSecAgo);
        setTps(recent.length);
        return prev;
      });
    }, 1000);

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(disputeChannel);
      clearInterval(tpsInterval);
    };
  }, []);

  const totalVolume = events.reduce((sum, e) => sum + (e.amount || 0), 0);
  const failedCount = events.filter(e => e.status === 'failed').length;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Activity className="h-6 w-6 text-primary" />
            Live Analytics
          </h1>
          <p className="text-sm text-muted-foreground">Real-time transaction monitoring and event stream</p>
        </div>

        {/* Live KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10"><Zap className="h-5 w-5 text-primary" /></div>
                <div>
                  <p className="text-xs text-muted-foreground">TPS (live)</p>
                  <p className="text-2xl font-bold text-foreground">{tps}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10"><TrendingUp className="h-5 w-5 text-primary" /></div>
                <div>
                  <p className="text-xs text-muted-foreground">Events (session)</p>
                  <p className="text-2xl font-bold text-foreground">{events.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-accent/10"><Activity className="h-5 w-5 text-accent-foreground" /></div>
                <div>
                  <p className="text-xs text-muted-foreground">Volume (session)</p>
                  <p className="text-2xl font-bold text-foreground">${totalVolume.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-destructive/10"><AlertTriangle className="h-5 w-5 text-destructive" /></div>
                <div>
                  <p className="text-xs text-muted-foreground">Failures</p>
                  <p className="text-2xl font-bold text-foreground">{failedCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Live Volume Chart */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Live Transaction Volume (per minute)</CardTitle></CardHeader>
          <CardContent>
            {volumeData.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
                Waiting for live transactions…
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={volumeData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="time" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                  <Area type="monotone" dataKey="count" stroke="hsl(var(--primary))" fill="hsl(var(--primary)/0.15)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Event Stream */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              Event Stream
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {events.length === 0 ? (
                <p className="text-sm text-muted-foreground">No events yet. Transactions will appear here in real-time.</p>
              ) : events.map(event => (
                <div key={event.id + event.timestamp} className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30">
                  <div className="flex items-center gap-3">
                    <Badge variant={
                      event.type === 'dispute' ? 'destructive' :
                      event.status === 'failed' ? 'destructive' :
                      event.status === 'completed' ? 'default' : 'secondary'
                    } className="text-xs">
                      {event.type === 'dispute' ? 'DISPUTE' : event.status?.toUpperCase() || 'EVENT'}
                    </Badge>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {event.amount ? `$${event.amount.toLocaleString()}` : 'N/A'} {event.currency || ''}
                      </p>
                      <p className="text-xs text-muted-foreground">{event.provider || event.type}</p>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground font-mono">
                    {format(new Date(event.timestamp), "HH:mm:ss")}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
