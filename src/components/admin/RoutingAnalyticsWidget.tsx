// Lightweight routing-analytics widget for the admin processors page.
// Aggregates routing_rule coverage (provider × currency) and recent
// payment_attempts outcomes per provider — read-only, no mutations.
// Includes a time window selector (1h / 24h / 7d / 30d) for attempt outcomes.
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Activity, Target, AlertCircle } from "lucide-react";

type Rule = { target_provider: string; currency_match: string[] | null; active: boolean };
type Attempt = { provider: string; status: string; created_at: string };
type Window = "1h" | "24h" | "7d" | "30d";

const WINDOW_HOURS: Record<Window, number> = { "1h": 1, "24h": 24, "7d": 24 * 7, "30d": 24 * 30 };
const WINDOW_LABEL: Record<Window, string> = {
  "1h": "Last 1 hour",
  "24h": "Last 24 hours",
  "7d": "Last 7 days",
  "30d": "Last 30 days",
};

function useRoutingAnalytics(window: Window) {
  return useQuery({
    queryKey: ["admin-routing-analytics", window],
    queryFn: async () => {
      const cutoff = new Date(Date.now() - WINDOW_HOURS[window] * 3600_000).toISOString();
      const [{ data: rules }, { data: attempts }] = await Promise.all([
        (supabase.from as any)("routing_rules").select("target_provider, currency_match, active"),
        (supabase.from as any)("payment_attempts")
          .select("provider, status, created_at")
          .gte("created_at", cutoff)
          .order("created_at", { ascending: false })
          .limit(5000),
      ]);
      return { rules: (rules ?? []) as Rule[], attempts: (attempts ?? []) as Attempt[] };
    },
    refetchInterval: 30_000,
  });
}

export function RoutingAnalyticsWidget() {
  const [window, setWindow] = useState<Window>("24h");
  const { data, isLoading } = useRoutingAnalytics(window);
  const rules = data?.rules ?? [];
  const attempts = data?.attempts ?? [];

  const ruleMatrix = useMemo(() => {
    const m = new Map<string, Map<string, number>>();
    for (const r of rules) {
      if (!r.active) continue;
      const provider = r.target_provider || "—";
      const currencies = r.currency_match?.length ? r.currency_match : ["ANY"];
      const row = m.get(provider) ?? new Map<string, number>();
      for (const c of currencies) row.set(c, (row.get(c) ?? 0) + 1);
      m.set(provider, row);
    }
    return m;
  }, [rules]);

  const outcomes = useMemo(() => {
    const m = new Map<string, { success: number; failed: number; pending: number; total: number }>();
    for (const a of attempts) {
      const slot = m.get(a.provider) ?? { success: 0, failed: 0, pending: 0, total: 0 };
      slot.total++;
      if (a.status === "success" || a.status === "approved") slot.success++;
      else if (a.status === "failed" || a.status === "declined" || a.status === "error") slot.failed++;
      else slot.pending++;
      m.set(a.provider, slot);
    }
    return m;
  }, [attempts]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            <CardTitle className="text-base">Active Rule Coverage</CardTitle>
          </div>
          <CardDescription>Routing rules per provider and currency.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground py-4">Loading…</p>
          ) : ruleMatrix.size === 0 ? (
            <p className="text-sm text-muted-foreground py-4">No active routing rules.</p>
          ) : (
            <div className="space-y-3">
              {Array.from(ruleMatrix.entries()).map(([provider, row]) => (
                <div key={provider} className="flex items-center justify-between gap-3">
                  <Badge variant="outline" className="font-mono text-xs">{provider}</Badge>
                  <div className="flex flex-wrap gap-1 justify-end">
                    {Array.from(row.entries()).map(([cur, n]) => (
                      <Badge key={cur} variant="secondary" className="text-xs">
                        {cur} · {n}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              <CardTitle className="text-base">Recent Attempt Outcomes</CardTitle>
            </div>
            <Select value={window} onValueChange={(v) => setWindow(v as Window)}>
              <SelectTrigger className="h-7 w-[140px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(WINDOW_LABEL) as Window[]).map((k) => (
                  <SelectItem key={k} value={k} className="text-xs">{WINDOW_LABEL[k]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <CardDescription>Payment attempts grouped by provider — {WINDOW_LABEL[window].toLowerCase()}.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground py-4">Loading…</p>
          ) : outcomes.size === 0 ? (
            <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
              <AlertCircle className="h-4 w-4" />
              No payment attempts in the selected window.
            </div>
          ) : (
            <div className="space-y-2">
              {Array.from(outcomes.entries()).map(([provider, o]) => {
                const successPct = o.total ? Math.round((o.success / o.total) * 100) : 0;
                return (
                  <div key={provider} className="border border-border rounded-lg px-3 py-2">
                    <div className="flex items-center justify-between mb-1">
                      <Badge className="font-mono text-xs">{provider}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {o.total} attempts · <span className="text-emerald-500 font-medium">{successPct}% ok</span>
                      </span>
                    </div>
                    <div className="flex h-1.5 rounded overflow-hidden bg-muted">
                      <div className="bg-emerald-500" style={{ width: `${(o.success / o.total) * 100}%` }} />
                      <div className="bg-destructive" style={{ width: `${(o.failed / o.total) * 100}%` }} />
                      <div className="bg-amber-500" style={{ width: `${(o.pending / o.total) * 100}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
