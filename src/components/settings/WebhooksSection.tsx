import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Webhook, Copy, Trash2, Eye, EyeOff, RefreshCw, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { formatDate } from '@/lib/format';

const EVENTS = [
  'payment.created', 'payment.completed', 'payment.failed',
  'refund.created', 'refund.processed',
  'chargeback.created', 'dispute.updated',
  'payout.completed',
  'subscription.created', 'subscription.canceled',
  'invoice.paid', 'invoice.overdue',
];

export function WebhooksSection() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState('');
  const [events, setEvents] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [visible, setVisible] = useState<Set<string>>(new Set());

  const { data: endpoints } = useQuery({
    queryKey: ['webhook-endpoints'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data: m } = await supabase.from('merchants').select('id').eq('user_id', user.id).single();
      if (!m) return [];
      const { data } = await (supabase as any).from('webhook_endpoints').select('*').eq('merchant_id', m.id).order('created_at', { ascending: false });
      return data || [];
    },
  });

  const { data: deliveries } = useQuery({
    queryKey: ['webhook-deliveries'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data: m } = await supabase.from('merchants').select('id').eq('user_id', user.id).single();
      if (!m) return [];
      const { data } = await (supabase as any).from('webhook_deliveries').select('*, endpoint:webhook_endpoints(url)').eq('merchant_id', m.id).order('created_at', { ascending: false }).limit(50);
      return data || [];
    },
  });

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authed');
      const { data: m } = await supabase.from('merchants').select('id').eq('user_id', user.id).single();
      if (!m) throw new Error('No merchant');
      const { error } = await (supabase as any).from('webhook_endpoints').insert({
        merchant_id: m.id,
        url,
        events: events.length > 0 ? events : EVENTS,
      });
      if (error) throw error;
      toast.success('Webhook created');
      setOpen(false);
      setUrl('');
      setEvents([]);
      qc.invalidateQueries({ queryKey: ['webhook-endpoints'] });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const del = async (id: string) => {
    const { error } = await (supabase as any).from('webhook_endpoints').delete().eq('id', id);
    if (error) toast.error('Failed');
    else {
      toast.success('Deleted');
      qc.invalidateQueries({ queryKey: ['webhook-endpoints'] });
    }
  };

  const toggle = async (id: string, active: boolean) => {
    await (supabase as any).from('webhook_endpoints').update({ active: !active }).eq('id', id);
    qc.invalidateQueries({ queryKey: ['webhook-endpoints'] });
  };

  const ds = (s: string) =>
    s === 'delivered' ? (
      <Badge className="bg-success/10 text-success border-success/20"><CheckCircle2 className="h-3 w-3 mr-1" />Delivered</Badge>
    ) : s === 'failed' ? (
      <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Failed</Badge>
    ) : (
      <Badge className="bg-warning/10 text-warning border-warning/20"><Clock className="h-3 w-3 mr-1" />Pending</Badge>
    );

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h3 className="font-heading text-lg font-bold flex items-center gap-2">
            <Webhook className="h-5 w-5 text-primary" /> Webhooks
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Configure endpoints and monitor delivery logs. Each event POSTs a signed payload to your URL.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-full gap-2"><Plus className="h-4 w-4" />Add Endpoint</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Add Webhook Endpoint</DialogTitle>
              <DialogDescription>POST requests with signed payloads.</DialogDescription>
            </DialogHeader>
            <form onSubmit={create} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>URL</Label>
                <Input className="rounded-2xl" placeholder="https://your-server.com/webhooks" value={url} onChange={(e) => setUrl(e.target.value)} type="url" required />
              </div>
              <div className="space-y-2">
                <Label>Events</Label>
                <p className="text-xs text-muted-foreground mb-2">Empty = all events</p>
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto border border-border rounded-2xl p-3">
                  {EVENTS.map((ev) => (
                    <label key={ev} className="flex items-center gap-2 text-sm cursor-pointer">
                      <Checkbox
                        checked={events.includes(ev)}
                        onCheckedChange={() =>
                          setEvents((p) => (p.includes(ev) ? p.filter((e) => e !== ev) : [...p, ev]))
                        }
                      />
                      <span className="font-mono text-xs">{ev}</span>
                    </label>
                  ))}
                </div>
              </div>
              <Button type="submit" className="w-full rounded-full" disabled={busy}>
                {busy ? 'Creating...' : 'Create'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="endpoints" className="space-y-4">
        <TabsList>
          <TabsTrigger value="endpoints">Endpoints</TabsTrigger>
          <TabsTrigger value="deliveries">Delivery Logs</TabsTrigger>
        </TabsList>
        <TabsContent value="endpoints" className="space-y-3">
          {endpoints?.map((ep: any) => (
            <Card key={ep.id}>
              <CardContent className="py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <Webhook className="h-4 w-4 text-primary" />
                      <span className="font-mono text-sm truncate">{ep.url}</span>
                      <Badge variant={ep.active ? 'default' : 'secondary'}>
                        {ep.active ? 'Active' : 'Disabled'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <span className="text-xs text-muted-foreground">Secret:</span>
                      <code className="text-xs bg-muted px-2 py-0.5 rounded font-mono">
                        {visible.has(ep.id) ? ep.secret : '••••••••••••••••'}
                      </code>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() =>
                          setVisible((p) => {
                            const n = new Set(p);
                            n.has(ep.id) ? n.delete(ep.id) : n.add(ep.id);
                            return n;
                          })
                        }
                      >
                        {visible.has(ep.id) ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => {
                          navigator.clipboard.writeText(ep.secret);
                          toast.success('Copied');
                        }}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {(ep.events as string[])?.slice(0, 5).map((e: string) => (
                        <Badge key={e} variant="outline" className="text-[10px] font-mono">{e}</Badge>
                      ))}
                      {(ep.events as string[])?.length > 5 && (
                        <Badge variant="outline" className="text-[10px]">+{(ep.events as string[]).length - 5}</Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toggle(ep.id, ep.active)}>
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => del(ep.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {!endpoints?.length && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Webhook className="h-8 w-8 mb-3 opacity-40" />
                <p>No endpoints configured</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        <TabsContent value="deliveries">
          <Card>
            <CardHeader>
              <CardTitle>Delivery Logs</CardTitle>
              <CardDescription>Recent delivery attempts</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Event</TableHead>
                    <TableHead>Endpoint</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Response</TableHead>
                    <TableHead>Attempts</TableHead>
                    <TableHead>Sent</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deliveries?.map((d: any) => (
                    <TableRow key={d.id}>
                      <TableCell className="font-mono text-xs">{d.event_type}</TableCell>
                      <TableCell className="text-xs truncate max-w-[200px]">{d.endpoint?.url}</TableCell>
                      <TableCell>{ds(d.status)}</TableCell>
                      <TableCell className="font-mono text-xs">{d.response_status || '—'}</TableCell>
                      <TableCell className="text-center">{d.attempt_count}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{formatDate(d.created_at)}</TableCell>
                    </TableRow>
                  ))}
                  {!deliveries?.length && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">No deliveries yet</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
