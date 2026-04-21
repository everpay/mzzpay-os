import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/format";
import { Activity, DollarSign, GitBranch, Info, ShieldCheck } from "lucide-react";

function useProcessorRouting() {
  return useQuery({
    queryKey: ["processor-routing"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { data: merchant } = await supabase
        .from("merchants").select("id").eq("user_id", user.id).maybeSingle();
      if (!merchant) return { rules: [], feeProfiles: [], mids: [], merchantId: null };

      const [{ data: rules }, { data: feeProfiles }, { data: mids }] = await Promise.all([
        (supabase.from as any)("routing_rules")
          .select("*").eq("merchant_id", merchant.id).order("priority", { ascending: true }),
        (supabase.from as any)("processor_fee_profiles")
          .select("*").eq("merchant_id", merchant.id),
        (supabase.from as any)("merchant_acquirer_mids")
          .select("*, acquirer:acquirers(name, country, success_rate, avg_latency_ms, active)")
          .eq("merchant_id", merchant.id).order("priority", { ascending: true }),
      ]);

      return {
        rules: rules || [],
        feeProfiles: feeProfiles || [],
        mids: mids || [],
        merchantId: merchant.id,
      };
    },
  });
}

export default function ProcessorRouting() {
  const { data, isLoading } = useProcessorRouting();
  const rules = data?.rules || [];
  const feeProfiles = data?.feeProfiles || [];
  const mids = data?.mids || [];

  return (
    <AppLayout>
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">Processor Routing</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          View the routing rules, processor fee profiles, and acquiring connections assigned to your account.
        </p>
      </div>

      <Alert className="mb-6">
        <ShieldCheck className="h-4 w-4" />
        <AlertDescription>
          Routing configuration is managed by MzzPay. Contact support to request changes.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10"><GitBranch className="h-5 w-5 text-primary" /></div>
              <div>
                <p className="text-sm text-muted-foreground">Routing Rules</p>
                <p className="text-2xl font-bold text-foreground">{rules.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10"><Activity className="h-5 w-5 text-primary" /></div>
              <div>
                <p className="text-sm text-muted-foreground">Active Acquirers</p>
                <p className="text-2xl font-bold text-foreground">{mids.filter((m: any) => m.active).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10"><DollarSign className="h-5 w-5 text-primary" /></div>
              <div>
                <p className="text-sm text-muted-foreground">Fee Profiles</p>
                <p className="text-2xl font-bold text-foreground">{feeProfiles.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Routing Rules</CardTitle>
          <CardDescription>Active rules ordered by priority. Each transaction is matched in order.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground text-sm py-6 text-center">Loading…</p>
          ) : rules.length === 0 ? (
            <div className="py-8 text-center">
              <Info className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No custom routing rules. Default smart routing is active.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Priority</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Currencies</TableHead>
                  <TableHead>Amount Range</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>Fallback</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rules.map((rule: any) => (
                  <TableRow key={rule.id}>
                    <TableCell className="font-mono">{rule.priority}</TableCell>
                    <TableCell className="font-medium">{rule.name}</TableCell>
                    <TableCell>
                      {(rule.currency_match as string[])?.length > 0
                        ? (rule.currency_match as string[]).map((c) => (
                            <Badge key={c} variant="outline" className="mr-1 text-xs">{c}</Badge>
                          ))
                        : <span className="text-muted-foreground text-xs">All</span>}
                    </TableCell>
                    <TableCell className="text-xs">
                      {rule.amount_min || rule.amount_max
                        ? `${rule.amount_min || "0"} – ${rule.amount_max || "∞"}`
                        : "Any"}
                    </TableCell>
                    <TableCell><Badge>{rule.target_provider}</Badge></TableCell>
                    <TableCell>
                      {rule.fallback_provider ? <Badge variant="secondary">{rule.fallback_provider}</Badge> : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={rule.active ? "default" : "secondary"}>
                        {rule.active ? "Active" : "Disabled"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Connected Acquirers</CardTitle>
          <CardDescription>Acquiring banks and processors enabled for your account.</CardDescription>
        </CardHeader>
        <CardContent>
          {mids.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              No acquirers assigned yet. MzzPay's default routing is in use.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Acquirer</TableHead>
                  <TableHead>Region</TableHead>
                  <TableHead>MID</TableHead>
                  <TableHead className="text-right">Success Rate</TableHead>
                  <TableHead className="text-right">Avg. Latency</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mids.map((m: any) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">{m.acquirer?.name || "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{m.acquirer?.country || "Global"}</TableCell>
                    <TableCell className="font-mono text-xs">{m.mid}</TableCell>
                    <TableCell className="text-right font-mono text-sm text-emerald-500">
                      {Number(m.acquirer?.success_rate || 0).toFixed(1)}%
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {m.acquirer?.avg_latency_ms || 0}ms
                    </TableCell>
                    <TableCell>
                      <Badge variant={m.active ? "default" : "secondary"}>
                        {m.active ? "Active" : "Standby"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Processor Fee Profiles</CardTitle>
          <CardDescription>Fee structure per processor and currency assigned to your account.</CardDescription>
        </CardHeader>
        <CardContent>
          {feeProfiles.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              No custom fee profiles. Standard MzzPay rates apply.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Provider</TableHead>
                  <TableHead>Currency</TableHead>
                  <TableHead>% Fee</TableHead>
                  <TableHead>Fixed Fee</TableHead>
                  <TableHead>Chargeback Fee</TableHead>
                  <TableHead>Settlement</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {feeProfiles.map((fp: any) => (
                  <TableRow key={fp.id}>
                    <TableCell><Badge>{fp.provider}</Badge></TableCell>
                    <TableCell>{fp.currency}</TableCell>
                    <TableCell>{fp.percentage_fee}%</TableCell>
                    <TableCell>{formatCurrency(fp.fixed_fee, fp.currency)}</TableCell>
                    <TableCell>{formatCurrency(fp.chargeback_fee, fp.currency)}</TableCell>
                    <TableCell>{fp.settlement_days}d</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </AppLayout>
  );
}
