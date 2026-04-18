import { useMemo, useState } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { FileText, Download, Search, Shield, Clock } from 'lucide-react';
import { format } from 'date-fns';

export default function AuditTrail() {
  const { user } = useAuth();
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('all');
  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['audit-logs', user?.id], enabled: !!user,
    queryFn: async () => {
      const { data: m } = await supabase.from('merchants').select('id').eq('user_id', user!.id).single();
      if (!m) return [];
      const { data } = await supabase.from('audit_logs').select('*').eq('merchant_id', m.id).order('created_at', { ascending: false }).limit(500);
      return data || [];
    },
  });
  const actions = useMemo(() => [...new Set(logs.map(l => l.action))], [logs]);
  const filtered = useMemo(() => {
    let r = logs;
    if (filter !== 'all') r = r.filter(l => l.action === filter);
    if (q) r = r.filter(l => l.action.toLowerCase().includes(q.toLowerCase()) || l.entity_type?.toLowerCase().includes(q.toLowerCase()));
    return r;
  }, [logs, filter, q]);
  const exp = () => {
    const csv = 'Timestamp,Action,Entity,EntityID,Metadata\n' + filtered.map(l => `${l.created_at},${l.action},${l.entity_type || ''},${l.entity_id || ''},"${JSON.stringify(l.metadata || {}).replace(/"/g, '""')}"`).join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = `audit-${format(new Date(), 'yyyy-MM-dd')}.csv`; a.click();
  };
  const ac = (a: string): any => a.includes('create') ? 'default' : a.includes('delete') ? 'destructive' : a.includes('update') ? 'secondary' : 'outline';

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div><h1 className="font-heading text-2xl font-bold flex items-center gap-2"><Shield className="h-6 w-6 text-primary" />Audit Trail</h1><p className="text-sm text-muted-foreground mt-1">Compliance-grade activity logging</p></div>
          <Button onClick={exp} variant="outline" size="sm" className="rounded-full"><Download className="h-4 w-4 mr-2" />Export</Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card><CardContent className="pt-4"><div className="text-sm text-muted-foreground flex items-center gap-2"><FileText className="h-4 w-4" />Total Events</div><p className="text-2xl font-bold mt-1">{logs.length}</p></CardContent></Card>
          <Card><CardContent className="pt-4"><div className="text-sm text-muted-foreground flex items-center gap-2"><Shield className="h-4 w-4" />Unique Actions</div><p className="text-2xl font-bold mt-1">{actions.length}</p></CardContent></Card>
          <Card><CardContent className="pt-4"><div className="text-sm text-muted-foreground flex items-center gap-2"><Clock className="h-4 w-4" />Last Activity</div><p className="text-lg font-semibold mt-1">{logs.length > 0 ? format(new Date(logs[0].created_at), 'MMM dd, HH:mm') : '—'}</p></CardContent></Card>
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input className="pl-9 rounded-2xl" placeholder="Search..." value={q} onChange={e => setQ(e.target.value)} /></div>
          <Select value={filter} onValueChange={setFilter}><SelectTrigger className="w-[180px] rounded-2xl"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All Actions</SelectItem>{actions.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent></Select>
        </div>
        <Card><CardContent className="p-0"><Table><TableHeader><TableRow><TableHead>Timestamp</TableHead><TableHead>Action</TableHead><TableHead>Entity</TableHead><TableHead>Entity ID</TableHead><TableHead>Metadata</TableHead></TableRow></TableHeader><TableBody>{isLoading ? <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow> : filtered.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No audit events</TableCell></TableRow> : filtered.slice(0, 100).map(l => <TableRow key={l.id}><TableCell className="text-sm whitespace-nowrap">{format(new Date(l.created_at), 'MMM dd, HH:mm:ss')}</TableCell><TableCell><Badge variant={ac(l.action)}>{l.action}</Badge></TableCell><TableCell className="text-sm">{l.entity_type || '—'}</TableCell><TableCell className="font-mono text-xs">{l.entity_id ? `${l.entity_id.slice(0,12)}...` : '—'}</TableCell><TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">{l.metadata ? JSON.stringify(l.metadata).slice(0, 60) : '—'}</TableCell></TableRow>)}</TableBody></Table></CardContent></Card>
      </div>
    </AppLayout>
  );
}
