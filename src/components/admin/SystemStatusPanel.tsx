// Live system-status panel rendered at the top of the AdminProcessors page.
// It calls the `system-status` edge function which probes:
//   - Shieldhub (primary 2D card MID)
//   - Open Banking (Mondo EU/UK)
//   - processor-routes edge function
//
// Each row shows reachability + latency + the most recent provider failure
// pulled from `provider_events`. The "View" link on a last-error opens the
// transaction detail drawer (or the audit-trail page when there's no tx id).

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Activity, AlertTriangle, CheckCircle2, ExternalLink, RefreshCw, XCircle } from "lucide-react";
import { Link } from "react-router-dom";

type ServiceStatus = "healthy" | "degraded" | "down";

interface ServiceResult {
  id: "shieldhub" | "open_banking" | "processor_routes";
  label: string;
  status: ServiceStatus;
  http_status: number | null;
  latency_ms: number | null;
  message: string;
  last_error?: {
    event_id: string;
    transaction_id: string | null;
    occurred_at: string;
    summary: string;
  } | null;
}

interface StatusPayload {
  checked_at: string;
  overall: ServiceStatus;
  services: ServiceResult[];
}

function statusBadge(status: ServiceStatus) {
  if (status === "healthy") {
    return (
      <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/20">
        <CheckCircle2 className="h-3 w-3 mr-1" /> Healthy
      </Badge>
    );
  }
  if (status === "degraded") {
    return (
      <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/30 hover:bg-amber-500/20">
        <AlertTriangle className="h-3 w-3 mr-1" /> Degraded
      </Badge>
    );
  }
  return (
    <Badge variant="destructive">
      <XCircle className="h-3 w-3 mr-1" /> Down
    </Badge>
  );
}

export function SystemStatusPanel() {
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery<StatusPayload>({
    queryKey: ["system-status"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("system-status");
      if (error) throw error;
      return data as StatusPayload;
    },
    // Poll every 60s so the panel stays fresh while admins are looking at it.
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  return (
    <Card className="mb-6">
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            System Status
          </CardTitle>
          <CardDescription>
            Live reachability of routing-critical processors and edge functions.
            {data?.checked_at && (
              <span className="ml-1 text-xs">
                · checked {new Date(data.checked_at).toLocaleTimeString()}
              </span>
            )}
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          {data?.overall && statusBadge(data.overall)}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => refetch()}
            disabled={isFetching}
            aria-label="Refresh status"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground py-2">Probing services…</p>
        ) : isError ? (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            Failed to fetch status: {(error as Error)?.message ?? "unknown error"}
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {data?.services.map((s) => (
              <li
                key={s.id}
                className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-2 sm:gap-4 items-start py-3 first:pt-0 last:pb-0"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm text-foreground">{s.label}</p>
                    {statusBadge(s.status)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{s.message}</p>
                  {s.last_error && (
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                      <span className="text-muted-foreground">Last error:</span>
                      <span className="text-destructive truncate max-w-[24rem]" title={s.last_error.summary}>
                        {s.last_error.summary}
                      </span>
                      <span className="text-muted-foreground">
                        ({new Date(s.last_error.occurred_at).toLocaleString()})
                      </span>
                      {s.last_error.transaction_id ? (
                        <Link
                          to={`/transactions?id=${s.last_error.transaction_id}`}
                          className="inline-flex items-center gap-1 text-primary hover:underline"
                        >
                          View transaction <ExternalLink className="h-3 w-3" />
                        </Link>
                      ) : (
                        <Link
                          to="/audit-trail"
                          className="inline-flex items-center gap-1 text-primary hover:underline"
                        >
                          View audit trail <ExternalLink className="h-3 w-3" />
                        </Link>
                      )}
                    </div>
                  )}
                </div>
                <div className="text-xs text-muted-foreground font-mono whitespace-nowrap">
                  {s.http_status !== null ? `HTTP ${s.http_status}` : "—"}
                </div>
                <div className="text-xs text-muted-foreground font-mono whitespace-nowrap">
                  {s.latency_ms !== null ? `${s.latency_ms}ms` : "—"}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
