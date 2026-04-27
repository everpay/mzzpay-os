import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AlertTriangle, CheckCircle2, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { deriveBadge } from '@/lib/settlement-meta';

interface Props {
  /** raw `processor_raw_response` from the transaction row */
  raw: any;
  status?: string | null;
  className?: string;
}

/**
 * RisonpaySettlementBadge
 *
 * Reads the `_risonpay_meta` block written by `risonpay-webhook` and displays
 * the expected settlement date with an icon. The derivation logic is shared
 * with the webhook contract via `src/lib/settlement-meta.ts` and locked by
 * `settlement-meta.test.ts`.
 */
export function RisonpaySettlementBadge({ raw, status, className }: Props) {
  const meta = raw?._risonpay_meta;
  const kind = deriveBadge(raw, status);

  if (kind === 'missing') return null;

  if (kind === 'delayed' && !meta) {
    return (
      <Tip text="No settlement webhook received yet from RisonPay.">
        <Badge variant="outline" className={`gap-1 text-[10px] border-warning/40 text-warning ${className ?? ''}`}>
          <AlertTriangle className="h-3 w-3" />
          settlement pending
        </Badge>
      </Tip>
    );
  }

  const when = meta?.expected_settlement_at ? new Date(meta.expected_settlement_at) : null;

  if (kind === 'delayed') {
    return (
      <Tip text={`Expected by ${when ? format(when, 'MMM dd, HH:mm') : 'now'} — provider has not confirmed settlement.`}>
        <Badge variant="destructive" className={`gap-1 text-[10px] ${className ?? ''}`}>
          <AlertTriangle className="h-3 w-3" />
          settlement delayed
        </Badge>
      </Tip>
    );
  }

  if (kind === 'settled') {
    return (
      <Badge className={`gap-1 text-[10px] bg-success/10 text-success border-success/30 ${className ?? ''}`} variant="outline">
        <CheckCircle2 className="h-3 w-3" /> settled
      </Badge>
    );
  }

  return (
    <Tip text={when ? `Expected ${format(when, 'EEE, MMM dd HH:mm')}` : ''}>
      <Badge variant="outline" className={`gap-1 text-[10px] ${className ?? ''}`}>
        <Calendar className="h-3 w-3" />
        {when ? format(when, 'MMM dd') : 'scheduled'}
      </Badge>
    </Tip>
  );
}

function Tip({ text, children }: { text: string; children: React.ReactNode }) {
  if (!text) return <>{children}</>;
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent>{text}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
