import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AlertTriangle, CheckCircle2, Scale, Loader2 } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { notifyError, notifySuccess } from "@/lib/error-toast";

interface DriftRow {
  account_id: string;
  merchant_id: string;
  currency: string;
  current_balance: number;
  ledger_sum: number;
  drift: number;
  has_drift: boolean;
  entry_count: number;
}

/**
 * Detects per-account drift between accounts.balance and the signed sum of
 * ledger_entries, and offers a one-click "Reconcile to ledger" action that
 * is always logged to audit_logs (action=balance_reconciled).
 *
 * The drift report is read-only over RLS; the reconcile mutation is invoked
 * via the `reconcile-balance` edge function which re-checks authorization
 * server-side (merchant-self-serve OR super_admin override).
 */
export function BalanceDriftPanel() {
  const qc = useQueryClient();
  const [confirm, setConfirm] = useState<DriftRow | null>(null);
  const [reason, setReason] = useState("");
  const [history, setHistory] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["balance-drift"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("reconcile-balance", {
        method: "GET" as never,
        body: undefined as never,
      });
      // functions.invoke may not pass action= for GET; fall back to direct fetch.
      if (error || !data) {
        const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
        const session = (await supabase.auth.getSession()).data.session;
        const res = await fetch(
          `https://${projectId}.supabase.co/functions/v1/reconcile-balance?action=drift`,
          { headers: { Authorization: `Bearer ${session?.access_token ?? ""}` } },
        );
        return (await res.json()) as { accounts: DriftRow[]; drift_count: number };
      }
      return data as { accounts: DriftRow[]; drift_count: number };
    },
  });

  const reconcile = useMutation({
    mutationFn: async ({ account_id, reason }: { account_id: string; reason: string }) => {
      const { data, error } = await supabase.functions.invoke("reconcile-balance", {
        body: { account_id, reason },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      return data;
    },
    onSuccess: (res: any) => {
      if (res.already_reconciled) {
        notifySuccess("Account already in sync — nothing to reconcile.");
      } else {
        notifySuccess(
          `Balance reconciled: ${formatCurrency(res.before.balance, res.currency)} → ${formatCurrency(res.after.balance, res.currency)}`,
        );
      }
      qc.invalidateQueries({ queryKey: ["balance-drift"] });
      qc.invalidateQueries({ queryKey: ["accounts"] });
      qc.invalidateQueries({ queryKey: ["reconciliation-audit"] });
      setConfirm(null);
      setReason("");
    },
    onError: (e) => notifyError(e, { fallback: "Reconciliation failed" }),
  });

  const auditQuery = useQuery({
    queryKey: ["reconciliation-audit"],
    enabled: history,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("id, created_at, entity_id, metadata, user_id")
        .eq("action", "balance_reconciled")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });

  const drifted = (data?.accounts ?? []).filter((a) => a.has_drift);
  const synced = (data?.accounts ?? []).filter((a) => !a.has_drift);

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Scale className="h-5 w-5" /> Balance Drift
          </CardTitle>
          <CardDescription>
            accounts.balance vs ledger_entries (credit − debit) per currency.
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="rounded-full" onClick={() => setHistory((v) => !v)}>
            {history ? "Hide" : "View"} audit
          </Button>
          <Button variant="outline" size="sm" className="rounded-full" onClick={() => refetch()}>
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <div className="flex flex-wrap gap-3 text-sm">
              <Badge variant={drifted.length > 0 ? "destructive" : "secondary"} className="gap-1">
                <AlertTriangle className="h-3 w-3" /> {drifted.length} drifted
              </Badge>
              <Badge variant="secondary" className="gap-1 bg-success/10 text-success border-success/20">
                <CheckCircle2 className="h-3 w-3" /> {synced.length} in sync
              </Badge>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Currency</TableHead>
                  <TableHead className="text-right">Stored balance</TableHead>
                  <TableHead className="text-right">Ledger sum</TableHead>
                  <TableHead className="text-right">Drift</TableHead>
                  <TableHead className="text-right">Entries</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data?.accounts ?? []).map((row) => (
                  <TableRow key={row.account_id} className={row.has_drift ? "bg-destructive/5" : ""}>
                    <TableCell className="font-medium">{row.currency}</TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(row.current_balance, row.currency as any)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(row.ledger_sum, row.currency as any)}
                    </TableCell>
                    <TableCell
                      className={`text-right font-mono ${row.has_drift ? "text-destructive" : "text-muted-foreground"}`}
                    >
                      {formatCurrency(row.drift, row.currency as any)}
                    </TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">
                      {row.entry_count}
                    </TableCell>
                    <TableCell className="text-right">
                      {row.has_drift ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-full"
                          onClick={() => setConfirm(row)}
                        >
                          Reconcile
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {!data?.accounts?.length && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-6">
                      No accounts found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>

            {history && (
              <div className="border-t pt-4">
                <p className="text-sm font-semibold mb-2">Reconciliation audit trail</p>
                {auditQuery.isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>When</TableHead>
                        <TableHead>Account</TableHead>
                        <TableHead className="text-right">Before</TableHead>
                        <TableHead className="text-right">After</TableHead>
                        <TableHead className="text-right">Drift</TableHead>
                        <TableHead>Reason</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(auditQuery.data ?? []).map((row: any) => {
                        const m = row.metadata || {};
                        return (
                          <TableRow key={row.id}>
                            <TableCell className="text-xs text-muted-foreground">
                              {new Date(row.created_at).toLocaleString()}
                            </TableCell>
                            <TableCell className="font-mono text-xs">
                              {m.currency} · {String(row.entity_id).slice(0, 8)}…
                            </TableCell>
                            <TableCell className="text-right font-mono text-xs">
                              {formatCurrency(m.before?.balance ?? 0, m.currency)}
                            </TableCell>
                            <TableCell className="text-right font-mono text-xs">
                              {formatCurrency(m.after?.balance ?? 0, m.currency)}
                            </TableCell>
                            <TableCell className="text-right font-mono text-xs text-destructive">
                              {formatCurrency(m.drift ?? 0, m.currency)}
                            </TableCell>
                            <TableCell className="text-xs">{m.reason || "—"}</TableCell>
                          </TableRow>
                        );
                      })}
                      {!auditQuery.data?.length && (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground py-4 text-xs">
                            No reconciliations yet.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                )}
              </div>
            )}
          </>
        )}
      </CardContent>

      <Dialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reconcile balance to ledger</DialogTitle>
            <DialogDescription>
              This will overwrite the stored balance with the signed sum of ledger entries.
              The change is irreversible and will be recorded in the audit trail.
            </DialogDescription>
          </DialogHeader>
          {confirm && (
            <div className="space-y-3 text-sm">
              <div className="rounded-lg border p-3 space-y-1 bg-muted/30">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Currency</span>
                  <span className="font-mono">{confirm.currency}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Stored balance</span>
                  <span className="font-mono">{formatCurrency(confirm.current_balance, confirm.currency as any)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Ledger sum</span>
                  <span className="font-mono">{formatCurrency(confirm.ledger_sum, confirm.currency as any)}</span>
                </div>
                <div className="flex justify-between border-t pt-1 mt-1">
                  <span className="font-semibold">New balance</span>
                  <span className="font-mono font-semibold">
                    {formatCurrency(confirm.ledger_sum, confirm.currency as any)}
                  </span>
                </div>
              </div>
              <div>
                <Label htmlFor="reconcile-reason">Reason (optional)</Label>
                <Textarea
                  id="reconcile-reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Investigated drift caused by missed webhook on 2026-04-26"
                  className="mt-1"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirm(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => confirm && reconcile.mutate({ account_id: confirm.account_id, reason })}
              disabled={reconcile.isPending}
            >
              {reconcile.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm reconcile"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
