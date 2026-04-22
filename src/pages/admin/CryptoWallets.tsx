import { useMemo, useState } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { useCryptoWallets, useCryptoAssets, useFreezeWallet, useCloseWallet, CryptoWallet } from '@/hooks/useCryptoWallets';
import { useAccessControl } from '@/hooks/useAccessControl';
import Unauthorized from '@/components/admin/Unauthorized';
import { MerchantPicker } from '@/components/crypto/MerchantPicker';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowDownToLine, ArrowUpFromLine, Snowflake, X, Search, Wallet } from 'lucide-react';
import { WalletActionDialog } from '@/components/crypto/WalletActionDialog';

export default function CryptoWallets() {
  const { isSuperAdmin, isAdmin, isLoading } = useAccessControl();
  const { data: wallets = [], isLoading: loading } = useCryptoWallets();
  const { data: assets = [] } = useCryptoAssets();
  const freeze = useFreezeWallet();
  const close = useCloseWallet();
  const [filter, setFilter] = useState('');
  const [merchant, setMerchant] = useState('all');
  const [asset, setAsset] = useState('all');
  const [status, setStatus] = useState('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [actionWallet, setActionWallet] = useState<CryptoWallet | null>(null);
  const [actionMode, setActionMode] = useState<'deposit' | 'withdraw' | null>(null);

  const filtered = useMemo(() => wallets.filter(w => {
    if (merchant !== 'all' && w.merchant_id !== merchant) return false;
    if (asset !== 'all' && w.asset_id !== asset) return false;
    if (status !== 'all' && w.status !== status) return false;
    if (from && new Date(w.created_at) < new Date(from)) return false;
    if (to && new Date(w.created_at) > new Date(to + 'T23:59:59')) return false;
    if (filter) {
      const t = `${w.asset_id} ${w.address ?? ''} ${w.merchant_id} ${w.network ?? ''}`.toLowerCase();
      if (!t.includes(filter.toLowerCase())) return false;
    }
    return true;
  }), [wallets, filter, merchant, asset, status, from, to]);

  if (isLoading) return <AppLayout><div className="p-6">Loading...</div></AppLayout>;
  if (!isSuperAdmin && !isAdmin) return <AppLayout><Unauthorized /></AppLayout>;

  return (
    <AppLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Crypto Wallets</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage all merchant crypto wallets, balances, and operations.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatBlock label="Total wallets" value={String(wallets.length)} icon={<Wallet className="h-4 w-4" />} />
        <StatBlock label="Active" value={String(wallets.filter(w => w.status === 'active').length)} />
        <StatBlock label="Frozen" value={String(wallets.filter(w => w.status === 'frozen').length)} />
      </div>

      <div className="rounded-xl border border-border bg-card">
        <div className="p-4 grid grid-cols-1 md:grid-cols-6 gap-3 border-b border-border">
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search asset, address, network..." value={filter}
              onChange={(e) => setFilter(e.target.value)} className="pl-9" />
          </div>
          <MerchantPicker value={merchant} onChange={setMerchant} placeholder="All merchants" />
          <Select value={asset} onValueChange={setAsset}>
            <SelectTrigger><SelectValue placeholder="All assets" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All assets</SelectItem>
              {assets.map(a => <SelectItem key={a.asset_id} value={a.asset_id}>{a.asset_id}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="frozen">Frozen</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex gap-2">
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} title="From" />
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} title="To" />
          </div>
        </div>

        <div className="px-4 py-2 text-xs text-muted-foreground border-b border-border">{filtered.length} of {wallets.length} wallets</div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Asset</TableHead>
              <TableHead>Network</TableHead>
              <TableHead>Address</TableHead>
              <TableHead className="text-right">Balance</TableHead>
              <TableHead className="text-right">Available</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No wallets</TableCell></TableRow>
            ) : filtered.map((w) => (
              <TableRow key={w.id}>
                <TableCell className="font-medium">{w.asset_id}</TableCell>
                <TableCell><Badge variant="outline">{w.network || '—'}</Badge></TableCell>
                <TableCell className="font-mono text-xs max-w-[200px] truncate">{w.address || '—'}</TableCell>
                <TableCell className="text-right font-medium">{Number(w.balance).toFixed(6)}</TableCell>
                <TableCell className="text-right text-primary">{Number(w.available).toFixed(6)}</TableCell>
                <TableCell>
                  <Badge variant={w.status === 'active' ? 'default' : w.status === 'frozen' ? 'secondary' : 'destructive'}>
                    {w.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button size="icon" variant="ghost" title="Deposit"
                      onClick={() => { setActionWallet(w); setActionMode('deposit'); }}>
                      <ArrowDownToLine className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" title="Withdraw"
                      onClick={() => { setActionWallet(w); setActionMode('withdraw'); }}>
                      <ArrowUpFromLine className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" title="Freeze" disabled={w.status !== 'active'}
                      onClick={() => freeze.mutate({ wallet_id: w.id })}>
                      <Snowflake className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" title="Close" disabled={w.status === 'closed'}
                      onClick={() => close.mutate({ wallet_id: w.id })}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <WalletActionDialog wallet={actionWallet} mode={actionMode}
        onClose={() => { setActionWallet(null); setActionMode(null); }} />
    </AppLayout>
  );
}

function StatBlock({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-2 mb-2 text-muted-foreground text-sm">{icon}{label}</div>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}
