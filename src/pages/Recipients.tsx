import { useState } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Search, User, Mail, MapPin, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { CountrySelect } from '@/components/CountrySelect';

import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { notifyError, notifySuccess } from '@/lib/error-toast';

export default function Recipients() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', country: '', account_type: '' });

  const { data: recipients = [] } = useQuery({
    queryKey: ['recipients'], enabled: !!user,
    queryFn: async () => {
      const { data: m } = await supabase.from('merchants').select('id').eq('user_id', user!.id).single();
      if (!m) return [];
      const { data } = await supabase.from('recipients').select('*').eq('merchant_id', m.id).order('created_at', { ascending: false });
      return data || [];
    },
  });

  const filtered = recipients.filter(r => !search || r.name.toLowerCase().includes(search.toLowerCase()) || r.email?.toLowerCase().includes(search.toLowerCase()));

  const add = async () => {
    if (!user || !form.name) return;
    const { data: m } = await supabase.from('merchants').select('id').eq('user_id', user.id).single();
    if (!m) return;
    const { error } = await supabase.from('recipients').insert({ merchant_id: m.id, ...form });
    if (error) { notifyError(error.message); return; }
    notifySuccess('Recipient added');
    setOpen(false); setForm({ name: '', email: '', country: '', account_type: '' });
    qc.invalidateQueries({ queryKey: ['recipients'] });
  };
  const del = async (id: string) => {
    const { error } = await supabase.from('recipients').delete().eq('id', id);
    if (error) notifyError(error.message); else { notifySuccess('Removed'); qc.invalidateQueries({ queryKey: ['recipients'] }); }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div><h1 className="font-heading text-2xl font-bold">Recipients</h1><p className="text-sm text-muted-foreground">Manage payout recipients and beneficiaries</p></div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button className="rounded-full"><Plus className="h-4 w-4 mr-2" />Add Recipient</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add Recipient</DialogTitle></DialogHeader>
              <div className="space-y-3 pt-2">
                <div><Label>Name</Label><Input className="rounded-2xl" value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
                <div><Label>Email</Label><Input className="rounded-2xl" type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} /></div>
                <div><Label>Country</Label><CountrySelect value={form.country} onValueChange={(v) => setForm({...form, country: v})} /></div>
                <div><Label>Account Type</Label><Input className="rounded-2xl" placeholder="ACH / SWIFT / SEPA" value={form.account_type} onChange={e => setForm({...form, account_type: e.target.value})} /></div>
                <Button className="w-full rounded-full" onClick={add}>Save Recipient</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input className="pl-10 rounded-2xl" placeholder="Search recipients..." value={search} onChange={e => setSearch(e.target.value)} /></div>
        <div className="grid gap-3">
          {filtered.map(r => (
            <Card key={r.id}><CardContent className="flex items-center justify-between py-4">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center"><User className="h-5 w-5 text-primary" /></div>
                <div><p className="font-medium">{r.name}</p><div className="flex items-center gap-3 text-sm text-muted-foreground">{r.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{r.email}</span>}{r.country && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{r.country}</span>}{r.account_type && <span className="px-2 py-0.5 rounded bg-muted text-xs">{r.account_type}</span>}</div></div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => del(r.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </CardContent></Card>
          ))}
          {filtered.length === 0 && <p className="text-center text-muted-foreground py-8">No recipients found</p>}
        </div>
      </div>
    </AppLayout>
  );
}
