import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, PlayCircle, CheckCircle2, XCircle } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

type CardTestRun = {
  id: string;
  batch_id: string;
  provider: 'matrix' | 'shieldhub';
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
  created_at: string;
};

interface Props {
  /** When true, render a denser variant suited to the dashboard. */
  compact?: boolean;
}

/**
 * CardTestResultsPanel — surfaces every documented test-card probe sent to
 * Matrix Partners (sandbox) and Shieldhub (production) via the
 * `card-test-runner` edge function. Used on the Dashboard and Transactions
 * pages so the merchant can see exactly which cards passed/failed against the
 * real processor portals.
 */
export function CardTestResultsPanel({ compact = false }: Props) {
  const [running, setRunning] = useState(false);

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

  const triggerRun = async () => {
    setRunning(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Sign in required');
      const res = await supabase.functions.invoke('card-test-runner', {
        body: { providers: ['matrix', 'shieldhub'], include_approved: false },
      });
      if (res.error) throw res.error;
      toast.success(`Card test battery completed — ${res.data?.passed ?? 0}/${res.data?.total ?? 0} passed`);
      await refetch();
    } catch (e: any) {
      toast.error(e?.message ?? 'Test run failed');
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
    <Card className="p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h3 className="font-heading text-lg font-bold text-foreground">Card test results</h3>
          <p className="text-xs text-muted-foreground">
            Documented test cards sent to Matrix Sandbox + Shieldhub Production
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
          documented test cards to Matrix Sandbox and Shieldhub Production.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-left text-muted-foreground">
              <tr>
                <th className="py-2 pr-3 font-medium">Provider</th>
                <th className="py-2 pr-3 font-medium">Scenario</th>
                <th className="py-2 pr-3 font-medium">Card</th>
                <th className="py-2 pr-3 font-medium">HTTP</th>
                <th className="py-2 pr-3 font-medium">Code</th>
                <th className="py-2 pr-3 font-medium">Status</th>
                <th className="py-2 pr-3 font-medium">When</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((r) => (
                <tr key={r.id} className="border-t border-border/50">
                  <td className="py-2 pr-3">
                    <Badge variant="secondary" className="text-[10px] capitalize">
                      {r.provider}·{r.environment}
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
