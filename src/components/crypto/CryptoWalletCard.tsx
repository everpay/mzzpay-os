import { useState } from 'react';
import { Copy, ArrowDownToLine, ArrowUpFromLine, Wallet as WalletIcon, ChevronDown, ExternalLink, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { CryptoWallet } from '@/hooks/useCryptoWallets';
import { useLatestWalletDeposit, explorerUrl } from '@/hooks/useCryptoTransactions';
import { WalletActionDialog } from './WalletActionDialog';
import { WalletTransactionsTable } from './WalletTransactionsTable';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface Props { wallet: CryptoWallet; }

const statusIcon = (s: string) => {
  if (s === 'complete') return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />;
  if (s === 'failed' || s === 'cancelled') return <XCircle className="h-3.5 w-3.5 text-destructive" />;
  return <Clock className="h-3.5 w-3.5 text-amber-500" />;
};

export function CryptoWalletCard({ wallet }: Props) {
  const [mode, setMode] = useState<'deposit' | 'withdraw' | null>(null);
  const [open, setOpen] = useState(false);
  const { data: latest } = useLatestWalletDeposit(wallet.id);

  const copy = (val: string) => {
    navigator.clipboard.writeText(val);
    toast.success('Copied');
  };

  const explorer = explorerUrl(wallet.network, latest?.tx_hash);

  return (
    <>
      <div className="rounded-xl border border-border bg-card p-5 shadow-sm hover:border-primary/50 transition-colors">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10"><WalletIcon className="h-4 w-4 text-primary" /></div>
            <div>
              <h3 className="font-bold">{wallet.asset_id}</h3>
              <p className="text-xs text-muted-foreground">{wallet.network || 'Crypto'}</p>
            </div>
          </div>
          {wallet.is_default && <Badge variant="secondary" className="text-xs">Default</Badge>}
          {wallet.is_user_added && <Badge variant="outline" className="text-xs">Added</Badge>}
        </div>

        <div className="mb-3">
          <p className="text-xs text-muted-foreground mb-1">Balance</p>
          <p className="text-2xl font-bold">{Number(wallet.balance).toFixed(6)}</p>
          <p className="text-xs text-emerald-500">Available {Number(wallet.available).toFixed(6)}</p>
        </div>

        {wallet.address && (
          <div className="mb-3 p-2 rounded-md bg-muted/50">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Address</p>
            <div className="flex items-center gap-1">
              <code className="text-xs font-mono truncate flex-1">{wallet.address}</code>
              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => copy(wallet.address!)}>
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          </div>
        )}

        {latest && (
          <div className="mb-3 p-2 rounded-md border border-border bg-background/50">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Latest deposit</span>
              <div className="flex items-center gap-1">
                {statusIcon(latest.status)}
                <span className="text-xs capitalize">{latest.status}</span>
              </div>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium">{Number(latest.amount).toFixed(6)} {latest.asset_id}</span>
              <span className="text-muted-foreground">{format(new Date(latest.created_at), 'MMM d, HH:mm')}</span>
            </div>
            {latest.tx_hash && (
              <div className="flex items-center gap-1 mt-1">
                <code className="text-[10px] font-mono truncate flex-1 text-muted-foreground">{latest.tx_hash}</code>
                <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => copy(latest.tx_hash!)}>
                  <Copy className="h-2.5 w-2.5" />
                </Button>
                {explorer && (
                  <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => window.open(explorer, '_blank')}>
                    <ExternalLink className="h-2.5 w-2.5" />
                  </Button>
                )}
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <Button size="sm" variant="outline" className="gap-1.5"
            onClick={() => setMode('deposit')} disabled={wallet.status !== 'active'}>
            <ArrowDownToLine className="h-3.5 w-3.5" />Deposit
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5"
            onClick={() => setMode('withdraw')} disabled={wallet.status !== 'active'}>
            <ArrowUpFromLine className="h-3.5 w-3.5" />Withdraw
          </Button>
        </div>

        <Collapsible open={open} onOpenChange={setOpen} className="mt-3">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full justify-between text-xs">
              Transaction history
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2">
            <WalletTransactionsTable walletId={wallet.id} network={wallet.network} />
          </CollapsibleContent>
        </Collapsible>
      </div>
      <WalletActionDialog wallet={wallet} mode={mode} onClose={() => setMode(null)} />
    </>
  );
}
