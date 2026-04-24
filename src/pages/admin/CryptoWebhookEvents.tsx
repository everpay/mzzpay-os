import { useState } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { useElektropayWebhookEvents, useRetryWebhook, WebhookEvent } from '@/hooks/useElektropayWebhookEvents';
import { useAccessControl } from '@/hooks/useAccessControl';
import Unauthorized from '@/components/admin/Unauthorized';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Search, RefreshCcw, Webhook, AlertTriangle, CheckCircle2, Copy } from 'lucide-react';
import { format } from 'date-fns';

import { notifySuccess } from '@/lib/error-toast';

export default function CryptoWebhookEvents() {
  const { isSuperAdmin, isAdmin, isLoading } = useAccessControl();
  const { data: events = [], isLoading: loading, refetch } = useElektropayWebhookEvents();
  const retry = useRetryWebhook();

  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'processed' | 'failed' | 'unprocessed' | 'duplicates'>('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [selected, setSelected] = useState<WebhookEvent | null>(null);

  if (isLoading) return <AppLayout><div className="p-6">Loading...</div></AppLayout>;
  if (!isSuperAdmin && !isAdmin) return <AppLayout><Unauthorized /></AppLayout>;

  const types = Array.from(new Set(events.map(e => e.event_type).filter(Boolean)));
  const filtered = events.filter(e => {
    if (typeFilter !== 'all' && e.event_type !== typeFilter) return false;
    if (statusFilter === 'processed' && !e.processed) return false;
    if (statusFilter === 'failed' && !e.error_message) return false;
    if (statusFilter === 'unprocessed' && (e.processed || e.error_message)) return false;
    if (statusFilter === 'duplicates' && (e.attempt_count ?? 1) <= 1) return false;
    if (query) {
      const q = query.toLowerCase();
      const text = `${e.event_id} ${e.event_type} ${JSON.stringify(e.payload)}`.toLowerCase();
      if (!text.includes(q)) return false;
    }
    return true;
  });

  const stats = {
    total: events.length,
    processed: events.filter(e => e.processed).length,
    failed: events.filter(e => !!e.error_message).length,
    duplicates: events.filter(e => (e.attempt_count ?? 1) > 1).length,
  };

  const copy = (v: string) => { navigator.clipboard.writeText(v); notifySuccess('Copied'); };

  return (
    <AppLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Webhook className="h-6 w-6 text-primary" />Elektropay Webhook Events
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Inbound events, dedupe attempts, and balance-update failures.</p>
        </div>
        <Button variant="outline" onClick={() => refetch()} className="gap-2">
          <RefreshCcw className="h-4 w-4" />Refresh
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <Stat label="Total events" value={stats.total} icon={<Webhook className="h-4 w-4" />} />
        <Stat label="Processed" value={stats.processed} icon={<CheckCircle2 className="h-4 w-4 text-primary" />} />
        <Stat label="Failed" value={stats.failed} icon={<AlertTriangle className="h-4 w-4 text-destructive" />} tone="destructive" />
        <Stat label="Duplicate attempts" value={stats.duplicates} icon={<RefreshCcw className="h-4 w-4 text-muted-foreground" />} />
      </div>

      <div className="rounded-xl border border-border bg-card">
        <div className="p-4 flex flex-wrap items-center gap-3 border-b border-border">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} className="pl-9"
              placeholder="Search event ID, type, payload..." />
          </div>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="processed">Processed</SelectItem>
              <SelectItem value="unprocessed">Unprocessed</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="duplicates">Duplicates only</SelectItem>
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {types.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Received</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Event ID</TableHead>
              <TableHead className="text-center">Attempts</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Error</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No events</TableCell></TableRow>
            ) : filtered.map((e) => (
              <TableRow key={e.id} className="cursor-pointer" onClick={() => setSelected(e)}>
                <TableCell className="text-xs whitespace-nowrap">{format(new Date(e.created_at), 'MMM d, HH:mm:ss')}</TableCell>
                <TableCell><Badge variant="outline">{e.event_type}</Badge></TableCell>
                <TableCell className="font-mono text-xs">{e.event_id?.slice(0, 18)}…</TableCell>
                <TableCell className="text-center">
                  <Badge variant={(e.attempt_count ?? 1) > 1 ? 'secondary' : 'outline'}>{e.attempt_count ?? 1}</Badge>
                </TableCell>
                <TableCell>
                  {e.error_message ? <Badge variant="destructive">failed</Badge>
                    : e.processed ? <Badge>processed</Badge>
                      : <Badge variant="secondary">pending</Badge>}
                </TableCell>
                <TableCell className="text-xs text-destructive max-w-[240px] truncate">{e.error_message || '—'}</TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="outline" onClick={(ev) => { ev.stopPropagation(); retry.mutate(e.event_id); }}
                    disabled={retry.isPending}>Retry</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>Webhook event payload</DialogTitle></DialogHeader>
          {selected && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-muted-foreground">Event ID:</span> <code className="text-xs">{selected.event_id}</code></div>
                <div><span className="text-muted-foreground">Type:</span> {selected.event_type}</div>
                <div><span className="text-muted-foreground">Attempts:</span> {selected.attempt_count ?? 1}</div>
                <div><span className="text-muted-foreground">Last attempt:</span> {selected.last_attempt_at ? format(new Date(selected.last_attempt_at), 'PPp') : '—'}</div>
              </div>
              {selected.error_message && (
                <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                  {selected.error_message}
                </div>
              )}
              <div className="relative">
                <Button size="icon" variant="ghost" className="absolute top-2 right-2 h-7 w-7"
                  onClick={() => copy(JSON.stringify(selected.payload, null, 2))}>
                  <Copy className="h-3 w-3" />
                </Button>
                <pre className="bg-muted rounded-md p-3 text-xs overflow-auto max-h-[400px]">
                  {JSON.stringify(selected.payload, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}

function Stat({ label, value, icon, tone }: { label: string; value: number; icon: React.ReactNode; tone?: 'destructive' }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">{icon}{label}</div>
      <p className={`text-2xl font-bold ${tone === 'destructive' ? 'text-destructive' : ''}`}>{value}</p>
    </div>
  );
}
