import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Copy,
  Check,
  RefreshCw,
  AlertTriangle,
  ShieldCheck,
  Mail,
  Info,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type ExpectedRecord = {
  type: "MX" | "TXT" | "CNAME";
  host: string;
  value: string;
  priority?: number;
  label: string;
};

type CheckResult = ExpectedRecord & {
  live: string[];
  ok: boolean;
  detail: string;
};

type Conflict = { host: string; type: string; data: string; reason: string };

type ValidationResponse = {
  subdomain: string;
  summary: { total: number; verified: number; pending: number; conflicts: number };
  checks: CheckResult[];
  conflicts: Conflict[];
  expected: ExpectedRecord[];
};

const buildBundle = (fqdn: string): ExpectedRecord[] => [
  { type: "MX", host: fqdn, value: "feedback-smtp.us-east-1.amazonses.com", priority: 10, label: "Inbound mail (MX)" },
  { type: "TXT", host: fqdn, value: "v=spf1 include:amazonses.com ~all", label: "SPF authorization (TXT)" },
  { type: "TXT", host: `_dmarc.${fqdn}`, value: "v=DMARC1; p=none;", label: "DMARC policy (TXT)" },
  { type: "CNAME", host: `resend._domainkey.${fqdn}`, value: "resend._domainkey.lovable.cloud", label: "DKIM signing key (CNAME)" },
  { type: "CNAME", host: `send.${fqdn}`, value: "send.lovable.cloud", label: "Tracking host (CNAME)" },
];

// Hostinger expects "Name" relative to the root zone (no trailing root domain).
const hostinger = (host: string, root: string) => {
  if (host === root) return "@-equivalent: leave the Name as the subdomain prefix only";
  return host.endsWith(`.${root}`) ? host.slice(0, -1 - root.length) : host;
};

const CopyBtn = ({ value }: { value: string }) => {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-7 px-2"
      onClick={() => {
        navigator.clipboard.writeText(value);
        setCopied(true);
        toast.success("Copied");
        setTimeout(() => setCopied(false), 1200);
      }}
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
    </Button>
  );
};

const RecordTable = ({ records, root }: { records: ExpectedRecord[]; root: string }) => (
  <div className="rounded-xl border overflow-hidden">
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[80px]">Type</TableHead>
          <TableHead>Name (Hostinger)</TableHead>
          <TableHead>Value / Points to</TableHead>
          <TableHead className="w-[100px]">Priority</TableHead>
          <TableHead className="w-[60px] text-right">Copy</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {records.map((r) => {
          const name = hostinger(r.host, root);
          return (
            <TableRow key={`${r.type}-${r.host}`}>
              <TableCell>
                <Badge variant="outline" className="font-mono text-xs">{r.type}</Badge>
              </TableCell>
              <TableCell className="font-mono text-xs">{name}</TableCell>
              <TableCell className="font-mono text-xs break-all">{r.value}</TableCell>
              <TableCell className="font-mono text-xs">{r.priority ?? "—"}</TableCell>
              <TableCell className="text-right">
                <CopyBtn value={r.value} />
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  </div>
);

const bundleAsText = (records: ExpectedRecord[], root: string) =>
  records
    .map((r) => {
      const name = hostinger(r.host, root);
      const prio = r.priority !== undefined ? `\tpriority=${r.priority}` : "";
      return `${r.type}\t${name}\t${r.value}${prio}`;
    })
    .join("\n");

export default function EmailDnsBundle() {
  const [subdomain, setSubdomain] = useState("notify.mzzpay.io");
  const [validating, setValidating] = useState(false);
  const [result, setResult] = useState<ValidationResponse | null>(null);

  const root = subdomain.split(".").slice(-2).join(".");
  const records = buildBundle(subdomain.trim().toLowerCase().replace(/\.$/, ""));

  const validate = async () => {
    setValidating(true);
    try {
      const { data, error } = await supabase.functions.invoke<ValidationResponse>("dns-validate", {
        body: { subdomain },
      });
      if (error) throw error;
      setResult(data ?? null);
      toast.success("DNS check complete");
    } catch (e) {
      toast.error("DNS check failed", { description: String(e) });
    } finally {
      setValidating(false);
    }
  };

  const copyAll = () => {
    navigator.clipboard.writeText(bundleAsText(records, root));
    toast.success("Full bundle copied");
  };

  return (
    <AppLayout>
      <div className="container mx-auto max-w-5xl py-8 space-y-8">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            <h1 className="font-display text-3xl font-bold tracking-tight">Email DNS Bundle</h1>
          </div>
          <p className="text-muted-foreground">
            Copy-paste the MX, TXT, and CNAME records below into Hostinger DNS, then run validation
            to confirm everything is correct and flag conflicting records.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Sender subdomain</CardTitle>
            <CardDescription>
              The subdomain your emails will be sent from. Records are generated against this value.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="subdomain">Subdomain (FQDN)</Label>
              <div className="flex gap-2">
                <Input
                  id="subdomain"
                  value={subdomain}
                  onChange={(e) => setSubdomain(e.target.value)}
                  placeholder="notify.yourdomain.com"
                  className="font-mono"
                />
                <Button onClick={copyAll} variant="secondary">
                  <Copy className="h-4 w-4 mr-2" /> Copy bundle
                </Button>
                <Button onClick={validate} disabled={validating || !subdomain}>
                  {validating ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <ShieldCheck className="h-4 w-4 mr-2" />
                  )}
                  Validate DNS
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="bundle" className="w-full">
          <TabsList>
            <TabsTrigger value="bundle">DNS Bundle</TabsTrigger>
            <TabsTrigger value="validation">
              Validation
              {result && (
                <Badge variant="secondary" className="ml-2">
                  {result.summary.verified}/{result.summary.total}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="raw">Raw text</TabsTrigger>
          </TabsList>

          <TabsContent value="bundle" className="space-y-4 pt-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>Hostinger tip</AlertTitle>
              <AlertDescription>
                In Hostinger's "Name" field, enter only the prefix shown below — Hostinger
                automatically appends <span className="font-mono">.{root}</span>. Do not add NS
                records; Hostinger doesn't support NS delegation on subdomains.
              </AlertDescription>
            </Alert>
            <RecordTable records={records} root={root} />
          </TabsContent>

          <TabsContent value="validation" className="space-y-4 pt-4">
            {!result && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>No validation run yet</AlertTitle>
                <AlertDescription>
                  Click <strong>Validate DNS</strong> above to query the live records for{" "}
                  <span className="font-mono">{subdomain}</span> and check for conflicts.
                </AlertDescription>
              </Alert>
            )}

            {result && (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Card>
                    <CardContent className="pt-6">
                      <p className="text-xs text-muted-foreground">Expected</p>
                      <p className="text-2xl font-bold">{result.summary.total}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <p className="text-xs text-muted-foreground">Verified</p>
                      <p className="text-2xl font-bold text-primary">{result.summary.verified}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <p className="text-xs text-muted-foreground">Pending</p>
                      <p className="text-2xl font-bold text-amber-500">{result.summary.pending}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <p className="text-xs text-muted-foreground">Conflicts</p>
                      <p className="text-2xl font-bold text-destructive">
                        {result.summary.conflicts}
                      </p>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Expected records</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {result.checks.map((c) => (
                      <div
                        key={`${c.type}-${c.host}`}
                        className="flex items-start gap-3 p-3 rounded-lg border"
                      >
                        {c.ok ? (
                          <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                        ) : (
                          <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className="font-mono text-xs">
                              {c.type}
                            </Badge>
                            <span className="font-mono text-xs truncate">{c.host}</span>
                          </div>
                          <p className="text-sm text-muted-foreground">{c.detail}</p>
                          {c.live.length > 0 && (
                            <div className="text-xs font-mono bg-muted/50 rounded p-2 break-all">
                              {c.live.join("\n")}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {result.conflicts.length > 0 && (
                  <Card className="border-destructive/40">
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <XCircle className="h-4 w-4 text-destructive" />
                        Conflicting / extra records
                      </CardTitle>
                      <CardDescription>
                        These records exist on the subdomain but should not be there for
                        email-only delivery. Remove them in your DNS provider.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {result.conflicts.map((cf, i) => (
                        <div key={i} className="p-3 rounded-lg border border-destructive/30 bg-destructive/5">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <Badge variant="destructive" className="font-mono text-xs">
                              {cf.type}
                            </Badge>
                            <span className="font-mono text-xs">{cf.host}</span>
                          </div>
                          <p className="font-mono text-xs break-all mb-2">{cf.data}</p>
                          <p className="text-sm text-muted-foreground">{cf.reason}</p>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {result.summary.verified === result.summary.total &&
                  result.summary.conflicts === 0 && (
                    <Alert className="border-primary/40 bg-primary/5">
                      <ShieldCheck className="h-4 w-4 text-primary" />
                      <AlertTitle>All records verified</AlertTitle>
                      <AlertDescription>
                        Your sender subdomain is configured correctly with only the expected MX,
                        TXT, and CNAME records.
                      </AlertDescription>
                    </Alert>
                  )}
              </>
            )}
          </TabsContent>

          <TabsContent value="raw" className="space-y-4 pt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Tab-separated bundle</CardTitle>
                <CardDescription>
                  Format: <span className="font-mono">TYPE → NAME → VALUE → priority</span>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <pre className="font-mono text-xs bg-muted/50 rounded-lg p-4 overflow-x-auto whitespace-pre">
                  {bundleAsText(records, root)}
                </pre>
                <Separator className="my-4" />
                <Button onClick={copyAll} variant="secondary" className="w-full">
                  <Copy className="h-4 w-4 mr-2" /> Copy entire bundle
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
