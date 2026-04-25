// PSP Activity Feed — shows per-processor lifecycle steps (Matrix:
// project_details, customer_token_issued, pay_submitted, settlement updates;
// other processors: request.submitted, payment.approved/declined, three_ds.*).
// Reads from `provider_events` for the current merchant. Read-only.
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatRelativeTime } from "@/lib/format";
import { Activity, CheckCircle2, XCircle, Clock, AlertTriangle, Send, ShieldCheck, KeyRound } from "lucide-react";

type ProviderEventRow = {
  id: string;
  provider: string;
  event_type: string;
  payload: Record<string, any> | null;
  transaction_id: string | null;
  created_at: string;
};

type Provider = "all" | string;

function statusFromEvent(ev: ProviderEventRow): "ok" | "fail" | "pending" | "info" {
  const t = ev.event_type;
  if (t.endsWith(".approved") || t.endsWith(".token_issued") || t === "matrix.customer_token_issued" || t === "matrix.project_details") return "ok";
  if (t.endsWith(".declined") || t.endsWith(".validation_failed") || t.endsWith(".failed")) return "fail";
  if (t.endsWith(".processing") || t.endsWith(".pending") || t.endsWith(".submitted") || t.endsWith(".initiated") || t.endsWith(".polled")) return "pending";
  // matrix code-based fallback
  const code = ev.payload?.code;
  if (code === 0) return "ok";
  if (typeof code === "number" && code !== 0) return "fail";
  return "info";
}

function StepIcon({ kind }: { kind: ReturnType<typeof statusFromEvent> }) {
  const cls = "h-3.5 w-3.5";
  if (kind === "ok") return <CheckCircle2 className={`${cls} text-emerald-500`} />;
  if (kind === "fail") return <XCircle className={`${cls} text-destructive`} />;
  if (kind === "pending") return <Clock className={`${cls} text-amber-500`} />;
  return <Activity className={`${cls} text-muted-foreground`} />;
}

function eventLabel(ev: ProviderEventRow) {
  const map: Record<string, string> = {
    "matrix.project_details": "Project details fetched",
    "matrix.customer_token_issued": "Customer token issued",
    "matrix.pay_submitted": "Pay request submitted",
    "matrix.checkout_initiated": "Checkout link initiated",
    "matrix.refund_submitted": "Refund submitted",
    "matrix.payout_submitted": "Payout submitted",
    "matrix.status_polled": "Status polled",
    "request.submitted": "Request submitted",
    "request.validation_failed": "Validation failed",
    "payment.created": "Payment created",
    "payment.approved": "Payment approved",
    "payment.declined": "Payment declined",
    "payment.processing": "Payment processing",
    "payment.pending": "Payment pending",
    "three_ds.requested": "3DS requested",
    "three_ds.step_up_required": "3DS step-up required",
    "three_ds.fallback_2d": "3DS fallback to 2D",
  };
  return map[ev.event_type] ?? ev.event_type;
}

function eventCategoryIcon(ev: ProviderEventRow) {
  const t = ev.event_type;
  if (t.includes("token")) return <KeyRound className="h-3 w-3" />;
  if (t.includes("three_ds")) return <ShieldCheck className="h-3 w-3" />;
  if (t.includes("submitted") || t.includes("created")) return <Send className="h-3 w-3" />;
  if (t.includes("validation")) return <AlertTriangle className="h-3 w-3" />;
  return <Activity className="h-3 w-3" />;
}

function usePSPEvents(provider: Provider, limit = 100) {
  return useQuery({
    queryKey: ["psp-activity-feed", provider, limit],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [] as ProviderEventRow[];
      const { data: merchant } = await supabase
        .from("merchants").select("id").eq("user_id", user.id).maybeSingle();
      if (!merchant) return [] as ProviderEventRow[];
      let q: any = supabase
        .from("provider_events")
        .select("id, provider, event_type, payload, transaction_id, created_at")
        .eq("merchant_id", merchant.id)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (provider !== "all") q = q.eq("provider", provider);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as ProviderEventRow[];
    },
    refetchInterval: 15_000,
  });
}

export function PSPActivityFeed() {
  const [provider, setProvider] = useState<Provider>("all");
  const { data: events = [], isLoading } = usePSPEvents(provider);

  const providers = useMemo(() => {
    const s = new Set<string>(["matrix", "mzzpay", "mondo", "shieldhub", "moneto", "moneto_mpg", "stripe"]);
    events.forEach((e) => s.add(e.provider));
    return Array.from(s);
  }, [events]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            <CardTitle className="text-base">PSP Activity Feed</CardTitle>
          </div>
          <Select value={provider} onValueChange={(v) => setProvider(v as Provider)}>
            <SelectTrigger className="h-7 w-[160px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All processors</SelectItem>
              {providers.map((p) => (
                <SelectItem key={p} value={p} className="text-xs font-mono">{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <CardDescription>
          Live processor lifecycle: Matrix project lookup, customer token issuance, pay submissions, settlements, and validation rejections.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Loading processor events…</p>
        ) : events.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">No processor events yet.</p>
        ) : (
          <div className="max-h-[480px] overflow-y-auto pr-1">
            <ol className="relative border-l border-border ml-2 space-y-3">
              {events.map((ev) => {
                const kind = statusFromEvent(ev);
                const code = ev.payload?.code;
                const ref = ev.payload?.reference || ev.payload?.order_id || ev.payload?.provider_ref;
                const errMsg = ev.payload?.errors
                  ? (Array.isArray(ev.payload.errors)
                      ? ev.payload.errors.map((e: any) => `${e.field}: ${e.message}`).join("; ")
                      : null)
                  : (ev.payload?.error_message ?? null);
                return (
                  <li key={ev.id} className="ml-3">
                    <span className="absolute -left-[7px] mt-1.5 flex h-3 w-3 items-center justify-center rounded-full bg-card border border-border">
                      <StepIcon kind={kind} />
                    </span>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="font-mono text-[10px]">{ev.provider}</Badge>
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-foreground">
                        {eventCategoryIcon(ev)} {eventLabel(ev)}
                      </span>
                      {typeof code === "number" && (
                        <Badge variant="secondary" className="text-[10px]">code {code}</Badge>
                      )}
                      {ev.payload?.simulation && (
                        <Badge variant="secondary" className="text-[10px]">sim</Badge>
                      )}
                      <span className="ml-auto text-[10px] text-muted-foreground">
                        {formatRelativeTime(ev.created_at)}
                      </span>
                    </div>
                    <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                      {ref && <span className="font-mono">ref: {String(ref)}</span>}
                      {ev.transaction_id && <span className="font-mono">tx: {ev.transaction_id.slice(0, 8)}…</span>}
                      {ev.payload?.customer_token_present && <span>customer_token issued</span>}
                      {ev.payload?.settlement_amount != null && (
                        <span>
                          settlement: {Number(ev.payload.settlement_amount).toFixed(2)} {ev.payload?.settlement_currency ?? ""}
                        </span>
                      )}
                      {errMsg && <span className="text-destructive">{errMsg}</span>}
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
