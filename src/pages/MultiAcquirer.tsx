import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { GitBranch, Globe, Activity, ShieldCheck } from "lucide-react";

function useMultiAcquirerView() {
  return useQuery({
    queryKey: ["multi-acquirer-view"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { data: merchant } = await supabase
        .from("merchants").select("id").eq("user_id", user.id).maybeSingle();

      const [{ data: acquirers }, { data: mids }] = await Promise.all([
        (supabase.from as any)("acquirers").select("*").order("name"),
        merchant
          ? (supabase.from as any)("merchant_acquirer_mids")
              .select("*, acquirer:acquirers(name)")
              .eq("merchant_id", merchant.id)
          : Promise.resolve({ data: [] }),
      ]);

      const enabledIds = new Set((mids || []).filter((m: any) => m.active).map((m: any) => m.acquirer_id));
      return { acquirers: acquirers || [], enabledIds };
    },
  });
}

export default function MultiAcquirer() {
  const { data, isLoading } = useMultiAcquirerView();
  const acquirers = data?.acquirers || [];
  const enabledIds = data?.enabledIds || new Set();

  const enabledCount = acquirers.filter((a: any) => enabledIds.has(a.id)).length;
  const regions = new Set(acquirers.map((a: any) => a.country).filter(Boolean));

  return (
    <AppLayout>
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">Multi-Acquirer</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Acquiring banks and processors available on the platform, and which are enabled for your account.
        </p>
      </div>

      <Alert className="mb-6">
        <ShieldCheck className="h-4 w-4" />
        <AlertDescription>
          Acquirer assignments are managed by MzzPay. Contact support to enable additional acquirers.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10"><GitBranch className="h-5 w-5 text-primary" /></div>
              <div>
                <p className="text-sm text-muted-foreground">Enabled for You</p>
                <p className="text-2xl font-bold text-foreground">{enabledCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10"><Activity className="h-5 w-5 text-primary" /></div>
              <div>
                <p className="text-sm text-muted-foreground">Available</p>
                <p className="text-2xl font-bold text-foreground">{acquirers.filter((a: any) => a.active).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10"><Globe className="h-5 w-5 text-primary" /></div>
              <div>
                <p className="text-sm text-muted-foreground">Regions Covered</p>
                <p className="text-2xl font-bold text-foreground">{regions.size}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Available Acquirers</CardTitle>
          <CardDescription>The full catalog of acquiring connections supported by MzzPay.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground text-center py-6 text-sm">Loading…</p>
          ) : acquirers.length === 0 ? (
            <p className="text-muted-foreground text-center py-8 text-sm">No acquirers available yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Acquirer</TableHead>
                  <TableHead>Region</TableHead>
                  <TableHead className="text-right">Success Rate</TableHead>
                  <TableHead className="text-right">Avg. Latency</TableHead>
                  <TableHead>Platform Status</TableHead>
                  <TableHead>Your Account</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {acquirers.map((a: any) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{a.country || "Global"}</TableCell>
                    <TableCell className="text-right font-mono text-sm text-emerald-500">
                      {Number(a.success_rate || 0).toFixed(1)}%
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">{a.avg_latency_ms || 0}ms</TableCell>
                    <TableCell>
                      <Badge variant={a.active ? "default" : "secondary"}>
                        {a.active ? "Active" : "Standby"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {enabledIds.has(a.id) ? (
                        <Badge>Enabled</Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground">Not Enabled</Badge>
                      )}
                    </TableCell>
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
