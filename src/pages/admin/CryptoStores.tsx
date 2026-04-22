import { useMemo, useState } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { useCryptoStores, useCreateStore } from '@/hooks/useCryptoWallets';
import { useAccessControl } from '@/hooks/useAccessControl';
import Unauthorized from '@/components/admin/Unauthorized';
import { MerchantPicker } from '@/components/crypto/MerchantPicker';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Store, Loader2, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

export default function CryptoStores() {
  const { isSuperAdmin, isAdmin, isLoading } = useAccessControl();
  const { data: stores = [], isLoading: loading } = useCryptoStores();
  const create = useCreateStore();
  const [open, setOpen] = useState(false);
  const [merchantId, setMerchantId] = useState('');
  const [name, setName] = useState('');
  const [baseCurrency, setBaseCurrency] = useState('USD');
  const [filter, setFilter] = useState('');
  const [merchantFilter, setMerchantFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const { data: merchants = [] } = useQuery({
    queryKey: ['merchants-min'],
    queryFn: async () => {
      const { data } = await (supabase as any).from('merchants').select('id, name').order('name');
      return data || [];
    },
  });

  const filtered = useMemo(() => stores.filter(s => {
    if (merchantFilter !== 'all' && s.merchant_id !== merchantFilter) return false;
    if (statusFilter === 'active' && !s.is_active) return false;
    if (statusFilter === 'inactive' && s.is_active) return false;
    if (filter && !`${s.name} ${s.base_currency} ${s.elektropay_store_id ?? ''}`.toLowerCase().includes(filter.toLowerCase())) return false;
    return true;
  }), [stores, filter, merchantFilter, statusFilter]);

  if (isLoading) return <AppLayout><div className="p-6">Loading...</div></AppLayout>;
  if (!isSuperAdmin && !isAdmin) return <AppLayout><Unauthorized /></AppLayout>;

  const handleCreate = async () => {
    await create.mutateAsync({ merchant_id: merchantId, name, base_currency: baseCurrency });
    setOpen(false); setMerchantId(''); setName('');
  };

  return (
    <AppLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Crypto Stores</h1>
          <p className="mt-1 text-sm text-muted-foreground">Per-merchant Elektropay stores.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button className="gap-1.5"><Plus className="h-4 w-4" />New store</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create crypto store</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Merchant</Label>
                <select className="w-full border border-border rounded-md p-2 bg-background"
                  value={merchantId} onChange={(e) => setMerchantId(e.target.value)}>
                  <option value="">Select merchant</option>
                  {merchants.map((m: any) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
              <div><Label>Store name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
              <div><Label>Base currency</Label><Input value={baseCurrency} onChange={(e) => setBaseCurrency(e.target.value.toUpperCase())} /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={!merchantId || !name || create.isPending}>
                {create.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-xl border border-border bg-card">
        <div className="p-4 grid grid-cols-1 md:grid-cols-4 gap-3 border-b border-border">
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search store name, currency..." value={filter}
              onChange={(e) => setFilter(e.target.value)} className="pl-9" />
          </div>
          <MerchantPicker value={merchantFilter} onChange={setMerchantFilter} placeholder="All merchants" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Store</TableHead>
              <TableHead>Merchant</TableHead>
              <TableHead>Base currency</TableHead>
              <TableHead>Elektropay ID</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                <Store className="h-8 w-8 mx-auto mb-2 opacity-50" />No stores
              </TableCell></TableRow>
            ) : filtered.map(s => (
              <TableRow key={s.id}>
                <TableCell className="font-medium">{s.name}</TableCell>
                <TableCell className="font-mono text-xs">{s.merchant_id.slice(0, 8)}...</TableCell>
                <TableCell><Badge variant="outline">{s.base_currency}</Badge></TableCell>
                <TableCell className="font-mono text-xs">{s.elektropay_store_id || '—'}</TableCell>
                <TableCell>
                  <Badge variant={s.is_active ? 'default' : 'secondary'}>
                    {s.is_active ? 'active' : 'inactive'}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">{new Date(s.created_at).toLocaleDateString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </AppLayout>
  );
}
