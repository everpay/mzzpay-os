import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Copy, ExternalLink, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { CryptoWallet, useDeposit, useWithdraw } from '@/hooks/useCryptoWallets';

interface Props {
  wallet: CryptoWallet | null;
  mode: 'deposit' | 'withdraw' | null;
  onClose: () => void;
}

export function WalletActionDialog({ wallet, mode, onClose }: Props) {
  const [amount, setAmount] = useState('');
  const [toAddress, setToAddress] = useState('');
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [depositAddress, setDepositAddress] = useState<string | null>(null);

  const deposit = useDeposit();
  const withdraw = useWithdraw();

  const reset = () => {
    setAmount(''); setToAddress(''); setPaymentUrl(null); setDepositAddress(null);
    onClose();
  };

  if (!wallet || !mode) return null;

  const handleDeposit = async () => {
    const res = await deposit.mutateAsync({ wallet_id: wallet.id, amount: amount ? Number(amount) : undefined });
    setPaymentUrl((res as any).payment_url || null);
    setDepositAddress((res as any).address || wallet.address);
  };

  const handleWithdraw = async () => {
    if (!amount || !toAddress) { toast.error('Amount and address required'); return; }
    await withdraw.mutateAsync({ wallet_id: wallet.id, amount: Number(amount), to_address: toAddress });
    reset();
  };

  const copy = (val: string) => {
    navigator.clipboard.writeText(val);
    toast.success('Copied');
  };

  return (
    <Dialog open={!!mode} onOpenChange={(open) => { if (!open) reset(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="capitalize">{mode} {wallet.asset_id}</DialogTitle>
          <DialogDescription>
            {mode === 'deposit'
              ? 'Generate or display the address to receive crypto into this wallet.'
              : 'Send funds from this wallet to an external address.'}
          </DialogDescription>
        </DialogHeader>

        {mode === 'deposit' ? (
          <div className="space-y-4">
            {!depositAddress ? (
              <>
                <div>
                  <Label>Optional fixed amount</Label>
                  <Input type="number" step="any" placeholder="Leave empty for open amount"
                    value={amount} onChange={(e) => setAmount(e.target.value)} />
                </div>
                <Button onClick={handleDeposit} disabled={deposit.isPending} className="w-full">
                  {deposit.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Generate deposit address
                </Button>
              </>
            ) : (
              <div className="space-y-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Send {wallet.asset_id} to</Label>
                  <div className="flex gap-2 mt-1">
                    <Input readOnly value={depositAddress} className="font-mono text-xs" />
                    <Button size="icon" variant="outline" onClick={() => copy(depositAddress)}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                {paymentUrl && (
                  <Button variant="outline" className="w-full gap-2" onClick={() => window.open(paymentUrl, '_blank')}>
                    Open payment page <ExternalLink className="h-4 w-4" />
                  </Button>
                )}
                <p className="text-xs text-muted-foreground">
                  Network: {wallet.network || 'unknown'}. Only send {wallet.asset_id} on this network.
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <Label>Amount ({wallet.asset_id})</Label>
              <Input type="number" step="any" value={amount} onChange={(e) => setAmount(e.target.value)} />
              <p className="text-xs text-muted-foreground mt-1">Available: {wallet.available}</p>
            </div>
            <div>
              <Label>Destination address</Label>
              <Input value={toAddress} onChange={(e) => setToAddress(e.target.value)}
                placeholder={`${wallet.network || ''} address`} className="font-mono text-xs" />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={reset}>Close</Button>
          {mode === 'withdraw' && (
            <Button onClick={handleWithdraw} disabled={withdraw.isPending}>
              {withdraw.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Withdraw
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
