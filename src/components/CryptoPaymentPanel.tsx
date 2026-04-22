import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Bitcoin, Copy, Loader2, ExternalLink, CheckCircle2 } from 'lucide-react';

interface CryptoPaymentPanelProps {
  amount: number;
  currency: string;
  description?: string;
  /** optional invoice/checkout reference for tagging */
  reference?: string;
  /** Called once a payment has been confirmed (we poll for it). */
  onComplete?: (txId: string) => void;
}

const ASSETS = [
  { id: 'USDT.TRC20', label: 'USDT (Tron / TRC20)', network: 'TRC20' },
  { id: 'USDT.ERC20', label: 'USDT (Ethereum / ERC20)', network: 'ERC20' },
  { id: 'USDC.ERC20', label: 'USDC (Ethereum / ERC20)', network: 'ERC20' },
  { id: 'BTC', label: 'Bitcoin (BTC)', network: 'BITCOIN' },
  { id: 'ETH', label: 'Ethereum (ETH)', network: 'ETHEREUM' },
];

export function CryptoPaymentPanel({ amount, currency, description, reference, onComplete }: CryptoPaymentPanelProps) {
  const [assetId, setAssetId] = useState('USDT.TRC20');
  const [generating, setGenerating] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [txId, setTxId] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  // Reset when asset changes
  useEffect(() => {
    setAddress(null);
    setPaymentUrl(null);
    setTxId(null);
    setConfirmed(false);
  }, [assetId]);

  // Poll for payment confirmation
  useEffect(() => {
    if (!txId || confirmed) return;
    const id = setInterval(async () => {
      const { data } = await supabase
        .from('crypto_transactions' as any)
        .select('status')
        .eq('id', txId)
        .maybeSingle();
      if ((data as any)?.status === 'complete') {
        setConfirmed(true);
        onComplete?.(txId);
        toast.success('Crypto payment confirmed!');
      }
    }, 6000);
    return () => clearInterval(id);
  }, [txId, confirmed, onComplete]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      // Need any wallet for the receiving merchant. The hosted checkout/invoice
      // is typically opened anonymously, so this calls a public-safe edge endpoint
      // that resolves a wallet for the merchant context (deposit-address generator).
      const { data, error } = await supabase.functions.invoke('elektropay-wallet', {
        body: {
          action: 'create_deposit',
          payload: {
            asset_id: assetId,
            amount,
            currency,
            description: description || `Payment ${reference || ''}`.trim(),
          },
        },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Failed to generate address');
      setAddress(data.address || null);
      setPaymentUrl(data.payment_url || null);
      setTxId(data.data?.id || null);
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : 'Could not generate crypto address');
    } finally {
      setGenerating(false);
    }
  };

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  if (confirmed) {
    return (
      <div className="text-center py-6 space-y-3">
        <CheckCircle2 className="h-10 w-10 text-primary mx-auto" />
        <p className="text-sm font-medium text-foreground">Payment received</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label className="text-xs flex items-center gap-1.5">
          <Bitcoin className="h-3.5 w-3.5" /> Choose crypto asset
        </Label>
        <Select value={assetId} onValueChange={setAssetId}>
          <SelectTrigger className="bg-background border-border">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ASSETS.map((a) => (
              <SelectItem key={a.id} value={a.id}>{a.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!address ? (
        <Button type="button" onClick={handleGenerate} disabled={generating} className="w-full gap-2">
          {generating ? <><Loader2 className="h-4 w-4 animate-spin" /> Generating address…</> : <>Generate deposit address</>}
        </Button>
      ) : (
        <div className="space-y-3">
          <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Send exactly</span>
              <span className="text-xs font-mono font-semibold text-foreground">
                {amount.toFixed(2)} {currency} worth of {assetId}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <Input value={address} readOnly className="font-mono text-xs bg-background" />
              <Button type="button" size="icon" variant="outline" onClick={() => copy(address)}>
                <Copy className="h-3.5 w-3.5" />
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Network: {ASSETS.find(a => a.id === assetId)?.network}. Send only {assetId} to this address.
            </p>
          </div>
          {paymentUrl && (
            <a href={paymentUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-1.5 text-xs text-primary hover:underline">
              Open hosted payment page <ExternalLink className="h-3 w-3" />
            </a>
          )}
          <p className="text-[10px] text-center text-muted-foreground flex items-center justify-center gap-1">
            <Loader2 className="h-3 w-3 animate-spin" /> Waiting for blockchain confirmation…
          </p>
        </div>
      )}
    </div>
  );
}
