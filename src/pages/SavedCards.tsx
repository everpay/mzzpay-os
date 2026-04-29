import { useState } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { CreditCard, Trash2, Search, Loader2, Shield, RefreshCw, Ban, History, CheckCircle2, AlertTriangle, XCircle, RotateCcw } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
// Local token revocation: marks the saved payment_method as revoked. The
// platform-level VGS detokenize/revoke endpoint is not yet wired in this
// project, so we update status in-place and write an audit row instead.
async function revokeToken(id: string, _merchantId: string, reason: string) {
  const { error } = await supabase
    .from('payment_methods')
    .update({ status: 'revoked', updated_at: new Date().toISOString() } as any)
    .eq('id', id);
  if (error) throw error;
  await supabase.from('audit_logs').insert({
    action: 'token_revoked',
    entity_type: 'payment_methods',
    entity_id: id,
    metadata: { reason },
  } as any);
}
import { formatDistanceToNow } from 'date-fns';

const STATUS_BADGE: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ElementType }> = {
  active: { label: 'Active', variant: 'default', icon: CheckCircle2 },
  inactive: { label: 'Inactive', variant: 'secondary', icon: XCircle },
  expired: { label: 'Expired', variant: 'outline', icon: AlertTriangle },
  revoked: { label: 'Revoked', variant: 'destructive', icon: Ban },
  rotated: { label: 'Rotated', variant: 'secondary', icon: RotateCcw },
};

export default function SavedCards() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<any>(null);
  const [eventsToken, setEventsToken] = useState<string | null>(null);

  const { data: cards, isLoading } = useQuery({
    queryKey: ['saved-cards'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const { data: merchant } = await supabase.from('merchants').select('id').eq('user_id', user.id).single();
      if (!merchant) throw new Error('No merchant');

      const { data, error } = await supabase
        .from('payment_methods')
        .select('id, card_brand, card_last4, exp_month, exp_year, is_default, network_token_status, card_updater_enabled, created_at, customer_id, status, usage_count, last_used_at, merchant_id')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: events, isLoading: eventsLoading } = useQuery({
    queryKey: ['token-events', eventsToken],
    enabled: !!eventsToken,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('token_events' as any)
        .select('*')
        .eq('token_id', eventsToken)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
  });

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from('payment_methods').delete().eq('id', id);
      if (error) throw error;
      toast.success('Card removed');
      queryClient.invalidateQueries({ queryKey: ['saved-cards'] });
    } catch {
      toast.error('Failed to delete card');
    }
    setDeleteTarget(null);
  };

  const handleRevoke = async () => {
    if (!revokeTarget) return;
    try {
      await revokeToken(revokeTarget.id, revokeTarget.merchant_id, 'merchant_revocation');
      toast.success('Token revoked');
      queryClient.invalidateQueries({ queryKey: ['saved-cards'] });
    } catch {
      toast.error('Failed to revoke token');
    }
    setRevokeTarget(null);
  };

  const filtered = cards?.filter((c: any) =>
    !search ||
    (c.card_last4 || '').includes(search) ||
    (c.card_brand || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.customer_id || '').toLowerCase().includes(search.toLowerCase())
  );

  const brandColor = (brand: string) => {
    switch (brand?.toLowerCase()) {
      case 'visa': return 'bg-blue-500/10 text-blue-600';
      case 'mastercard': return 'bg-orange-500/10 text-orange-600';
      case 'amex': return 'bg-indigo-500/10 text-indigo-600';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const stats = {
    total: cards?.length || 0,
    active: cards?.filter((c: any) => c.status === 'active').length || 0,
    networkTokens: cards?.filter((c: any) => c.network_token_status === 'active').length || 0,
    autoUpdate: cards?.filter((c: any) => c.card_updater_enabled).length || 0,
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Saved Cards</h1>
          <p className="text-sm text-muted-foreground mt-1">View and manage tokenized card-on-file records for subscriptions and recurring payments</p>
        </div>

        {/* Stats */}
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          <Card><CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-1"><CreditCard className="h-4 w-4 text-primary" /><p className="text-sm text-muted-foreground">Total Cards</p></div>
            <p className="text-2xl font-bold">{stats.total}</p>
          </CardContent></Card>
          <Card><CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-1"><CheckCircle2 className="h-4 w-4 text-primary" /><p className="text-sm text-muted-foreground">Active</p></div>
            <p className="text-2xl font-bold">{stats.active}</p>
          </CardContent></Card>
          <Card><CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-1"><Shield className="h-4 w-4 text-primary" /><p className="text-sm text-muted-foreground">Network Tokens</p></div>
            <p className="text-2xl font-bold">{stats.networkTokens}</p>
          </CardContent></Card>
          <Card><CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-1"><RefreshCw className="h-4 w-4 text-primary" /><p className="text-sm text-muted-foreground">Auto-Update</p></div>
            <p className="text-2xl font-bold">{stats.autoUpdate}</p>
          </CardContent></Card>
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search by last 4, brand, or customer..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>

        {/* Card list */}
        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
        ) : !filtered?.length ? (
          <Card><CardContent className="flex flex-col items-center justify-center py-12">
            <CreditCard className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No Saved Cards</p>
            <p className="text-sm text-muted-foreground">Tokenized cards will appear here after customers save payment methods</p>
          </CardContent></Card>
        ) : (
          <div className="space-y-2">
            {filtered.map((card: any) => {
              const statusCfg = STATUS_BADGE[card.status || 'active'] || STATUS_BADGE.active;
              const StatusIcon = statusCfg.icon;
              return (
                <Card key={card.id} className="hover:border-primary/20 transition-colors">
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-4">
                      <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${brandColor(card.card_brand)}`}>
                        <CreditCard className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-foreground capitalize">{card.card_brand || 'Card'}</span>
                          <span className="text-sm text-muted-foreground">•••• {card.card_last4}</span>
                          <Badge variant={statusCfg.variant} className="gap-1 text-xs">
                            <StatusIcon className="h-3 w-3" /> {statusCfg.label}
                          </Badge>
                          {card.is_default && <Badge variant="default" className="text-xs">Default</Badge>}
                          {card.network_token_status === 'active' && <Badge className="text-xs bg-emerald-500/10 text-emerald-600 border-0">Network Token</Badge>}
                        </div>
                        <div className="flex gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                          <span>Exp: {card.exp_month}/{card.exp_year}</span>
                          <span>Used: {card.usage_count || 0}×</span>
                          {card.last_used_at && <span>Last: {formatDistanceToNow(new Date(card.last_used_at), { addSuffix: true })}</span>}
                          {card.card_updater_enabled && <span className="text-primary">Auto-update ✓</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => setEventsToken(card.id)} title="History">
                        <History className="h-4 w-4 text-muted-foreground" />
                      </Button>
                      {card.status === 'active' && (
                        <Button variant="ghost" size="sm" onClick={() => setRevokeTarget(card)} title="Revoke">
                          <Ban className="h-4 w-4 text-amber-500" />
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(card.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Delete confirmation */}
        <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Remove Saved Card</DialogTitle></DialogHeader>
            <DialogDescription>This will permanently delete the tokenized card. Active subscriptions using this card will fail on next billing.</DialogDescription>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
              <Button variant="destructive" onClick={() => deleteTarget && handleDelete(deleteTarget)}>Delete Card</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Revoke dialog */}
        <Dialog open={!!revokeTarget} onOpenChange={() => setRevokeTarget(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Revoke Token</DialogTitle></DialogHeader>
            <DialogDescription>Revoking this token will block all future transactions, subscriptions, and invoice payments using it.</DialogDescription>
            <div className="py-2 text-sm">
              <p><strong>Card:</strong> {revokeTarget?.card_brand} •••• {revokeTarget?.card_last4}</p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRevokeTarget(null)}>Cancel</Button>
              <Button variant="destructive" onClick={handleRevoke}>Revoke Token</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Event History Dialog */}
        <Dialog open={!!eventsToken} onOpenChange={() => setEventsToken(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><History className="h-5 w-5" /> Token History</DialogTitle>
              <DialogDescription>Lifecycle events for this token</DialogDescription>
            </DialogHeader>
            <div className="max-h-80 overflow-y-auto space-y-2">
              {eventsLoading ? (
                <div className="flex justify-center py-6"><Loader2 className="h-6 w-6 animate-spin" /></div>
              ) : !events?.length ? (
                <p className="text-sm text-muted-foreground text-center py-6">No events recorded yet</p>
              ) : (
                events.map((evt: any) => (
                  <div key={evt.id} className="flex items-start gap-3 p-3 rounded-lg border border-border">
                    <div className="h-2 w-2 rounded-full bg-primary mt-2 shrink-0" />
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">{evt.event_type}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(evt.created_at), { addSuffix: true })}
                        </span>
                      </div>
                      {evt.metadata && Object.keys(evt.metadata).length > 0 && (
                        <pre className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">{JSON.stringify(evt.metadata, null, 2)}</pre>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
