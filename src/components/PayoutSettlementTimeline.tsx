import { formatDate } from '@/lib/format';
import {
  CheckCircle2, Clock, ShieldCheck, Banknote, AlertTriangle, ArrowUpRight,
} from 'lucide-react';

type ProviderEvent = {
  id: string;
  event_type: string;
  provider: string;
  created_at: string;
  payload?: any;
};

interface Payout {
  id: string;
  amount: number;
  currency: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string;
  updated_at?: string;
}

interface Props {
  payout: Payout;
  events: ProviderEvent[];
}

type Step = {
  key: string;
  label: string;
  at: string | null;
  state: 'done' | 'pending' | 'failed' | 'skipped';
  icon: typeof Clock;
  detail?: string;
};

/**
 * PayoutSettlementTimeline — visualises the lifecycle of a payout across:
 *   1. Processing (payout created)
 *   2. Provider confirmation (provider acknowledged the transfer)
 *   3. Settlement (funds reached the destination bank)
 *
 * Uses the same `provider_events` storage as `SettlementTimeline.tsx` for
 * card transactions. Events with `event_type` matching `payout.*confirmed`,
 * `transfer.confirmed`, `payout.settled`, etc. are picked up automatically.
 */
export function PayoutSettlementTimeline({ payout, events }: Props) {
  const sorted = [...events].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );
  const find = (matcher: (e: ProviderEvent) => boolean) => sorted.find(matcher);

  const confirm = find((e) =>
    /payout\.(confirmed|accepted|approved)|transfer\.(confirmed|accepted)|ack/i.test(
      e.event_type,
    ),
  );
  const settled = find((e) =>
    /payout\.(settled|completed|paid)|settled|funded|credited/i.test(e.event_type),
  );

  const isFailed = payout.status === 'failed';
  const isCompleted = payout.status === 'completed';
  const isProcessing = payout.status === 'processing' || payout.status === 'pending';

  const steps: Step[] = [
    {
      key: 'processing',
      label: 'Processing initiated',
      at: payout.created_at,
      state: 'done',
      icon: ArrowUpRight,
      detail: `${payout.amount} ${payout.currency}`,
    },
    {
      key: 'confirm',
      label: isFailed ? 'Provider rejected' : 'Provider confirmed',
      at: confirm?.created_at ?? null,
      state: isFailed
        ? 'failed'
        : confirm
          ? 'done'
          : isCompleted
            ? 'done'
            : 'pending',
      icon: isFailed ? AlertTriangle : ShieldCheck,
      detail: confirm?.event_type ?? (isProcessing ? 'Awaiting acknowledgement' : '—'),
    },
    {
      key: 'settlement',
      label: 'Settlement to bank',
      at: settled?.created_at ?? (isCompleted ? payout.updated_at ?? null : null),
      state: isFailed ? 'skipped' : settled || isCompleted ? 'done' : 'pending',
      icon: Banknote,
      detail:
        settled?.event_type ??
        (isCompleted ? 'Funds delivered' : 'Pending bank credit'),
    },
  ];

  return (
    <div className="space-y-3">
      <h4 className="font-heading text-sm font-semibold text-foreground flex items-center gap-2">
        <Clock className="h-4 w-4 text-primary" />
        Settlement Timeline
      </h4>
      <div className="rounded-lg border border-border bg-background p-4">
        <ol className="relative space-y-4">
          {steps.map((step, i) => {
            const Icon = step.icon;
            const dotColor =
              step.state === 'done'
                ? 'bg-success/15 text-success border-success/40'
                : step.state === 'failed'
                ? 'bg-destructive/15 text-destructive border-destructive/40'
                : step.state === 'skipped'
                ? 'bg-muted text-muted-foreground border-border'
                : 'bg-warning/15 text-warning border-warning/40';
            const lineColor =
              step.state === 'done' ? 'bg-success/40' : 'bg-border';
            return (
              <li key={step.key} className="flex items-start gap-3 relative">
                {i < steps.length - 1 && (
                  <span className={`absolute left-[14px] top-7 bottom-[-1rem] w-px ${lineColor}`} />
                )}
                <span
                  className={`relative z-10 flex h-7 w-7 items-center justify-center rounded-full border ${dotColor}`}
                >
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <div className="min-w-0 flex-1 pb-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-foreground">{step.label}</p>
                    <span className="text-[10px] uppercase font-mono text-muted-foreground">
                      {step.state}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 mt-0.5">
                    <p className="text-xs text-muted-foreground truncate">
                      {step.detail || '—'}
                    </p>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {step.at ? formatDate(step.at) : '—'}
                    </span>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
