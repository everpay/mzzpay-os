import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, PlayCircle, CheckCircle2, XCircle, Eye, ShieldCheck, Globe, Banknote, Radio } from 'lucide-react';
import { useEffect, useState } from 'react';
import { notifyError, notifySuccess } from '@/lib/error-toast';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDate } from '@/lib/format';
import { processorLabel } from '@/lib/processor-labels';
import { JsonViewer } from '@/components/JsonViewer';

type CardTestRun = {
  id: string;
  batch_id: string;
  provider: 'matrix' | 'shieldhub' | 'mzzpay';
  environment: 'sandbox' | 'production';
  scenario: string;
  card_last4: string | null;
  card_brand: string | null;
  currency: string | null;
  amount: number | null;
  upstream_http_status: number | null;
  result_status: string | null;
  result_code: string | null;
  error_message: string | null;
  raw_response: Record<string, unknown> | null;
  raw_request: Record<string, unknown> | null;
  created_at: string;
};

interface Props {
  /** When true, render a denser variant suited to the dashboard. */
  compact?: boolean;
}

/**
 * CardTestResultsPanel — surfaces every documented test-card probe sent to the
 * EU/International (Matrix sandbox) and US/International (Shieldhub
 * production) processors via the `card-test-runner` edge function. Used on
 * the Dashboard, Transactions, and Developer Settings pages so the merchant
 * can see exactly which cards passed/failed against the real processor
 * portals — and click into a row to inspect the raw provider envelope.
 */
export function CardTestResultsPanel({ compact = false }: Props) {
  const [running, setRunning] = useState(false);
  const [selected, setSelected] = useState<CardTestRun | null>(null);
  const [liveCount, setLiveCount] = useState(0);
  const queryClient = useQueryClient();

  const { data: runs = [], isLoading, refetch } = useQuery({
    queryKey: ['card-test-runs', compact],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('card_test_runs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(compact ? 8 : 50);
      if (error) throw error;
      return (data ?? []) as CardTestRun[];
    },
  });

  // Realtime: stream new probe rows into the table as the edge function
  // writes them, so the merchant sees Matrix H2H attempts arriving live
  // instead of having to refresh.
  useEffect(() => {
    const channel = supabase
      .channel('card-test-runs-live')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'card_test_runs' },
        () => {
          setLiveCount((c) => c + 1);
          queryClient.invalidateQueries({ queryKey: ['card-test-runs'] });
        },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'card_test_runs' },
        () => queryClient.invalidateQueries({ queryKey: ['card-test-runs'] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const triggerRun = async () => {
    setRunning(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        notifyError({ message: 'Sign in required' });
        return;
      }
      const res = await supabase.functions.invoke('card-test-runner', {
        body: { providers: ['matrix', 'shieldhub'], include_approved: false },
      });
      if (res.error) {
        // FunctionsHttpError: extract upstream JSON for human-readable copy
        let upstream: any = null;
        try { upstream = await (res.error as any).context?.json(); } catch { /* ignore */ }
        notifyError(upstream ?? res.error, {
          fallback: 'Card test runner failed. Check edge function logs.',
        });
        return;
      }
      notifySuccess(
        'Card test battery completed',
        `${res.data?.passed ?? 0} / ${res.data?.total ?? 0} probes passed.`,
      );
      await refetch();
    } catch (e) {
      notifyError(e);
    } finally {
      setRunning(false);
    }
  };

  const statusBadge = (r: CardTestRun) => {
    const s = (r.result_status ?? '').toLowerCase();
    const ok = s === 'approved' || s === 'redirect' || s === 'issued';
    const Icon = ok ? CheckCircle2 : XCircle;
    return (
      <Badge variant={ok ? 'default' : 'destructive'} className="gap-1 text-[10px]">
        <Icon className="h-3 w-3" />
        {r.result_status ?? 'n/a'}
      </Badge>
    );
  };

  return (
    <>
      <Card className="p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h3 className="font-heading text-lg font-bold text-foreground flex items-center gap-2">
              Card test results
              {liveCount > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-mono text-emerald-600 dark:text-emerald-400">
                  <Radio className="h-3 w-3 animate-pulse" />
                  live · {liveCount}
                </span>
              )}
            </h3>
            <p className="text-xs text-muted-foreground">
              Documented test cards sent to EU/International (Matrix sandbox H2H + hosted) + US/International (Shieldhub production)
            </p>
          </div>
          <Button size="sm" onClick={triggerRun} disabled={running} className="gap-2">
            {running ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PlayCircle className="h-3.5 w-3.5" />}
            Run battery
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading runs…
          </div>
        ) : runs.length === 0 ? (
          <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            No card test runs yet. Click <strong>Run battery</strong> to send the
            documented test cards to the live processor portals.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-left text-muted-foreground">
                <tr>
                  <th className="py-2 pr-3 font-medium">Processor</th>
                  <th className="py-2 pr-3 font-medium">Scenario</th>
                  <th className="py-2 pr-3 font-medium">Card</th>
                  <th className="py-2 pr-3 font-medium">HTTP</th>
                  <th className="py-2 pr-3 font-medium">Code</th>
                  <th className="py-2 pr-3 font-medium">Status</th>
                  <th className="py-2 pr-3 font-medium">When</th>
                  <th className="py-2 pr-3 font-medium" />
                </tr>
              </thead>
              <tbody>
                {runs.map((r) => (
                  <tr
                    key={r.id}
                    className="border-t border-border/50 hover:bg-muted/30 cursor-pointer"
                    onClick={() => setSelected(r)}
                  >
                    <td className="py-2 pr-3">
                      <Badge variant="secondary" className="text-[10px]">
                        {processorLabel(r.provider)} · {r.environment}
                      </Badge>
                    </td>
                    <td className="py-2 pr-3 text-foreground">{r.scenario}</td>
                    <td className="py-2 pr-3 font-mono text-muted-foreground">
                      {r.card_last4 ? `•••• ${r.card_last4}` : '—'}
                    </td>
                    <td className="py-2 pr-3 font-mono text-muted-foreground">{r.upstream_http_status ?? '—'}</td>
                    <td className="py-2 pr-3 font-mono text-muted-foreground">{r.result_code ?? '—'}</td>
                    <td className="py-2 pr-3">{statusBadge(r)}</td>
                    <td className="py-2 pr-3 text-muted-foreground">
                      {new Date(r.created_at).toLocaleTimeString()}
                    </td>
                    <td className="py-2 pr-3 text-muted-foreground">
                      <Eye className="h-3.5 w-3.5" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <CardTestRunDrawer run={selected} onClose={() => setSelected(null)} />
    </>
  );
}

/* ─────────────────────────── Detail drawer ─────────────────────────── */

function CardTestRunDrawer({
  run,
  onClose,
}: {
  run: CardTestRun | null;
  onClose: () => void;
}) {
  if (!run) return null;

  const isOk =
    ['approved', 'redirect', 'issued'].includes((run.result_status ?? '').toLowerCase());

  // Prefer the request payload captured server-side at probe time. Fall back
  // to a reconstructed shape for older rows that pre-date the `raw_request`
  // column.
  const requestPayload = run.raw_request ?? (() => {
    if (run.provider === 'matrix') {
      return {
        endpoint: 'POST https://api-sandbox.matrixpaysolution.com/v1/checkout/pay',
        order_id: `e2e_chk_*_${run.currency ?? ''}`,
        order_description: 'card-test-runner',
        amount: run.amount ?? 10,
        currency: run.currency ?? 'EUR',
        country: 'NL',
        language: 'EN',
        callback_url: 'https://example.com/cb',
      };
    }
    return {
      endpoint: 'POST https://pgw.shieldhubpay.com/api/transaction',
      amount: '10',
      currency: 'USD',
      transaction_reference: '<uuid>',
      customer: { first: 'Card', last: 'Test', email: 'card-test@everpay.io' },
      billing: { country: 'MX', city: 'New York', state: 'NY' },
      card: {
        number: `**** **** **** ${run.card_last4 ?? '****'}`,
        cvv: '***', expiry_month: '12', expiry_year: '30',
      },
    };
  })();

  // Lifecycle for THIS probe: initiated → upstream HTTP → final status
  const timeline: Array<{ label: string; state: 'done' | 'failed'; detail: string; icon: typeof Globe }> = [
    {
      label: 'Probe initiated',
      state: 'done',
      icon: Globe,
      detail: `${processorLabel(run.provider)} · ${run.environment}`,
    },
    {
      label: `Upstream HTTP ${run.upstream_http_status ?? 'n/a'}`,
      state: run.upstream_http_status && run.upstream_http_status < 500 ? 'done' : 'failed',
      icon: ShieldCheck,
      detail: run.upstream_http_status
        ? `${run.upstream_http_status} from processor`
        : 'No HTTP response (network error)',
    },
    {
      label: isOk ? `Result: ${run.result_status}` : `Result: ${run.result_status ?? 'failed'}`,
      state: isOk ? 'done' : 'failed',
      icon: Banknote,
      detail: run.error_message ?? `code=${run.result_code ?? '—'}`,
    },
  ];

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-hidden flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2 font-heading">
            {isOk
              ? <CheckCircle2 className="h-5 w-5 text-success" />
              : <XCircle className="h-5 w-5 text-destructive" />}
            {run.scenario}
          </SheetTitle>
          <SheetDescription>
            {processorLabel(run.provider)} · {run.environment} · {formatDate(run.created_at)}
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1 mt-4 pr-3">
          <div className="space-y-6 pb-6">
            {/* Status timeline */}
            <section>
              <h4 className="text-xs font-semibold uppercase text-muted-foreground tracking-wide mb-3">
                Status timeline
              </h4>
              <ol className="relative space-y-3">
                {timeline.map((step, i) => {
                  const Icon = step.icon;
                  return (
                    <li key={i} className="flex items-start gap-3">
                      <span
                        className={`flex h-7 w-7 items-center justify-center rounded-full border ${
                          step.state === 'done'
                            ? 'bg-success/15 text-success border-success/40'
                            : 'bg-destructive/15 text-destructive border-destructive/40'
                        }`}
                      >
                        <Icon className="h-3.5 w-3.5" />
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">{step.label}</p>
                        <p className="text-xs text-muted-foreground truncate">{step.detail}</p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </section>

            {/* Quick facts */}
            <section className="grid grid-cols-2 gap-3 text-xs">
              <Fact label="Run ID" value={run.id} mono />
              <Fact label="Batch" value={run.batch_id} mono />
              <Fact label="Card" value={run.card_last4 ? `•••• ${run.card_last4}` : '—'} mono />
              <Fact label="Brand" value={run.card_brand ?? '—'} />
              <Fact
                label="Amount"
                value={run.amount != null ? `${run.amount} ${run.currency ?? ''}`.trim() : '—'}
              />
              <Fact label="Code" value={run.result_code ?? '—'} mono />
            </section>

            {/* Raw provider request payload (PAN/CVV redacted) */}
            <JsonViewer
              label={run.raw_request ? 'Raw provider request' : 'Request payload (reconstructed)'}
              data={requestPayload}
            />

            {/* Raw provider response */}
            {run.raw_response ? (
              <JsonViewer label="Raw provider response" data={run.raw_response} />
            ) : (
              <section>
                <h4 className="text-xs font-semibold uppercase text-muted-foreground tracking-wide mb-2">
                  Raw provider response
                </h4>
                <p className="text-xs text-muted-foreground italic">
                  No raw response captured (network error before any body was returned).
                </p>
              </section>
            )}

            {run.error_message && (
              <section>
                <h4 className="text-xs font-semibold uppercase text-destructive tracking-wide mb-2">
                  Error message
                </h4>
                <p className="text-sm text-destructive">{run.error_message}</p>
              </section>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

function Fact({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-md border border-border bg-background p-2.5">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`text-foreground truncate ${mono ? 'font-mono text-[11px]' : ''}`}>{value}</p>
    </div>
  );
}
