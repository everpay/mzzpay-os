import { AppLayout } from '@/components/AppLayout';
import { DisputeTable } from '@/components/dispute/DisputeTable';
import { mockChargebacks, mockDisputes } from '@/lib/dispute-mock-data';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function MerchantDisputes() {
  const merchantCBs = mockChargebacks.filter(cb => cb.merchant_id === 'merch_001');
  const open = merchantCBs.filter(cb => !['won', 'lost'].includes(cb.status));
  const resolved = merchantCBs.filter(cb => ['won', 'lost'].includes(cb.status));

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">Disputes</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage and track your chargeback disputes</p>
        </div>

        <Tabs defaultValue="open">
          <TabsList>
            <TabsTrigger value="open">Open ({open.length})</TabsTrigger>
            <TabsTrigger value="resolved">Resolved ({resolved.length})</TabsTrigger>
            <TabsTrigger value="all">All ({merchantCBs.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="open" className="mt-4">
            <DisputeTable chargebacks={open} disputes={mockDisputes} basePath="/merchant/disputes" />
          </TabsContent>
          <TabsContent value="resolved" className="mt-4">
            <DisputeTable chargebacks={resolved} disputes={mockDisputes} basePath="/merchant/disputes" />
          </TabsContent>
          <TabsContent value="all" className="mt-4">
            <DisputeTable chargebacks={merchantCBs} disputes={mockDisputes} basePath="/merchant/disputes" />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}