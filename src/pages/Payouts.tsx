import { AppLayout } from '@/components/AppLayout';
import { mockPayouts } from '@/lib/mock-data';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatDate, getStatusVariant } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { ArrowUpRight, Plus } from 'lucide-react';

export default function Payouts() {
  return (
    <AppLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">Payouts</h1>
          <p className="mt-1 text-sm text-muted-foreground">Withdraw funds to your bank accounts</p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          New Payout
        </Button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">ID</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Amount</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Destination</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {mockPayouts.map((payout) => (
              <tr key={payout.id} className="transition-colors hover:bg-muted/30">
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{payout.id}</td>
                <td className="px-4 py-3 font-medium text-foreground">{formatCurrency(payout.amount, payout.currency)}</td>
                <td className="px-4 py-3">
                  <Badge variant={getStatusVariant(payout.status)}>{payout.status}</Badge>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{payout.destination}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(payout.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppLayout>
  );
}
