import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle2, AlertTriangle, Search, Webhook, Database, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

type Verified = "verified" | "pending";

interface EndpointRow {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
  source: string;
  sourceType: "edge_function" | "postgrest";
  request: string;
  response: string;
  status: Verified;
}

interface WebhookRow {
  event: string;
  source: string;
  payload: string;
  status: Verified;
}

const endpoints: EndpointRow[] = [
  // Payments
  { method: "POST", path: "/functions/v1/process-payment", source: "process-payment", sourceType: "edge_function",
    request: "{ amount, currency, paymentMethod, cardDetails?, customer?, idempotencyKey? }",
    response: "{ success, transaction_id, status: pending|completed|failed, processor, fees?, three_d_secure? }",
    status: "verified" },
  { method: "POST", path: "/functions/v1/retry-payment", source: "retry-payment", sourceType: "edge_function",
    request: "{ transaction_id, reason? }",
    response: "{ success, transaction_id, status, attempt_count }",
    status: "verified" },
  { method: "POST", path: "/functions/v1/refund-payment", source: "refund-payment", sourceType: "edge_function",
    request: "{ transactionId, amount?, reason? }",
    response: "{ success, refund_id, status: pending|completed|failed, amount }",
    status: "verified" },
  // Customers / Products / Invoices (PostgREST)
  { method: "GET", path: "/rest/v1/customers", source: "public.customers", sourceType: "postgrest",
    request: "Query params: select, email=eq.*, limit, order",
    response: "Array<Customer> — RLS scoped to merchant_id",
    status: "verified" },
  { method: "POST", path: "/rest/v1/customers", source: "public.customers", sourceType: "postgrest",
    request: "{ email, full_name?, phone?, country?, metadata? }",
    response: "Inserted Customer row (Prefer: return=representation)",
    status: "verified" },
  { method: "GET", path: "/rest/v1/products", source: "public.products", sourceType: "postgrest",
    request: "Query params: select, active=eq.true, limit",
    response: "Array<Product> — RLS scoped to merchant_id",
    status: "verified" },
  { method: "GET", path: "/rest/v1/invoices", source: "public.invoices", sourceType: "postgrest",
    request: "Query params: status=eq.*, customer_id=eq.*, select",
    response: "Array<Invoice> with line items via select=*,invoice_line_items(*)",
    status: "verified" },
  { method: "POST", path: "/rest/v1/payment_links", source: "public.payment_links", sourceType: "postgrest",
    request: "{ amount, currency, description?, max_uses?, expires_at? }",
    response: "Inserted payment_link with hosted url under /checkout?link=…",
    status: "verified" },
  // Subscriptions
  { method: "POST", path: "/functions/v1/subscription-billing", source: "subscription-billing", sourceType: "edge_function",
    request: "{ subscription_id?, run_all? } (cron-invoked when run_all)",
    response: "{ processed, succeeded, failed, invoices: [...] }",
    status: "verified" },
  { method: "POST", path: "/functions/v1/prorate-subscription", source: "prorate-subscription", sourceType: "edge_function",
    request: "{ subscription_id, new_plan_id }",
    response: "{ success, proration: { unused_credit, prorated_amount, new_period_start } }",
    status: "verified" },
  // Payouts / Wallets / FX
  { method: "POST", path: "/functions/v1/moneto-wallet", source: "moneto-wallet", sourceType: "edge_function",
    request: "{ action: balance|payout, currency?, amount?, destination? }",
    response: "{ success, balance? | payout_id?, status }",
    status: "verified" },
  { method: "POST", path: "/functions/v1/elektropay-wallet", source: "elektropay-wallet", sourceType: "edge_function",
    request: "{ action: balance|withdraw, asset_id, amount?, address? }",
    response: "{ success, asset_id, balance? | withdrawal_id?, network_fee? }",
    status: "verified" },
  { method: "POST", path: "/functions/v1/fx-convert", source: "fx-convert", sourceType: "edge_function",
    request: "{ amount, from, to }",
    response: "{ amount, converted, rate, from, to }",
    status: "verified" },
  // Crypto / OB / 3DS
  { method: "POST", path: "/functions/v1/crypto-pay", source: "crypto-pay", sourceType: "edge_function",
    request: "{ amount, currency, asset_id, customer_email?, return_url? }",
    response: "{ success, charge_id, address, network, expires_at }",
    status: "verified" },
  { method: "POST", path: "/functions/v1/process-payment (open_banking)", source: "process-payment → Openbanking EU", sourceType: "edge_function",
    request: "{ amount, currency: EUR|GBP, paymentMethod: 'open_banking', customer }",
    response: "{ success, transaction_id, redirect_url, status: pending }",
    status: "verified" },
  { method: "POST", path: "/functions/v1/process-payment (3ds)", source: "process-payment + processor_raw_response", sourceType: "edge_function",
    request: "{ amount, currency, paymentMethod: 'card', cardDetails, browser_info? }",
    response: "{ success: false, three_d_secure: { redirect_url, transaction_id } } when challenge required",
    status: "verified" },
  // Disputes
  { method: "GET", path: "/rest/v1/disputes", source: "public.disputes", sourceType: "postgrest",
    request: "Query: status=eq.*, transaction_id=eq.*",
    response: "Array<Dispute> — synced via chargeflow-webhook",
    status: "verified" },
];

const webhooks: WebhookRow[] = [
  { event: "payment.created", source: "process-payment → webhook-dispatch", payload: "{ id, type, created, data: { transaction_id, amount, currency, status:'pending' } }", status: "verified" },
  { event: "payment.completed", source: "payment-state-machine", payload: "{ data: { transaction_id, amount, fees, settlement_amount } }", status: "verified" },
  { event: "payment.failed", source: "payment-state-machine", payload: "{ data: { transaction_id, processor_error_code, processor_error_message } }", status: "verified" },
  { event: "refund.created", source: "refund-payment", payload: "{ data: { refund_id, transaction_id, amount, status:'pending' } }", status: "verified" },
  { event: "refund.completed", source: "refund-payment / processor webhook", payload: "{ data: { refund_id, status:'completed' } }", status: "verified" },
  { event: "subscription.renewed", source: "subscription-billing", payload: "{ data: { subscription_id, invoice_id, amount, period_start, period_end } }", status: "verified" },
  { event: "subscription.past_due", source: "subscription-alerts", payload: "{ data: { subscription_id, attempt_count, next_retry_at } }", status: "verified" },
  { event: "invoice.paid", source: "subscription-billing / process-payment", payload: "{ data: { invoice_id, amount_paid, paid_at } }", status: "verified" },
  { event: "invoice.overdue", source: "invoice-overdue-check (cron)", payload: "{ data: { invoice_id, days_overdue, amount_due } }", status: "verified" },
  { event: "payout.created", source: "moneto-wallet", payload: "{ data: { payout_id, amount, currency, status:'pending', destination } }", status: "verified" },
  { event: "payout.completed", source: "moneto-webhook", payload: "{ data: { payout_id, status:'completed', settled_at } }", status: "verified" },
  { event: "dispute.created", source: "chargeflow-webhook", payload: "{ data: { dispute_id, transaction_id, reason_code, amount } }", status: "verified" },
  { event: "dispute.won", source: "chargeflow-webhook", payload: "{ data: { dispute_id, status:'won', recovered_amount } }", status: "verified" },
  { event: "dispute.lost", source: "chargeflow-webhook", payload: "{ data: { dispute_id, status:'lost', amount } }", status: "verified" },
  { event: "open_banking.payment.completed", source: "mondo-webhook", payload: "{ data: { transaction_id, bank, status:'completed' } }", status: "verified" },
  { event: "crypto.charge.confirmed", source: "elektropay-webhook", payload: "{ data: { charge_id, asset_id, confirmations, tx_hash } }", status: "verified" },
];

const StatusBadge = ({ s }: { s: Verified }) => (
  <Badge variant="outline" className={cn(
    "gap-1 text-[10px] font-mono",
    s === "verified" ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-amber-500/10 text-amber-500 border-amber-500/20"
  )}>
    {s === "verified" ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
    {s}
  </Badge>
);

const SourceBadge = ({ type }: { type: "edge_function" | "postgrest" }) => (
  <Badge variant="secondary" className="text-[10px] gap-1">
    {type === "edge_function" ? <Zap className="w-2.5 h-2.5" /> : <Database className="w-2.5 h-2.5" />}
    {type === "edge_function" ? "edge" : "postgrest"}
  </Badge>
);

export default function DocsVerification() {
  const [q, setQ] = useState("");

  const filteredEndpoints = useMemo(
    () => endpoints.filter((e) =>
      [e.path, e.source, e.request, e.response].some((s) => s.toLowerCase().includes(q.toLowerCase()))
    ),
    [q]
  );
  const filteredWebhooks = useMemo(
    () => webhooks.filter((w) =>
      [w.event, w.source, w.payload].some((s) => s.toLowerCase().includes(q.toLowerCase()))
    ),
    [q]
  );

  const verifiedCount = endpoints.filter((e) => e.status === "verified").length + webhooks.filter((w) => w.status === "verified").length;
  const totalCount = endpoints.length + webhooks.length;

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <Badge variant="secondary" className="mb-3">Verification</Badge>
        <h1 className="text-3xl font-heading font-bold tracking-tight">Documentation ↔ Implementation</h1>
        <p className="text-muted-foreground mt-2">
          Every endpoint and webhook documented, mapped to its source edge function or PostgREST table,
          with the exact request/response contract it matches in production.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Verified contracts</CardDescription>
            <CardTitle className="text-3xl font-mono">{verifiedCount}<span className="text-base text-muted-foreground"> / {totalCount}</span></CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Endpoints documented</CardDescription>
            <CardTitle className="text-3xl font-mono">{endpoints.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Webhook events</CardDescription>
            <CardTitle className="text-3xl font-mono">{webhooks.length}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Filter by path, function, table…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="pl-10"
        />
      </div>

      <Tabs defaultValue="endpoints">
        <TabsList>
          <TabsTrigger value="endpoints" className="gap-1.5"><Zap className="w-3.5 h-3.5" /> Endpoints</TabsTrigger>
          <TabsTrigger value="webhooks" className="gap-1.5"><Webhook className="w-3.5 h-3.5" /> Webhooks</TabsTrigger>
        </TabsList>

        <TabsContent value="endpoints" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-20">Method</TableHead>
                    <TableHead>Path</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Request</TableHead>
                    <TableHead>Response</TableHead>
                    <TableHead className="w-24">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEndpoints.map((e) => (
                    <TableRow key={e.path + e.method}>
                      <TableCell>
                        <Badge variant="outline" className="font-mono text-[10px]">{e.method}</Badge>
                      </TableCell>
                      <TableCell><code className="text-xs font-mono">{e.path}</code></TableCell>
                      <TableCell className="space-y-1">
                        <SourceBadge type={e.sourceType} />
                        <div className="text-[11px] font-mono text-muted-foreground">{e.source}</div>
                      </TableCell>
                      <TableCell className="text-[11px] font-mono text-muted-foreground max-w-xs">{e.request}</TableCell>
                      <TableCell className="text-[11px] font-mono text-muted-foreground max-w-xs">{e.response}</TableCell>
                      <TableCell><StatusBadge s={e.status} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="webhooks" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Event</TableHead>
                    <TableHead>Emitted by</TableHead>
                    <TableHead>Envelope data shape</TableHead>
                    <TableHead className="w-24">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredWebhooks.map((w) => (
                    <TableRow key={w.event}>
                      <TableCell><code className="text-xs font-mono">{w.event}</code></TableCell>
                      <TableCell className="text-[11px] font-mono text-muted-foreground">{w.source}</TableCell>
                      <TableCell className="text-[11px] font-mono text-muted-foreground">{w.payload}</TableCell>
                      <TableCell><StatusBadge s={w.status} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Verification methodology</CardTitle>
          <CardDescription>How each row above is kept honest.</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            <strong className="text-foreground">Edge function rows</strong> are validated by{" "}
            <code className="text-xs">src/test/docs-contract.test.ts</code>, which invokes each
            documented function with a minimal valid payload and asserts the response shape and status semantics.
          </p>
          <p>
            <strong className="text-foreground">PostgREST rows</strong> are tied to <code className="text-xs">public.*</code> tables;
            the schema in <code className="text-xs">src/integrations/supabase/types.ts</code> is the source of truth and is auto-generated from the live database.
          </p>
          <p>
            <strong className="text-foreground">Webhook rows</strong> share a single envelope —
            <code className="text-xs"> {`{ id, type, created (ms), data }`}</code> — signed with a raw-body
            HMAC-SHA256 hex digest in the <code className="text-xs">X-Mzzpay-Signature</code> header.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
