import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { formatCurrency, formatDate } from '@/lib/format';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ShieldCheck, Gauge, Clock, DollarSign, AlertTriangle, Users, TrendingUp } from 'lucide-react';

function useAdminRollingReserves() {
  return useQuery({
    queryKey: ['admin-rolling-reserves'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rolling_reserves')
        .select('*, merchants(name)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });
}

function useAdminCardVelocity() {
  return useQuery({
    queryKey: ['admin-card-velocity'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('card_velocity')
        .select('*, merchants(name)')
        .order('transaction_date', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data || [];
    },
  });
}

function useAdminMerchants() {
  return useQuery({
    queryKey: ['admin-merchants'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('merchants')
        .select('id, name, created_at, business_currency')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });
}

const MAX_VELOCITY = 3;

export default function AdminDashboard() {
  const { data: reserves = [], isLoading: loadingReserves } = useAdminRollingReserves();
  const { data: velocity = [], isLoading: loadingVelocity } = useAdminCardVelocity();
  const { data: merchants = [] } = useAdminMerchants();

  const heldReserves = reserves.filter((r: any) => r.status === 'held');
  const releasedReserves = reserves.filter((r: any) => r.status === 'released');
  const totalHeld = heldReserves.reduce((s: number, r: any) => s + Number(r.amount), 0);
  const totalReleased = releasedReserves.reduce((s: number, r: any) => s + Number(r.amount), 0);

  const today = new Date().toISOString().split('T')[0];
  const todayVelocity = velocity.filter((v: any) => v.transaction_date === today);
  const atLimit = todayVelocity.filter((v: any) => v.transaction_count >= MAX_VELOCITY);

  // Upcoming releases (next 30 days)
  const in30Days = new Date();
  in30Days.setDate(in30Days.getDate() + 30);
  const upcomingReleases = heldReserves.filter((r: any) => new Date(r.release_at) <= in30Days);
  const upcomingAmount = upcomingReleases.reduce((s: number, r: any) => s + Number(r.amount), 0);

  return (
    <AppLayout>
      <div className="mb-8">
        <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">
          Admin Dashboard
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Platform-wide rolling reserves, velocity controls, and release schedules
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <Card className="border-border bg-card shadow-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-amber-500/10 p-2.5">
                <DollarSign className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Held</p>
                <p className="text-xl font-bold text-foreground">{formatCurrency(totalHeld, 'USD')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card shadow-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-emerald-500/10 p-2.5">
                <TrendingUp className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Released</p>
                <p className="text-xl font-bold text-foreground">{formatCurrency(totalReleased, 'USD')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card shadow-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-500/10 p-2.5">
                <Clock className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Releasing (30d)</p>
                <p className="text-xl font-bold text-foreground">{formatCurrency(upcomingAmount, 'USD')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card shadow-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-destructive/10 p-2.5">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Velocity Alerts</p>
                <p className="text-xl font-bold text-foreground">{atLimit.length}</p>
                <p className="text-xs text-muted-foreground">at limit today</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="reserves" className="space-y-4">
        <TabsList>
          <TabsTrigger value="reserves">Rolling Reserves</TabsTrigger>
          <TabsTrigger value="schedule">Release Schedule</TabsTrigger>
          <TabsTrigger value="velocity">Card Velocity</TabsTrigger>
        </TabsList>

        {/* Rolling Reserves Tab */}
        <TabsContent value="reserves">
          <Card className="border-border bg-card shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ShieldCheck className="h-4 w-4 text-amber-500" />
                All Rolling Reserves
              </CardTitle>
              <CardDescription>{reserves.length} total reserve entries across {merchants.length} merchants</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingReserves ? (
                <p className="text-sm text-muted-foreground py-4">Loading...</p>
              ) : reserves.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4">No rolling reserves yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Merchant</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Reserve %</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Held At</TableHead>
                        <TableHead>Release At</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reserves.slice(0, 50).map((r: any) => (
                        <TableRow key={r.id}>
                          <TableCell className="font-medium text-foreground">
                            {r.merchants?.name || r.merchant_id.slice(0, 8)}
                          </TableCell>
                          <TableCell>{formatCurrency(r.amount, r.currency)}</TableCell>
                          <TableCell>{r.reserve_percent}%</TableCell>
                          <TableCell>
                            <Badge variant={r.status === 'held' ? 'secondary' : 'outline'}>
                              {r.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-xs">{formatDate(r.held_at)}</TableCell>
                          <TableCell className="text-muted-foreground text-xs">{formatDate(r.release_at)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Release Schedule Tab */}
        <TabsContent value="schedule">
          <Card className="border-border bg-card shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Clock className="h-4 w-4 text-blue-500" />
                Upcoming Reserve Releases
              </CardTitle>
              <CardDescription>Reserves scheduled for release in the next 180 days</CardDescription>
            </CardHeader>
            <CardContent>
              {heldReserves.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4">No pending releases.</p>
              ) : (
                <div className="space-y-3">
                  {(() => {
                    // Group by month
                    const byMonth: Record<string, { amount: number; count: number; items: any[] }> = {};
                    heldReserves.forEach((r: any) => {
                      const month = new Date(r.release_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
                      if (!byMonth[month]) byMonth[month] = { amount: 0, count: 0, items: [] };
                      byMonth[month].amount += Number(r.amount);
                      byMonth[month].count += 1;
                      byMonth[month].items.push(r);
                    });
                    return Object.entries(byMonth).map(([month, data]) => (
                      <div key={month} className="rounded-lg border border-border p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-foreground">{month}</span>
                          <div className="text-right">
                            <span className="text-sm font-bold text-foreground">{formatCurrency(data.amount, 'USD')}</span>
                            <span className="text-xs text-muted-foreground ml-2">({data.count} reserves)</span>
                          </div>
                        </div>
                        <div className="space-y-1">
                          {data.items.slice(0, 5).map((r: any) => (
                            <div key={r.id} className="flex items-center justify-between text-xs text-muted-foreground">
                              <span>{r.merchants?.name || 'Unknown'}</span>
                              <span>{formatCurrency(r.amount, r.currency)} — {new Date(r.release_at).toLocaleDateString()}</span>
                            </div>
                          ))}
                          {data.items.length > 5 && (
                            <p className="text-xs text-muted-foreground">+{data.items.length - 5} more</p>
                          )}
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Card Velocity Tab */}
        <TabsContent value="velocity">
          <Card className="border-border bg-card shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Gauge className="h-4 w-4 text-blue-500" />
                Card Velocity Monitor (3/day/customer)
              </CardTitle>
              <CardDescription>Today's activity across all merchants</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingVelocity ? (
                <p className="text-sm text-muted-foreground py-4">Loading...</p>
              ) : todayVelocity.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4">No velocity records today.</p>
              ) : (
                <div className="space-y-3">
                  {todayVelocity.map((v: any) => {
                    const pct = Math.min((v.transaction_count / MAX_VELOCITY) * 100, 100);
                    const isAtLimit = v.transaction_count >= MAX_VELOCITY;
                    return (
                      <div key={v.id} className="rounded-lg border border-border p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-foreground">{v.merchants?.name || 'Unknown'}</p>
                            <p className="text-xs text-muted-foreground font-mono">{v.customer_identifier}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-bold ${isAtLimit ? 'text-destructive' : 'text-foreground'}`}>
                              {v.transaction_count}/{MAX_VELOCITY}
                            </span>
                            {isAtLimit && (
                              <Badge variant="destructive" className="text-xs gap-1">
                                <AlertTriangle className="h-3 w-3" /> Blocked
                              </Badge>
                            )}
                          </div>
                        </div>
                        <Progress value={pct} className={`h-1.5 ${isAtLimit ? '[&>div]:bg-destructive' : ''}`} />
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>Provider: {v.provider}</span>
                          <span>Card: ****{v.card_last4 || '????'}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Historical summary */}
              {velocity.length > todayVelocity.length && (
                <div className="mt-4 pt-4 border-t border-border">
                  <h4 className="text-sm font-medium text-foreground mb-2">Recent History</h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Merchant</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Count</TableHead>
                        <TableHead>Provider</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {velocity.filter((v: any) => v.transaction_date !== today).slice(0, 20).map((v: any) => (
                        <TableRow key={v.id}>
                          <TableCell className="text-xs">{v.transaction_date}</TableCell>
                          <TableCell className="text-xs">{v.merchants?.name || 'Unknown'}</TableCell>
                          <TableCell className="text-xs font-mono">{v.customer_identifier}</TableCell>
                          <TableCell>
                            <span className={v.transaction_count >= MAX_VELOCITY ? 'text-destructive font-bold' : ''}>
                              {v.transaction_count}/{MAX_VELOCITY}
                            </span>
                          </TableCell>
                          <TableCell className="text-xs">{v.provider}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
}
