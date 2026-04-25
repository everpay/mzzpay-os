import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RotateCcw, Mail, AlertCircle } from "lucide-react";
import { notifyError, notifySuccess } from "@/lib/error-toast";
import { format } from "date-fns";

type LogRow = {
  message_id: string | null;
  template_name: string | null;
  recipient_email: string | null;
  status: string;
  error_message: string | null;
  created_at: string;
};

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  sent: "default",
  pending: "secondary",
  failed: "destructive",
  dlq: "destructive",
  suppressed: "outline",
  rate_limited: "outline",
};

export default function AdminEmailLog() {
  const [rows, setRows] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    // Pull latest 200 rows then dedupe by message_id (latest status wins).
    const { data, error } = await supabase
      .from("email_send_log")
      .select("message_id, template_name, recipient_email, status, error_message, created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) {
      notifyError(error.message);
      setLoading(false);
      return;
    }
    setRows((data ?? []) as LogRow[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  // Dedupe by message_id keeping the newest row.
  const deduped = useMemo(() => {
    const seen = new Set<string>();
    const out: LogRow[] = [];
    for (const r of rows) {
      const key = r.message_id ?? `${r.recipient_email}-${r.created_at}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(r);
    }
    return out;
  }, [rows]);

  const handleRetry = async (row: LogRow) => {
    if (!row.message_id) return;
    setRetrying(row.message_id);
    try {
      const { data, error } = await supabase.functions.invoke("retry-auth-email", {
        body: { messageId: row.message_id },
      });
      if (error) throw error;
      if (data?.success) {
        notifySuccess("Email re-queued for delivery");
        await load();
      } else {
        notifyError(data?.error || "Retry failed");
      }
    } catch (e: any) {
      notifyError(e?.message || "Retry failed");
    } finally {
      setRetrying(null);
    }
  };

  const isAuthEmail = (templateName: string | null) =>
    templateName === "auth_emails" ||
    ["signup", "recovery", "magiclink", "invite", "email_change", "reauthentication"].includes(
      templateName ?? ""
    );

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center gap-3">
        <Mail className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Email delivery log</h1>
          <p className="text-sm text-muted-foreground">
            Most recent 200 emails. Failed auth emails can be re-queued from the dead-letter queue.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent activity</CardTitle>
          <CardDescription>
            Auth emails (signup, password reset, magic link) move to the DLQ after 5 failed attempts. Use Retry to push them back into the queue.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Loading…</p>
          ) : deduped.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No emails sent yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Template</TableHead>
                  <TableHead>Recipient</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>When</TableHead>
                  <TableHead>Error</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deduped.map((r) => {
                  const canRetry =
                    isAuthEmail(r.template_name) &&
                    ["failed", "dlq"].includes(r.status) &&
                    !!r.message_id;
                  return (
                    <TableRow key={`${r.message_id}-${r.created_at}`}>
                      <TableCell className="font-mono text-xs">{r.template_name ?? "—"}</TableCell>
                      <TableCell className="text-sm">{r.recipient_email ?? "—"}</TableCell>
                      <TableCell>
                        <Badge variant={STATUS_VARIANT[r.status] ?? "outline"}>{r.status}</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {format(new Date(r.created_at), "MMM d, HH:mm")}
                      </TableCell>
                      <TableCell className="text-xs text-destructive max-w-[260px] truncate" title={r.error_message ?? ""}>
                        {r.error_message ? (
                          <span className="inline-flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" />
                            {r.error_message}
                          </span>
                        ) : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        {canRetry ? (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={retrying === r.message_id}
                            onClick={() => handleRetry(r)}
                            className="gap-1"
                          >
                            <RotateCcw className="h-3 w-3" />
                            {retrying === r.message_id ? "Retrying…" : "Retry"}
                          </Button>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
