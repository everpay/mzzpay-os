import { useMemo, useRef, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2, GitBranch, DollarSign, Server, AlertTriangle } from "lucide-react";
import { RoutingAnalyticsWidget } from "@/components/admin/RoutingAnalyticsWidget";
import { SystemStatusPanel } from "@/components/admin/SystemStatusPanel";
import { validateRoutingRule } from "@/lib/routing-rules-validation";
import { notifyError, notifySuccess } from '@/lib/error-toast';

function useAdminData() {
  return useQuery({
    queryKey: ["admin-processors"],
    queryFn: async () => {
      const [
        { data: merchants },
        { data: acquirers },
        { data: mids },
        { data: rules },
        { data: feeProfiles },
      ] = await Promise.all([
        supabase.from("merchants").select("id, name, gambling_enabled").order("name"),
        (supabase.from as any)("acquirers").select("*").order("name"),
        (supabase.from as any)("merchant_acquirer_mids").select("*, acquirer:acquirers(name)"),
        (supabase.from as any)("routing_rules").select("*").order("priority"),
        (supabase.from as any)("processor_fee_profiles").select("*"),
      ]);
      return {
        merchants: merchants || [],
        acquirers: acquirers || [],
        mids: mids || [],
        rules: rules || [],
        feeProfiles: feeProfiles || [],
      };
    },
  });
}

export default function AdminProcessors() {
  const qc = useQueryClient();
  const { data, isLoading } = useAdminData();
  const merchants = data?.merchants || [];
  const acquirers = data?.acquirers || [];
  const mids = data?.mids || [];
  const rules = data?.rules || [];
  const feeProfiles = data?.feeProfiles || [];

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin-processors"] });

  // Inline error state per row — keyed by `${kind}:${id}`. Lets us render a
  // field-level message directly under the failing toggle instead of relying
  // only on toasts (which the admin may have dismissed).
  const [overrideErrors, setOverrideErrors] = useState<Record<string, string>>({});
  const setOverrideError = (key: string, msg: string | null) =>
    setOverrideErrors((prev) => {
      const next = { ...prev };
      if (msg) next[key] = msg;
      else delete next[key];
      return next;
    });

  // Toggle acquirer active — inline error if the update is rejected
  // (typically by RLS for non-admins, or a network failure).
  const toggleAcquirer = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { data, error } = await (supabase.from as any)("acquirers")
        .update({ active })
        .eq("id", id)
        .select("id")
        .single();
      if (error) throw error;
      // Server-side validation: the row must exist and have been updated.
      // RLS silently filtering us out returns a missing row, not an error.
      if (!data) throw new Error("Update was rejected by the server (insufficient permissions).");
    },
    onMutate: ({ id }) => setOverrideError(`acquirer:${id}`, null),
    onSuccess: (_d, vars) => { setOverrideError(`acquirer:${vars.id}`, null); notifySuccess("Acquirer updated"); invalidate(); },
    onError: (e: any, vars) => {
      setOverrideError(`acquirer:${vars.id}`, e?.message ?? "Update failed");
      notifyError(e.message);
    },
  });

  // Super-admin per-merchant Matrix (gambling) enable flag.
  // Matrix Partners is reserved for casino/lottery/sportsbook/sweepstakes
  // merchants. The toggle is RLS-gated to admins via the
  // "Admins can update merchants" policy added in 20260424_*.
  const toggleGambling = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      // Client-side validation — the only required input is a real merchant id.
      if (!id || typeof id !== "string") {
        throw new Error("Missing merchant id");
      }
      if (typeof enabled !== "boolean") {
        throw new Error("Toggle value must be true or false");
      }
      const { data, error } = await supabase
        .from("merchants")
        .update({ gambling_enabled: enabled })
        .eq("id", id)
        .select("id, gambling_enabled")
        .single();
      if (error) throw error;
      // Server-side enforcement check: if RLS blocked the write, .single()
      // returns null — convert that to a clear inline error.
      if (!data) {
        throw new Error("You do not have permission to change this merchant's routing.");
      }
      // Defensive: confirm the server actually persisted the requested value.
      if (data.gambling_enabled !== enabled) {
        throw new Error("Server rejected the override and reverted the value.");
      }
      return data;
    },
    onMutate: ({ id }) => setOverrideError(`gambling:${id}`, null),
    onSuccess: (_d, vars) => {
      setOverrideError(`gambling:${vars.id}`, null);
      notifySuccess(
        vars.enabled ? "Matrix enabled for merchant" : "Matrix disabled for merchant",
        vars.enabled
          ? "Gambling/casino card traffic will now route through Matrix Partners."
          : "Card traffic will fall back to the default Shieldhub MID.",
      );
      invalidate();
    },
    onError: (e: any, vars) => {
      setOverrideError(`gambling:${vars.id}`, e?.message ?? "Update failed");
      notifyError(e);
    },
  });

  // Assign MID — with client- + server-side validation. Errors are exposed
  // both via toast and via inline state so the dialog can show field-level
  // problems and a banner without forcing the admin to re-open the dialog.
  const [midDialog, setMidDialog] = useState(false);
  const [newMid, setNewMid] = useState({ merchant_id: "", acquirer_id: "", mid: "", priority: 1 });
  const [midFormError, setMidFormError] = useState<string | null>(null);

  const validateMidPayload = (m: typeof newMid): string | null => {
    if (!m.merchant_id) return "Merchant is required";
    if (!m.acquirer_id) return "Acquirer is required";
    const trimmed = (m.mid ?? "").trim();
    if (!trimmed) return "MID is required";
    if (trimmed.length < 3 || trimmed.length > 64) return "MID must be 3–64 characters";
    if (!/^[A-Za-z0-9_\-./]+$/.test(trimmed)) {
      return "MID may only contain letters, numbers, dashes, dots, slashes and underscores";
    }
    if (!Number.isFinite(Number(m.priority)) || Number(m.priority) < 0 || Number(m.priority) > 1000) {
      return "Priority must be between 0 and 1000";
    }
    return null;
  };

  const createMid = useMutation({
    mutationFn: async () => {
      const reason = validateMidPayload(newMid);
      if (reason) throw new Error(reason);
      const { data, error } = await (supabase.from as any)("merchant_acquirer_mids")
        .insert({ ...newMid, mid: newMid.mid.trim() })
        .select("id")
        .single();
      if (error) throw error;
      if (!data) throw new Error("Insert was rejected by the server.");
    },
    onMutate: () => setMidFormError(null),
    onSuccess: () => {
      setMidFormError(null);
      notifySuccess("Acquirer assigned to merchant");
      setMidDialog(false);
      setNewMid({ merchant_id: "", acquirer_id: "", mid: "", priority: 1 });
      invalidate();
    },
    onError: (e: any) => {
      setMidFormError(e?.message ?? "Failed to save assignment");
      notifyError(e.message);
    },
  });
  const deleteMid = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from as any)("merchant_acquirer_mids").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { notifySuccess("Removed"); invalidate(); },
    onError: (e: any) => notifyError(e.message),
  });

  // Routing rule — with inline conflict validation + per-submission idempotency key
  const [ruleDialog, setRuleDialog] = useState(false);
  const [newRule, setNewRule] = useState({
    merchant_id: "", name: "", priority: 0, target_provider: "", fallback_provider: "",
    amount_min: "" as string | number, amount_max: "" as string | number, currencies: "",
  });
  // A fresh idempotency key per dialog open — repeated clicks reuse it.
  const ruleIdemRef = useRef<string>(crypto.randomUUID());
  const resetRuleDialog = () => {
    setNewRule({ merchant_id: "", name: "", priority: 0, target_provider: "", fallback_provider: "", amount_min: "", amount_max: "", currencies: "" });
    ruleIdemRef.current = crypto.randomUUID();
  };

  const candidateRule = useMemo(() => ({
    merchant_id: newRule.merchant_id,
    priority: Number(newRule.priority) || 0,
    active: true,
    currency_match: newRule.currencies
      ? newRule.currencies.split(",").map((c) => c.trim().toUpperCase()).filter(Boolean)
      : [],
    amount_min: newRule.amount_min !== "" ? Number(newRule.amount_min) : null,
    amount_max: newRule.amount_max !== "" ? Number(newRule.amount_max) : null,
  }), [newRule]);
  const ruleValidation = useMemo(
    () => newRule.merchant_id ? validateRoutingRule(candidateRule, rules as any) : { ok: true as const },
    [candidateRule, rules, newRule.merchant_id],
  );

  const createRule = useMutation({
    mutationFn: async () => {
      const v = validateRoutingRule(candidateRule, rules as any);
      if (v.ok !== true) throw new Error((v as { reason: string }).reason);
      const payload: any = {
        merchant_id: newRule.merchant_id,
        name: newRule.name,
        priority: Number(newRule.priority) || 0,
        target_provider: newRule.target_provider,
        fallback_provider: newRule.fallback_provider || null,
        amount_min: candidateRule.amount_min,
        amount_max: candidateRule.amount_max,
        currency_match: candidateRule.currency_match,
        active: true,
        idempotency_key: ruleIdemRef.current,
      };
      const { data, error } = await (supabase.from as any)("routing_rules").insert(payload).select().single();
      if (error) {
        if (error.code === "23505") return { idempotent: true as const };
        throw error;
      }
      return { row: data };
    },
    // Optimistic insert: add a temp row to the cache immediately.
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: ["admin-processors"] });
      const prev = qc.getQueryData<any>(["admin-processors"]);
      const tempId = `temp-${crypto.randomUUID()}`;
      const optimistic = {
        id: tempId, ...candidateRule,
        name: newRule.name,
        target_provider: newRule.target_provider,
        fallback_provider: newRule.fallback_provider || null,
        idempotency_key: ruleIdemRef.current,
        __optimistic: true,
      };
      qc.setQueryData<any>(["admin-processors"], (old: any) =>
        old ? { ...old, rules: [...(old.rules || []), optimistic] } : old,
      );
      return { prev, tempId };
    },
    onError: (e: any, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(["admin-processors"], ctx.prev);
      notifyError(e.message);
    },
    onSuccess: (result, _vars, ctx) => {
      if (result && "idempotent" in result) {
        toast.info("Rule already saved (idempotent)");
        // Drop the optimistic row; real one is already on the server — refetch will reconcile.
        qc.setQueryData<any>(["admin-processors"], (old: any) =>
          old ? { ...old, rules: (old.rules || []).filter((r: any) => r.id !== ctx?.tempId) } : old,
        );
      } else if (result?.row) {
        // Replace the optimistic placeholder with the real row.
        qc.setQueryData<any>(["admin-processors"], (old: any) =>
          old ? { ...old, rules: (old.rules || []).map((r: any) => r.id === ctx?.tempId ? result.row : r) } : old,
        );
        notifySuccess("Routing rule added");
      }
      setRuleDialog(false);
      resetRuleDialog();
    },
    onSettled: () => invalidate(),
  });
  const deleteRule = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from as any)("routing_rules").delete().eq("id", id);
      if (error) throw error;
    },
    onMutate: async (id: string) => {
      await qc.cancelQueries({ queryKey: ["admin-processors"] });
      const prev = qc.getQueryData<any>(["admin-processors"]);
      qc.setQueryData<any>(["admin-processors"], (old: any) =>
        old ? { ...old, rules: (old.rules || []).filter((r: any) => r.id !== id) } : old,
      );
      return { prev };
    },
    onError: (e: any, _id, ctx) => {
      if (ctx?.prev) qc.setQueryData(["admin-processors"], ctx.prev);
      notifyError(e.message);
    },
    onSuccess: () => notifySuccess("Removed"),
    onSettled: () => invalidate(),
  });

  // Fee profile CRUD — with idempotency key on insert
  const [feeDialog, setFeeDialog] = useState(false);
  const [editingFee, setEditingFee] = useState<any>(null);
  const blankFee = {
    merchant_id: "", provider: "", currency: "USD",
    percentage_fee: 2.9, fixed_fee: 0.30, chargeback_fee: 15, refund_fee: 0, settlement_days: 2,
  };
  const [newFee, setNewFee] = useState<any>(blankFee);
  const feeIdemRef = useRef<string>(crypto.randomUUID());
  const saveFee = useMutation({
    mutationFn: async () => {
      const payload: any = {
        ...newFee,
        percentage_fee: Number(newFee.percentage_fee),
        fixed_fee: Number(newFee.fixed_fee),
        chargeback_fee: Number(newFee.chargeback_fee),
        refund_fee: Number(newFee.refund_fee),
        settlement_days: Number(newFee.settlement_days),
      };
      if (editingFee) {
        const { data, error } = await (supabase.from as any)("processor_fee_profiles").update(payload).eq("id", editingFee.id).select().single();
        if (error) throw error;
        return { row: data };
      }
      payload.idempotency_key = feeIdemRef.current;
      const { data, error } = await (supabase.from as any)("processor_fee_profiles").insert(payload).select().single();
      if (error) {
        if (error.code === "23505") return { idempotent: true as const };
        throw error;
      }
      return { row: data };
    },
    // Optimistic add or replace, with rollback on failure.
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: ["admin-processors"] });
      const prev = qc.getQueryData<any>(["admin-processors"]);
      const tempId = editingFee?.id ?? `temp-${crypto.randomUUID()}`;
      const optimistic = { id: tempId, ...newFee, __optimistic: true };
      qc.setQueryData<any>(["admin-processors"], (old: any) => {
        if (!old) return old;
        const list = old.feeProfiles || [];
        return {
          ...old,
          feeProfiles: editingFee
            ? list.map((f: any) => f.id === editingFee.id ? { ...f, ...optimistic, id: editingFee.id } : f)
            : [...list, optimistic],
        };
      });
      return { prev, tempId };
    },
    onError: (e: any, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["admin-processors"], ctx.prev);
      notifyError(e.message);
    },
    onSuccess: (result, _v, ctx) => {
      if (result && "idempotent" in result) {
        toast.info("Fee profile already saved (idempotent)");
        qc.setQueryData<any>(["admin-processors"], (old: any) =>
          old ? { ...old, feeProfiles: (old.feeProfiles || []).filter((f: any) => f.id !== ctx?.tempId) } : old,
        );
      } else if (result?.row) {
        qc.setQueryData<any>(["admin-processors"], (old: any) =>
          old ? { ...old, feeProfiles: (old.feeProfiles || []).map((f: any) => f.id === ctx?.tempId ? result.row : f) } : old,
        );
        notifySuccess(editingFee ? "Fee profile updated" : "Fee profile added");
      }
      setFeeDialog(false); setEditingFee(null); setNewFee(blankFee);
      feeIdemRef.current = crypto.randomUUID();
    },
    onSettled: () => invalidate(),
  });
  const deleteFee = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from as any)("processor_fee_profiles").delete().eq("id", id);
      if (error) throw error;
    },
    onMutate: async (id: string) => {
      await qc.cancelQueries({ queryKey: ["admin-processors"] });
      const prev = qc.getQueryData<any>(["admin-processors"]);
      qc.setQueryData<any>(["admin-processors"], (old: any) =>
        old ? { ...old, feeProfiles: (old.feeProfiles || []).filter((f: any) => f.id !== id) } : old,
      );
      return { prev };
    },
    onError: (e: any, _id, ctx) => {
      if (ctx?.prev) qc.setQueryData(["admin-processors"], ctx.prev);
      notifyError(e.message);
    },
    onSuccess: () => notifySuccess("Removed"),
    onSettled: () => invalidate(),
  });
  const openEditFee = (fp: any) => {
    setEditingFee(fp);
    setNewFee({
      merchant_id: fp.merchant_id, provider: fp.provider, currency: fp.currency,
      percentage_fee: fp.percentage_fee, fixed_fee: fp.fixed_fee, chargeback_fee: fp.chargeback_fee,
      refund_fee: fp.refund_fee, settlement_days: fp.settlement_days,
    });
    setFeeDialog(true);
  };

  return (
    <AppLayout>
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">Processor Routing — Admin</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage acquirers, assign processors to merchants, and configure routing rules.
        </p>
      </div>

      <SystemStatusPanel />

      <RoutingAnalyticsWidget />

      <Tabs defaultValue="acquirers" className="space-y-4">
        <TabsList>
          <TabsTrigger value="acquirers"><Server className="h-4 w-4 mr-2" />Acquirers</TabsTrigger>
          <TabsTrigger value="mids"><GitBranch className="h-4 w-4 mr-2" />Merchant Assignments</TabsTrigger>
          <TabsTrigger value="rules">Routing Rules</TabsTrigger>
          <TabsTrigger value="fees"><DollarSign className="h-4 w-4 mr-2" />Fee Profiles</TabsTrigger>
          <TabsTrigger value="gambling"><AlertTriangle className="h-4 w-4 mr-2" />Matrix · Gambling</TabsTrigger>
        </TabsList>

        <TabsContent value="acquirers">
          <Card>
            <CardHeader>
              <CardTitle>Acquirer Catalog</CardTitle>
              <CardDescription>Enable or disable acquirers globally on the platform.</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p className="text-sm text-muted-foreground py-6 text-center">Loading…</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Region</TableHead>
                      <TableHead className="text-right">Success Rate</TableHead>
                      <TableHead className="text-right">Latency</TableHead>
                      <TableHead>Active</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {acquirers.map((a: any) => (
                      <TableRow key={a.id}>
                        <TableCell className="font-medium">{a.name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{a.country || "Global"}</TableCell>
                        <TableCell className="text-right font-mono text-sm">{Number(a.success_rate || 0).toFixed(1)}%</TableCell>
                        <TableCell className="text-right font-mono text-sm">{a.avg_latency_ms || 0}ms</TableCell>
                        <TableCell>
                          <Switch checked={a.active} onCheckedChange={(v) => toggleAcquirer.mutate({ id: a.id, active: v })} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mids">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Merchant Acquirer Assignments</CardTitle>
                <CardDescription>Assign processors and MIDs to specific merchants.</CardDescription>
              </div>
              <Dialog open={midDialog} onOpenChange={setMidDialog}>
                <DialogTrigger asChild>
                  <Button size="sm"><Plus className="h-4 w-4 mr-1" />Assign</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Assign Acquirer to Merchant</DialogTitle></DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Merchant</Label>
                      <Select value={newMid.merchant_id} onValueChange={(v) => setNewMid({ ...newMid, merchant_id: v })}>
                        <SelectTrigger><SelectValue placeholder="Select merchant" /></SelectTrigger>
                        <SelectContent>
                          {merchants.map((m: any) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Acquirer</Label>
                      <Select value={newMid.acquirer_id} onValueChange={(v) => setNewMid({ ...newMid, acquirer_id: v })}>
                        <SelectTrigger><SelectValue placeholder="Select acquirer" /></SelectTrigger>
                        <SelectContent>
                          {acquirers.map((a: any) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>MID</Label>
                      <Input value={newMid.mid} onChange={(e) => setNewMid({ ...newMid, mid: e.target.value })} placeholder="merchant identifier" />
                    </div>
                    <div>
                      <Label>Priority</Label>
                      <Input type="number" value={newMid.priority} onChange={(e) => setNewMid({ ...newMid, priority: Number(e.target.value) })} />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={() => createMid.mutate()} disabled={!newMid.merchant_id || !newMid.acquirer_id || !newMid.mid}>Save</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Merchant</TableHead>
                    <TableHead>Acquirer</TableHead>
                    <TableHead>MID</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mids.map((m: any) => {
                    const merchant = merchants.find((x: any) => x.id === m.merchant_id);
                    return (
                      <TableRow key={m.id}>
                        <TableCell className="font-medium">{merchant?.name || m.merchant_id.slice(0, 8)}</TableCell>
                        <TableCell>{m.acquirer?.name || "—"}</TableCell>
                        <TableCell className="font-mono text-xs">{m.mid}</TableCell>
                        <TableCell>{m.priority}</TableCell>
                        <TableCell><Badge variant={m.active ? "default" : "secondary"}>{m.active ? "Active" : "Off"}</Badge></TableCell>
                        <TableCell>
                          <Button size="icon" variant="ghost" onClick={() => deleteMid.mutate(m.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {mids.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">No assignments yet</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rules">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Routing Rules</CardTitle>
                <CardDescription>Per-merchant routing logic by currency and amount.</CardDescription>
              </div>
              <Dialog open={ruleDialog} onOpenChange={(o) => { setRuleDialog(o); if (!o) resetRuleDialog(); }}>
                <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />New Rule</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>New Routing Rule</DialogTitle></DialogHeader>
                  <div className="space-y-3">
                    <div>
                      <Label>Merchant</Label>
                      <Select value={newRule.merchant_id} onValueChange={(v) => setNewRule({ ...newRule, merchant_id: v })}>
                        <SelectTrigger><SelectValue placeholder="Select merchant" /></SelectTrigger>
                        <SelectContent>{merchants.map((m: any) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Name</Label>
                      <Input value={newRule.name} onChange={(e) => setNewRule({ ...newRule, name: e.target.value })} placeholder="EU cards → MzzPay EUR" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Priority</Label>
                        <Input type="number" value={newRule.priority} onChange={(e) => setNewRule({ ...newRule, priority: Number(e.target.value) })} />
                      </div>
                      <div>
                        <Label>Currencies (comma-separated)</Label>
                        <Input value={newRule.currencies} onChange={(e) => setNewRule({ ...newRule, currencies: e.target.value })} placeholder="EUR, GBP" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Min amount</Label>
                        <Input type="number" value={newRule.amount_min} onChange={(e) => setNewRule({ ...newRule, amount_min: e.target.value })} />
                      </div>
                      <div>
                        <Label>Max amount</Label>
                        <Input type="number" value={newRule.amount_max} onChange={(e) => setNewRule({ ...newRule, amount_max: e.target.value })} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Target provider</Label>
                        <Input value={newRule.target_provider} onChange={(e) => setNewRule({ ...newRule, target_provider: e.target.value })} placeholder="mzzpay_eur" />
                      </div>
                      <div>
                        <Label>Fallback provider</Label>
                        <Input value={newRule.fallback_provider} onChange={(e) => setNewRule({ ...newRule, fallback_provider: e.target.value })} placeholder="matrix" />
                      </div>
                    </div>
                  </div>
                  {newRule.merchant_id && ruleValidation.ok !== true && (
                    <Alert variant="destructive" className="mt-2">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>{(ruleValidation as { reason: string }).reason}</AlertDescription>
                    </Alert>
                  )}
                  <DialogFooter>
                    <Button
                      onClick={() => createRule.mutate()}
                      disabled={
                        !newRule.merchant_id ||
                        !newRule.name ||
                        !newRule.target_provider ||
                        ruleValidation.ok !== true ||
                        createRule.isPending
                      }
                    >
                      Save
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Merchant</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Currencies</TableHead>
                    <TableHead>Target</TableHead>
                    <TableHead>Fallback</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rules.map((r: any) => {
                    const merchant = merchants.find((x: any) => x.id === r.merchant_id);
                    return (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium">{merchant?.name || r.merchant_id.slice(0, 8)}</TableCell>
                        <TableCell>{r.name}</TableCell>
                        <TableCell className="font-mono">{r.priority}</TableCell>
                        <TableCell className="text-xs">{(r.currency_match || []).join(", ") || "All"}</TableCell>
                        <TableCell><Badge>{r.target_provider}</Badge></TableCell>
                        <TableCell>{r.fallback_provider ? <Badge variant="secondary">{r.fallback_provider}</Badge> : "—"}</TableCell>
                        <TableCell>
                          <Button size="icon" variant="ghost" onClick={() => deleteRule.mutate(r.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {rules.length === 0 && (
                    <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-6">No rules yet</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fees">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Processor Fee Profiles</CardTitle>
                <CardDescription>Per-merchant fee schedules used by the pricing engine.</CardDescription>
              </div>
              <Dialog open={feeDialog} onOpenChange={(o) => { setFeeDialog(o); if (!o) { setEditingFee(null); setNewFee(blankFee); } }}>
                <DialogTrigger asChild>
                  <Button size="sm" onClick={() => { setEditingFee(null); setNewFee(blankFee); }}>
                    <Plus className="h-4 w-4 mr-1" />New Fee Profile
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>{editingFee ? "Edit" : "New"} Fee Profile</DialogTitle></DialogHeader>
                  <div className="space-y-3">
                    <div>
                      <Label>Merchant</Label>
                      <Select value={newFee.merchant_id} onValueChange={(v) => setNewFee({ ...newFee, merchant_id: v })}>
                        <SelectTrigger><SelectValue placeholder="Select merchant" /></SelectTrigger>
                        <SelectContent>{merchants.map((m: any) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Provider</Label>
                        <Input value={newFee.provider} onChange={(e) => setNewFee({ ...newFee, provider: e.target.value })} placeholder="smartfastpay" />
                      </div>
                      <div>
                        <Label>Currency</Label>
                        <Input value={newFee.currency} onChange={(e) => setNewFee({ ...newFee, currency: e.target.value.toUpperCase() })} maxLength={3} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Percentage fee (%)</Label>
                        <Input type="number" step="0.01" value={newFee.percentage_fee} onChange={(e) => setNewFee({ ...newFee, percentage_fee: e.target.value })} />
                      </div>
                      <div>
                        <Label>Fixed fee</Label>
                        <Input type="number" step="0.01" value={newFee.fixed_fee} onChange={(e) => setNewFee({ ...newFee, fixed_fee: e.target.value })} />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <Label>Chargeback fee</Label>
                        <Input type="number" step="0.01" value={newFee.chargeback_fee} onChange={(e) => setNewFee({ ...newFee, chargeback_fee: e.target.value })} />
                      </div>
                      <div>
                        <Label>Refund fee</Label>
                        <Input type="number" step="0.01" value={newFee.refund_fee} onChange={(e) => setNewFee({ ...newFee, refund_fee: e.target.value })} />
                      </div>
                      <div>
                        <Label>Settlement (days)</Label>
                        <Input type="number" value={newFee.settlement_days} onChange={(e) => setNewFee({ ...newFee, settlement_days: e.target.value })} />
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={() => saveFee.mutate()} disabled={!newFee.merchant_id || !newFee.provider || !newFee.currency}>
                      {editingFee ? "Save changes" : "Create"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Merchant</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead>Currency</TableHead>
                    <TableHead>%</TableHead>
                    <TableHead>Fixed</TableHead>
                    <TableHead>Chargeback</TableHead>
                    <TableHead>Settlement</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {feeProfiles.map((fp: any) => {
                    const merchant = merchants.find((x: any) => x.id === fp.merchant_id);
                    return (
                      <TableRow key={fp.id}>
                        <TableCell className="font-medium">{merchant?.name || fp.merchant_id.slice(0, 8)}</TableCell>
                        <TableCell><Badge>{fp.provider}</Badge></TableCell>
                        <TableCell>{fp.currency}</TableCell>
                        <TableCell>{fp.percentage_fee}%</TableCell>
                        <TableCell>{fp.fixed_fee}</TableCell>
                        <TableCell>{fp.chargeback_fee}</TableCell>
                        <TableCell>{fp.settlement_days}d</TableCell>
                        <TableCell className="flex gap-1">
                          <Button size="sm" variant="ghost" onClick={() => openEditFee(fp)}>Edit</Button>
                          <Button size="icon" variant="ghost" onClick={() => deleteFee.mutate(fp.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {feeProfiles.length === 0 && (
                    <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-6">No fee profiles yet</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="gambling">
          <Card>
            <CardHeader>
              <CardTitle>Matrix Partners — Gambling Enablement</CardTitle>
              <CardDescription>
                Matrix Partners is reserved for online casino, lottery, betting,
                sweepstakes, sportsbook and other gambling-class merchants.
                Toggle a merchant on to route their card traffic through Matrix;
                otherwise traffic falls back to the default Shieldhub MID.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p className="text-sm text-muted-foreground py-6 text-center">Loading…</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Merchant</TableHead>
                      <TableHead>Routing</TableHead>
                      <TableHead className="text-right">Matrix enabled</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {merchants.map((m: any) => (
                      <TableRow key={m.id}>
                        <TableCell className="font-medium">{m.name}</TableCell>
                        <TableCell>
                          <Badge variant={m.gambling_enabled ? "default" : "secondary"}>
                            {m.gambling_enabled ? "Matrix Partners" : "Shieldhub (default)"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Switch
                            checked={!!m.gambling_enabled}
                            onCheckedChange={(v) =>
                              toggleGambling.mutate({ id: m.id, enabled: v })
                            }
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                    {merchants.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-muted-foreground py-6">
                          No merchants
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
}
