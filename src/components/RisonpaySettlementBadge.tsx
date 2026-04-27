import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AlertTriangle, Clock, CheckCircle2, Calendar } from 'lucide-react';
import { differenceInHours, format } from 'date-fns';

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
 * the expected settlement date with an icon. Falls back to a "delayed"
 * warning when the merchant should already have received funds but the
 * webhook never confirmed the settlement transition.
 */
export function RisonpaySettlementBadge({ raw, status, className }: Props) {
  const meta = raw?._risonpay_meta;

  // No webhook received yet for a completed-looking tx → flag as delayed.
  if (!meta && (status === 'completed' || status === 'processing')) {
    return (
      <Tip text="No settlement webhook received yet from RisonPay.">
        <Badge variant="outline" className={`gap-1 text-[10px] border-warning/40 text-warning ${className ?? ''}`}>
          <AlertTriangle className="h-3 w-3" />
          settlement pending
        </Badge>
      </Tip>
    );
  }
  if (!meta) return null;

  const when = meta.expected_settlement_at ? new Date(meta.expected_settlement_at) : null;
  const delayed = when && differenceInHours(new Date(), when) > 6 && meta.settlement_status !== 'settled';

  if (delayed) {
    return (
      <Tip text={`Expected by ${format(when!, 'MMM dd, HH:mm')} — provider has not confirmed settlement.`}>
        <Badge variant="destructive" className={`gap-1 text-[10px] ${className ?? ''}`}>
          <AlertTriangle className="h-3 w-3" />
          settlement delayed
        </Badge>
      </Tip>
    );
  }

  if (meta.settlement_status === 'settled') {
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
