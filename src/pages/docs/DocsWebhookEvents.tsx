import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CodeBlock } from "@/components/docs/CodeBlock";
import { DocsDownloadActions } from "@/components/docs/DocsDownloadActions";
import { Callout } from "@/components/docs/Callout";

const groups: { resource: string; events: { name: string; desc: string }[] }[] = [
  {
    resource: "Payments",
    events: [
      { name: "payment.created", desc: "A payment intent was created." },
      { name: "payment.requires_action", desc: "Payment needs 3DS challenge or customer redirect." },
      { name: "payment.processing", desc: "Payment was authorised and is awaiting capture or rail confirmation." },
      { name: "payment.succeeded", desc: "Funds have been captured successfully." },
      { name: "payment.failed", desc: "Authorisation or capture was declined. See last_error." },
      { name: "payment.canceled", desc: "An authorised payment was canceled before capture." },
    ],
  },
  {
    resource: "Refunds",
    events: [
      { name: "refund.created", desc: "A refund was submitted to the processor." },
      { name: "refund.succeeded", desc: "The refund has cleared." },
      { name: "refund.failed", desc: "The refund could not be completed; funds remain in your balance." },
    ],
  },
  {
    resource: "Payouts",
    events: [
      { name: "payout.created", desc: "A payout was queued." },
      { name: "payout.in_transit", desc: "Funds were submitted to the rail." },
      { name: "payout.paid", desc: "Funds have arrived in the destination account." },
      { name: "payout.failed", desc: "The rail rejected the payout." },
    ],
  },
  {
    resource: "Disputes",
    events: [
      { name: "dispute.created", desc: "A new chargeback or retrieval request was opened." },
      { name: "dispute.updated", desc: "Network or evidence state changed." },
      { name: "dispute.won", desc: "The dispute was decided in your favour; funds returned." },
      { name: "dispute.lost", desc: "The dispute was decided against you; funds remain debited." },
    ],
  },
  {
    resource: "Customers",
    events: [
      { name: "customer.created", desc: "New customer record." },
      { name: "customer.updated", desc: "Customer fields changed." },
      { name: "customer.deleted", desc: "Customer was archived." },
    ],
  },
  {
    resource: "Subscriptions",
    events: [
      { name: "subscription.created", desc: "A subscription started (may be in trial)." },
      { name: "subscription.updated", desc: "Plan, payment method, or schedule changed." },
      { name: "subscription.trial_will_end", desc: "Fires 3 days before trial conversion." },
      { name: "subscription.renewed", desc: "Recurring charge succeeded." },
      { name: "subscription.past_due", desc: "Renewal failed; smart-retry is engaged." },
      { name: "subscription.canceled", desc: "The subscription is no longer active." },
    ],
  },
  {
    resource: "Invoices",
    events: [
      { name: "invoice.created", desc: "Draft or finalised invoice was issued." },
      { name: "invoice.sent", desc: "Invoice email was delivered to the customer." },
      { name: "invoice.paid", desc: "Invoice was paid in full." },
      { name: "invoice.overdue", desc: "Due date passed without full payment." },
      { name: "invoice.voided", desc: "Invoice was canceled." },
    ],
  },
  {
    resource: "Open Banking",
    events: [
      { name: "open_banking.payment.created", desc: "Bank PIS request was created." },
      { name: "open_banking.payment.authorised", desc: "Customer completed authentication in their banking app." },
      { name: "open_banking.payment.completed", desc: "Funds settled into your account." },
      { name: "open_banking.payment.failed", desc: "The customer abandoned or the bank rejected the payment." },
      { name: "open_banking.refund.completed", desc: "A bank-rail refund cleared." },
    ],
  },
  {
    resource: "Crypto",
    events: [
      { name: "crypto.charge.created", desc: "Deposit address generated." },
      { name: "crypto.charge.detected", desc: "On-chain transaction observed (0 confirmations)." },
      { name: "crypto.charge.confirmed", desc: "Required confirmations reached; funds settled." },
      { name: "crypto.charge.expired", desc: "Window passed without sufficient funds." },
      { name: "crypto.withdrawal.broadcast", desc: "Withdrawal sent to the network." },
      { name: "crypto.withdrawal.confirmed", desc: "Withdrawal mined and confirmed." },
    ],
  },
];

export default function DocsWebhookEvents() {
  return (
    <div className="max-w-4xl mx-auto space-y-10">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <Badge variant="secondary" className="mb-3">Reference</Badge>
          <h1 className="text-3xl font-heading font-bold tracking-tight">Webhook Events</h1>
          <p className="text-muted-foreground mt-2">
            Every webhook MzzPay sends, grouped by resource. Subscribe to the events you need
            in <strong>Settings → Webhooks</strong> or via the API.
          </p>
        </div>
        <DocsDownloadActions />
      </div>

      <Callout variant="info" title="One envelope, every event">
        All webhooks share the envelope below. The <code>type</code> field tells you which
        event fired; <code>data.object</code> contains the full resource at the time of the
        event.
      </Callout>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Webhook Envelope</CardTitle>
        </CardHeader>
        <CardContent>
          <CodeBlock
            code={`{
  "id": "evt_4Mz9k2",
  "object": "event",
  "type": "payment.succeeded",
  "api_version": "2026-04-01",
  "created_at": "2026-04-22T10:14:00Z",
  "livemode": true,
  "data": {
    "object": { /* the full resource — payment, refund, dispute, etc. */ }
  },
  "request": { "id": "req_8821", "idempotency_key": "..." }
}`}
            language="curl"
          />
        </CardContent>
      </Card>

      {groups.map((g) => (
        <Card key={g.resource}>
          <CardHeader>
            <CardTitle className="text-lg">{g.resource}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border border-border rounded-lg overflow-hidden divide-y divide-border">
              {g.events.map((e) => (
                <div key={e.name} className="grid grid-cols-[260px_1fr] gap-4 px-4 py-3 text-sm">
                  <code className="text-xs font-mono font-semibold text-primary self-start">
                    {e.name}
                  </code>
                  <p className="text-muted-foreground text-[13px] leading-relaxed">{e.desc}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
