import { useState } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Currency } from '@/lib/types';
import { resolveProvider } from '@/lib/providers';
import { Badge } from '@/components/ui/badge';
import { CreditCard, ArrowRight, Shield } from 'lucide-react';
import { toast } from 'sonner';


export default function NewPayment() {
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<Currency>('USD');
  const [email, setEmail] = useState('');
  const [description, setDescription] = useState('');

  const selectedProvider = resolveProvider(currency);
  const idempotencyKey = `idk_${Date.now()}`;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success('Payment created', {
      description: `${amount} ${currency} via ${selectedProvider} — Key: ${idempotencyKey.slice(0, 16)}…`,
    });
  };

  return (
    <AppLayout>
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">Create Payment</h1>
        <p className="mt-1 text-sm text-muted-foreground">Route payment through optimal provider</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <form onSubmit={handleSubmit} className="lg:col-span-2 space-y-5 rounded-xl border border-border bg-card p-6 shadow-card">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Amount</Label>
              <Input
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="bg-background border-border font-mono text-lg"
                required
                min="0.01"
                step="0.01"
              />
            </div>
            <div className="space-y-2">
              <Label>Currency</Label>
              <Select value={currency} onValueChange={(v) => setCurrency(v as Currency)}>
                <SelectTrigger className="bg-background border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">🇺🇸 USD</SelectItem>
                  <SelectItem value="EUR">🇪🇺 EUR</SelectItem>
                  <SelectItem value="GBP">🇬🇧 GBP</SelectItem>
                  <SelectItem value="BRL">🇧🇷 BRL</SelectItem>
                  <SelectItem value="MXN">🇲🇽 MXN</SelectItem>
                  <SelectItem value="COP">🇨🇴 COP</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Customer Email</Label>
            <Input
              type="email"
              placeholder="customer@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-background border-border"
            />
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              placeholder="Payment description..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="bg-background border-border resize-none"
              rows={3}
            />
          </div>

          <Button type="submit" className="w-full gap-2" size="lg">
            <CreditCard className="h-4 w-4" />
            Create Payment
            <ArrowRight className="h-4 w-4" />
          </Button>
        </form>

        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-5 shadow-card">
            <h3 className="font-heading text-sm font-semibold text-foreground mb-3">Routing Preview</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Provider</span>
                <Badge variant="provider">{selectedProvider}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Currency</span>
                <span className="text-sm font-medium text-foreground">{currency}</span>
              </div>
              {['BRL', 'MXN', 'COP'].includes(currency) && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Settlement</span>
                  <span className="text-sm text-foreground">USD (auto-convert)</span>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-5 shadow-card">
            <div className="flex items-center gap-2 mb-3">
              <Shield className="h-4 w-4 text-primary" />
              <h3 className="font-heading text-sm font-semibold text-foreground">Idempotency</h3>
            </div>
            <p className="font-mono text-[10px] text-muted-foreground break-all">{idempotencyKey}</p>
            <p className="mt-2 text-xs text-muted-foreground">Prevents duplicate charges on retry</p>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
