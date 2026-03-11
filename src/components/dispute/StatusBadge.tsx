import { cn } from '@/lib/utils';
import type { ChargebackStatus } from '@/lib/dispute-types';

const statusConfig: Record<ChargebackStatus, { label: string; className: string }> = {
  chargeback_received: { label: 'Received', className: 'bg-warning/15 text-warning border-warning/20' },
  evidence_collected: { label: 'Evidence Ready', className: 'bg-primary/15 text-primary border-primary/20' },
  submitted: { label: 'Submitted', className: 'bg-primary/15 text-primary border-primary/20' },
  under_review: { label: 'Under Review', className: 'bg-warning/15 text-warning border-warning/20' },
  won: { label: 'Won', className: 'bg-success/15 text-success border-success/20' },
  lost: { label: 'Lost', className: 'bg-destructive/15 text-destructive border-destructive/20' },
};

export function StatusBadge({ status }: { status: ChargebackStatus }) {
  const config = statusConfig[status];
  return (
    <span className={cn(
      'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border',
      config.className
    )}>
      {config.label}
    </span>
  );
}