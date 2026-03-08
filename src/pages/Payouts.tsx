import { AppLayout } from '@/components/AppLayout';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatDate } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

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

      <div className="flex items-center justify-center p-12 rounded-xl border border-border bg-card">
        <div className="text-center">
          <p className="text-muted-foreground mb-2">No payouts yet</p>
          <p className="text-sm text-muted-foreground">Create your first payout to withdraw funds</p>
        </div>
      </div>
    </AppLayout>
  );
}
