import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Building, PlusCircle, Check, Clock, Trash2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { CountrySelect } from '@/components/CountrySelect';

export default function BankAccounts() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ bank_name: '', country: '', currency: 'USD', account_number: '', iban: '', sort_code: '', account_holder_name: '' });
  const [busy, setBusy] = useState(false);

  const { data: merchant } = useQuery({
    queryKey: ['merchant', user?.id],
    enabled: !!user,
    queryFn: async () => { const { data } = await supabase.from('merchants').select('id').eq('user_id', user!.id).single(); return data; },
  });
  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ['bank_accounts', merchant?.id],
    enabled: !!merchant,
    queryFn: async () => { const { data } = await supabase.from('bank_accounts').select('*').eq('merchant_id', merchant!.id).order('created_at', { ascending: false }); return data || []; },
  });
  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from('bank_accounts').delete().eq('id', id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['bank_accounts'] }); toast.success('Bank account removed'); },
    onError: () => toast.error('Failed to remove'),
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!merchant) return;
    setBusy(true);
    const { error } = await supabase.from('bank_accounts').insert({ merchant_id: merchant.id, ...form, status: 'pending_verification' });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Bank account added');
    setOpen(false);
    setForm({ bank_name: '', country: '', currency: 'USD', account_number: '', iban: '', sort_code: '', account_holder_name: '' });
    qc.invalidateQueries({ queryKey: ['bank_accounts'] });
  };

  const sb = (s: string | null) => s === 'verified' ? <Badge className="gap-1"><Check className="h-3 w-3" />Verified</Badge> : s === 'failed' ? <Badge variant="destructive" className="gap-1"><AlertCircle className="h-3 w-3" />Failed</Badge> : <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" />{s || 'New'}</Badge>;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div><h1 className="font-heading text-2xl font-bold">Bank Accounts</h1><p className="text-sm text-muted-foreground">Manage connected bank accounts for payouts and settlements</p></div>
          <Button className="rounded-full" onClick={() => setOpen(true)}><PlusCircle className="h-4 w-4 mr-2" />Add Account</Button>
        </div>
        {isLoading ? <Card><CardContent className="py-12 text-center text-muted-foreground">Loading...</CardContent></Card> : accounts.length === 0 ? (
          <Card><CardContent className="flex flex-col items-center justify-center py-12 text-center"><Building className="h-12 w-12 text-muted-foreground mb-4" /><h3 className="text-lg font-semibold mb-1">No bank accounts</h3><p className="text-muted-foreground text-sm mb-4">Add a bank account to receive payouts.</p><Button className="rounded-full" onClick={() => setOpen(true)}><PlusCircle className="h-4 w-4 mr-2" />Add Account</Button></CardContent></Card>
        ) : accounts.map(a => (
          <Card key={a.id}>
            <CardHeader className="pb-3"><div className="flex items-center justify-between"><div><CardTitle className="text-lg">{a.bank_name || 'Bank Account'}</CardTitle><CardDescription>{a.country && <span className="mr-2">{a.country}</span>}{a.currency && <span>· {a.currency}</span>}</CardDescription></div>{sb(a.status)}</div></CardHeader>
            <CardContent><div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">{a.account_number && <div><p className="text-muted-foreground">Account</p><p className="font-mono">****{a.account_number.slice(-4)}</p></div>}{a.iban && <div><p className="text-muted-foreground">IBAN</p><p className="font-mono">****{a.iban.slice(-4)}</p></div>}{a.sort_code && <div><p className="text-muted-foreground">Sort Code</p><p className="font-mono">{a.sort_code}</p></div>}</div></CardContent>
            <CardFooter><Button variant="outline" size="sm" className="rounded-full" onClick={() => del.mutate(a.id)} disabled={del.isPending}><Trash2 className="h-4 w-4 mr-2" />Remove</Button></CardFooter>
          </Card>
        ))}
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Bank Account</DialogTitle><DialogDescription>For payouts and settlements</DialogDescription></DialogHeader>
          <form onSubmit={submit} className="space-y-3 pt-2">
            <div><Label>Bank Name</Label><Input className="rounded-2xl" value={form.bank_name} onChange={e => setForm({...form, bank_name: e.target.value})} required /></div>
            <div><Label>Account Holder</Label><Input className="rounded-2xl" value={form.account_holder_name} onChange={e => setForm({...form, account_holder_name: e.target.value})} required /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Country</Label><CountrySelect value={form.country} onValueChange={(v) => setForm({...form, country: v})} /></div>
              <div><Label>Currency</Label><Input className="rounded-2xl" value={form.currency} onChange={e => setForm({...form, currency: e.target.value})} /></div>
            </div>
            <div><Label>Account Number</Label><Input className="rounded-2xl" value={form.account_number} onChange={e => setForm({...form, account_number: e.target.value})} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>IBAN</Label><Input className="rounded-2xl" value={form.iban} onChange={e => setForm({...form, iban: e.target.value})} /></div>
              <div><Label>Sort/BSB</Label><Input className="rounded-2xl" value={form.sort_code} onChange={e => setForm({...form, sort_code: e.target.value})} /></div>
            </div>
            <Button type="submit" className="w-full rounded-full" disabled={busy}>{busy ? 'Saving...' : 'Add Account'}</Button>
          </form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
