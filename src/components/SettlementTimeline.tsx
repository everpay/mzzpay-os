import { Transaction } from '@/lib/types';
import { formatDate } from '@/lib/format';
import { CheckCircle2, Clock, ShieldCheck, Zap, Banknote, AlertTriangle } from 'lucide-react';

type ProviderEvent = {
  id: string;
  event_type: string;
  provider: string;
  created_at: string;
  payload?: any;
};

interface Props {
  transaction: Transaction;
  events: ProviderEvent[];
}

type Step = {
  key: string;
  label: string;
  at: string | null;
  state: 'done' | 'pending' | 'skipped' | 'failed';
  icon: typeof Zap;
  detail?: string;
};

/**
 * Settlement Timeline — visualises the lifecycle of a transaction across:
 *   1. Processing (transaction created)
 *   2. 3DS / Redirect (when present in provider_events)
 *   3. Provider confirmation (success/decline webhook)
 *   4. Ledger entry (settlement credit)
 */
export function SettlementTimeline({ transaction, events }: Props) {
  const sorted = [...events].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );

  const find = (matcher: (e: ProviderEvent) => boolean) => sorted.find(matcher);

  const created = { time: transaction.created_at };
  const threedsStepUp = find(e => /three_ds\.step_up_required|3ds.*step_up|acs/i.test(e.event_type));
  const threedsFallback = find(e => /three_ds\.fallback_2d|fallback_2d/i.test(e.event_type));
  const threedsRequested = find(e => /three_ds\.requested|3ds.*requested/i.test(e.event_type));
  const threeds = threedsStepUp ?? threedsFallback ?? threedsRequested ?? find(e => /3ds|redirect/i.test(e.event_type));
  const confirm = find(e =>
    /payment\.(completed|failed)|success|declined|error|approved/i.test(e.event_type),
  );
  const settled = find(e => /settled|payout|ledger/i.test(e.event_type));

  const isFailed = transaction.status === 'failed';
  const isCompleted = transaction.status === 'completed';

  // Pick a label/icon that matches the actual 3DS resolution.
  let threedsLabel = '3DS / redirect';
  let threedsDetail = threeds?.event_type;
  let threedsState: Step['state'] = threeds ? 'done' : 'skipped';
  let threedsIcon: typeof Zap = ShieldCheck;
  if (threedsStepUp) {
    threedsLabel = '3DS step-up required';
    threedsDetail = 'Issuer enrolled — customer redirected to ACS';
  } else if (threedsFallback) {
    threedsLabel = '3DS not enrolled — fell back to 2D';
    threedsDetail = 'Issuer not enrolled in 3DS · charge processed as 2D';
    threedsState = 'done';
    threedsIcon = AlertTriangle;
  } else if (threedsRequested) {
    threedsLabel = '3DS requested (enrolled)';
    threedsDetail = 'three_ds: enrolled — awaiting issuer response';
  }

  const steps: Step[] = [
    {
      key: 'processing',
      label: 'Processing initiated',
      at: created.time,
      state: 'done',
      icon: Zap,
      detail: `${transaction.provider} · ${transaction.currency}`,
    },
    {
      key: '3ds',
      label: threedsLabel,
      at: threeds?.created_at ?? null,
      state: threedsState,
      icon: threedsIcon,
      detail: threedsDetail,
    },
    {
      key: 'confirm',
      label: isFailed ? 'Provider declined' : 'Provider confirmed',
      at: confirm?.created_at ?? (isCompleted ? transaction.updated_at : null),
      state: isFailed ? 'failed' : confirm || isCompleted ? 'done' : 'pending',
      icon: isFailed ? AlertTriangle : CheckCircle2,
      detail: confirm?.event_type,
    },
    {
      key: 'settlement',
      label: 'Settlement / ledger credit',
      at: settled?.created_at ?? null,
      state: isFailed ? 'skipped' : settled ? 'done' : isCompleted ? 'pending' : 'pending',
      icon: Banknote,
      detail: settled?.event_type,
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
