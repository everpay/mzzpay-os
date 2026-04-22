import { useMemo, useState } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { useCryptoCommissions, useUpsertCommission, useDeleteCommission, CryptoCommission } from '@/hooks/useCryptoCommissions';
import { useCryptoAssets, useCryptoWallets } from '@/hooks/useCryptoWallets';
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
import { Plus, Trash2, Percent } from 'lucide-react';

const TX_TYPES = ['deposit', 'withdrawal', 'convert', 'transfer', 'payment'] as const;

export default function CryptoCommissions() {
  const { isSuperAdmin, isAdmin, isLoading } = useAccessControl();
  const { data: commissions = [], isLoading: loading } = useCryptoCommissions();
  const { data: assets = [] } = useCryptoAssets();
  const { data: wallets = [] } = useCryptoWallets();
  const upsert = useUpsertCommission();
  const del = useDeleteCommission();
  const [open, setOpen] = useState(false);
  const [merchantFilter, setMerchantFilter] = useState('all');
  const [assetFilter, setAssetFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [activeFilter, setActiveFilter] = useState('all');
  const [form, setForm] = useState<Partial<CryptoCommission>>({
    tx_type: 'withdrawal', fee_percent: 0, fee_fixed: 0, split_percent: 0, is_active: true,
  });

  const filtered = useMemo(() => commissions.filter(c => {
    if (merchantFilter !== 'all' && c.merchant_id !== merchantFilter) return false;
    if (assetFilter !== 'all' && c.asset_id !== assetFilter) return false;
    if (typeFilter !== 'all' && c.tx_type !== typeFilter) return false;
    if (activeFilter === 'on' && !c.is_active) return false;
    if (activeFilter === 'off' && c.is_active) return false;
    return true;
  }), [commissions, merchantFilter, assetFilter, typeFilter, activeFilter]);

  if (isLoading) return <AppLayout><div className="p-6">Loading...</div></AppLayout>;
  if (!isSuperAdmin && !isAdmin) return <AppLayout><Unauthorized /></AppLayout>;

  const handleSave = async () => {
    await upsert.mutateAsync(form);
    setOpen(false);
    setForm({ tx_type: 'withdrawal', fee_percent: 0, fee_fixed: 0, split_percent: 0, is_active: true });
  };

  return (
    <AppLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Crypto Commissions & Splits</h1>
          <p className="mt-1 text-sm text-muted-foreground">Configure fees per transaction type, asset, and merchant. Optionally split a portion to a wallet.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button className="gap-1.5"><Plus className="h-4 w-4" />New rule</Button></DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Commission rule</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Transaction type</Label>
                <Select value={form.tx_type} onValueChange={(v) => setForm(f => ({ ...f, tx_type: v as any }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TX_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label>Asset (empty = all)</Label>
                <Select value={form.asset_id ?? 'all'} onValueChange={(v) => setForm(f => ({ ...f, asset_id: v === 'all' ? null : v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All assets</SelectItem>
                    {assets.map(a => <SelectItem key={a.asset_id} value={a.asset_id}>{a.asset_id}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Fee %</Label>
                <Input type="number" step="0.001" value={form.fee_percent ?? 0}
                  onChange={(e) => setForm(f => ({ ...f, fee_percent: Number(e.target.value) }))} />
              </div>
              <div>
                <Label>Fee fixed</Label>
                <Input type="number" step="any" value={form.fee_fixed ?? 0}
                  onChange={(e) => setForm(f => ({ ...f, fee_fixed: Number(e.target.value) }))} />
              </div>
              <div>
                <Label>Split %</Label>
                <Input type="number" step="0.01" value={form.split_percent ?? 0}
                  onChange={(e) => setForm(f => ({ ...f, split_percent: Number(e.target.value) }))} />
              </div>
              <div>
                <Label>Split to wallet</Label>
                <Select value={form.split_to_wallet_id ?? 'none'}
                  onValueChange={(v) => setForm(f => ({ ...f, split_to_wallet_id: v === 'none' ? null : v }))}>
                  <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {wallets.map(w => <SelectItem key={w.id} value={w.id}>{w.asset_id} · {w.id.slice(0, 8)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={upsert.isPending}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-xl border border-border bg-card">
        <div className="p-4 grid grid-cols-1 md:grid-cols-4 gap-3 border-b border-border">
          <MerchantPicker value={merchantFilter} onChange={setMerchantFilter} placeholder="All merchants" />
          <Select value={assetFilter} onValueChange={setAssetFilter}>
            <SelectTrigger><SelectValue placeholder="All assets" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All assets</SelectItem>
              {assets.map(a => <SelectItem key={a.asset_id} value={a.asset_id}>{a.asset_id}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {TX_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={activeFilter} onValueChange={setActiveFilter}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="on">Active only</SelectItem>
              <SelectItem value="off">Inactive only</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>Asset</TableHead>
              <TableHead>Merchant</TableHead>
              <TableHead className="text-right">Fee %</TableHead>
              <TableHead className="text-right">Fee fixed</TableHead>
              <TableHead className="text-right">Split %</TableHead>
              <TableHead>Active</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                <Percent className="h-8 w-8 mx-auto mb-2 opacity-50" />No commission rules
              </TableCell></TableRow>
            ) : filtered.map(c => (
              <TableRow key={c.id}>
                <TableCell className="capitalize">{c.tx_type}</TableCell>
                <TableCell>{c.asset_id || <span className="text-muted-foreground">all</span>}</TableCell>
                <TableCell className="font-mono text-xs">{c.merchant_id?.slice(0, 8) ?? <span className="text-muted-foreground">global</span>}</TableCell>
                <TableCell className="text-right">{Number(c.fee_percent).toFixed(3)}%</TableCell>
                <TableCell className="text-right">{Number(c.fee_fixed).toFixed(6)}</TableCell>
                <TableCell className="text-right">{Number(c.split_percent).toFixed(2)}%</TableCell>
                <TableCell><Badge variant={c.is_active ? 'default' : 'secondary'}>{c.is_active ? 'on' : 'off'}</Badge></TableCell>
                <TableCell className="text-right">
                  <Button size="icon" variant="ghost" onClick={() => del.mutate(c.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </AppLayout>
  );
}
