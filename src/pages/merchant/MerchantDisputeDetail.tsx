import { AppLayout } from '@/components/AppLayout';
import { ChargebackDetail } from '@/components/dispute/ChargebackDetail';

export default function MerchantDisputeDetail() {
  return (
    <AppLayout>
      <ChargebackDetail mode="merchant" />
    </AppLayout>
  );
}