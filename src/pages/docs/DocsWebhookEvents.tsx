import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CodeBlock } from "@/components/docs/CodeBlock";
import { DocsDownloadActions } from "@/components/docs/DocsDownloadActions";
import { Callout } from "@/components/docs/Callout";
import { ChevronDown, ChevronRight } from "lucide-react";

/* ── event payloads ─────────────────────────────────────── */

const eventPayloads: Record<string, object> = {
  "payment.created": {
    id: "evt_pmt_created_001",
    type: "payment.created",
    created: 1745452800000,
    data: {
      id: "txn_9b1c2d3e-4f5a-6b7c-8d9e-0a1b2c3d4e5f",
      amount: 5000,
      currency: "usd",
      status: "pending",
      payment_method: "pm_card_visa",
      customer_id: "cus_abc123",
      merchant_id: "mer_test_123",
      metadata: { order_id: "ORD-1234" },
      created_at: "2026-04-23T12:00:00Z",
    },
  },
  "payment.completed": {
    id: "evt_pmt_completed_001",
    type: "payment.completed",
    created: 1745452860000,
    data: {
      id: "txn_9b1c2d3e-4f5a-6b7c-8d9e-0a1b2c3d4e5f",
      amount: 5000,
      currency: "usd",
      status: "completed",
      payment_method: "pm_card_visa",
      customer_id: "cus_abc123",
      merchant_id: "mer_test_123",
      provider: "shieldhub",
      provider_ref: "SH-20260423-00001",
      metadata: { order_id: "ORD-1234" },
      captured_at: "2026-04-23T12:01:00Z",
    },
  },
  "payment.failed": {
    id: "evt_pmt_failed_001",
    type: "payment.failed",
    created: 1745452860000,
    data: {
      id: "txn_failed_001",
      amount: 5000,
      currency: "usd",
      status: "failed",
      error: {
        type: "card_error",
        code: "card_declined",
        decline_code: "insufficient_funds",
        message: "Your card has insufficient funds.",
      },
      merchant_id: "mer_test_123",
    },
  },
  "refund.created": {
    id: "evt_ref_created_001",
    type: "refund.created",
    created: 1745453000000,
    data: {
      id: "ref_001",
      payment_id: "txn_9b1c2d3e-4f5a-6b7c-8d9e-0a1b2c3d4e5f",
      amount: 2500,
      currency: "usd",
      status: "pending",
      reason: "customer_request",
      merchant_id: "mer_test_123",
    },
  },
  "refund.completed": {
    id: "evt_ref_completed_001",
    type: "refund.completed",
    created: 1745453060000,
    data: {
      id: "ref_001",
      payment_id: "txn_9b1c2d3e-4f5a-6b7c-8d9e-0a1b2c3d4e5f",
      amount: 2500,
      currency: "usd",
      status: "succeeded",
      merchant_id: "mer_test_123",
    },
  },
  "payout.created": {
    id: "evt_pay_created_001",
    type: "payout.created",
    created: 1745454000000,
    data: {
      id: "po_001",
      amount: 150000,
      currency: "usd",
      status: "pending",
      bank_account_id: "ba_001",
      arrival_date: "2026-04-26",
      merchant_id: "mer_test_123",
    },
  },
  "payout.completed": {
    id: "evt_pay_completed_001",
    type: "payout.completed",
    created: 1745540400000,
    data: {
      id: "po_001",
      amount: 150000,
      currency: "usd",
      status: "paid",
      bank_account_id: "ba_001",
      merchant_id: "mer_test_123",
    },
  },
  "dispute.created": {
    id: "evt_dis_created_001",
    type: "dispute.created",
    created: 1745455000000,
    data: {
      id: "dis_001",
      payment_id: "txn_9b1c2d3e-4f5a-6b7c-8d9e-0a1b2c3d4e5f",
      amount: 5000,
      currency: "usd",
      reason: "fraudulent",
      status: "needs_response",
      evidence_due_by: "2026-05-07T23:59:59Z",
      merchant_id: "mer_test_123",
    },
  },
  "subscription.renewed": {
    id: "evt_sub_renewed_001",
    type: "subscription.renewed",
    created: 1745456000000,
    data: {
      id: "sub_001",
      customer_id: "cus_abc123",
      plan_name: "Pro Monthly",
      amount: 4900,
      currency: "usd",
      interval: "month",
      status: "active",
      current_period_start: "2026-04-23T00:00:00Z",
      current_period_end: "2026-05-23T00:00:00Z",
      merchant_id: "mer_test_123",
    },
  },
  "subscription.past_due": {
    id: "evt_sub_pastdue_001",
    type: "subscription.past_due",
    created: 1745456100000,
    data: {
      id: "sub_001",
      customer_id: "cus_abc123",
      status: "past_due",
      retry_count: 1,
      next_retry_at: "2026-04-24T00:00:00Z",
      merchant_id: "mer_test_123",
    },
  },
  "invoice.paid": {
    id: "evt_inv_paid_001",
    type: "invoice.paid",
    created: 1745457000000,
    data: {
      id: "inv_001",
      customer_id: "cus_abc123",
      amount: 12000,
      currency: "usd",
      status: "paid",
      hosted_url: "https://pay.mzzpay.io/inv_001",
      merchant_id: "mer_test_123",
    },
  },
  "invoice.overdue": {
    id: "evt_inv_overdue_001",
    type: "invoice.overdue",
    created: 1745458000000,
    data: {
      id: "inv_002",
      customer_id: "cus_abc123",
      amount: 8500,
      currency: "eur",
      status: "overdue",
      due_date: "2026-04-20",
      days_overdue: 3,
      merchant_id: "mer_test_123",
    },
  },
  "customer.created": {
    id: "evt_cus_created_001",
    type: "customer.created",
    created: 1745459000000,
    data: {
      id: "cus_new_001",
      email: "jane@example.com",
      name: "Jane Doe",
      phone: "+1234567890",
      merchant_id: "mer_test_123",
    },
  },
  "open_banking.payment.completed": {
    id: "evt_ob_completed_001",
    type: "open_banking.payment.completed",
    created: 1745460000000,
    data: {
      id: "ob_pay_001",
      amount: 25000,
      currency: "gbp",
      status: "completed",
      rail: "fps",
      bank_name: "Monzo",
      merchant_id: "mer_test_123",
    },
  },
  "crypto.charge.confirmed": {
    id: "evt_crypto_confirmed_001",
    type: "crypto.charge.confirmed",
    created: 1745461000000,
    data: {
      id: "cc_001",
      amount: 100.50,
      asset: "USDT_TRC20",
      network: "TRC20",
      confirmations: 20,
      tx_hash: "abc123def456...",
      status: "complete",
      merchant_id: "mer_test_123",
    },
  },
  "payment_link.completed": {
    id: "evt_pl_completed_001",
    type: "payment_link.completed",
    created: 1745462000000,
    data: {
      id: "pl_001",
      amount: 7500,
      currency: "usd",
      payment_id: "txn_link_001",
      url: "https://checkout.mzzpay.io/pl_001",
      merchant_id: "mer_test_123",
    },
  },
};

/* ── event groups ───────────────────────────────────────── */

const groups: { resource: string; events: { name: string; desc: string }[] }[] = [
  {
    resource: "Payments",
    events: [
      { name: "payment.created", desc: "A transaction row was inserted (status=pending)." },
      { name: "payment.requires_action", desc: "3DS challenge or APM redirect required from the customer." },
      { name: "payment.processing", desc: "Acquirer has authorised; awaiting capture/settlement." },
      { name: "payment.completed", desc: "Funds captured. Transaction status flipped to completed." },
      { name: "payment.failed", desc: "Authorisation or capture declined. metadata.last_error contains the reason." },
      { name: "payment.canceled", desc: "An authorised payment was voided before capture." },
    ],
  },
  {
    resource: "Refunds",
    events: [
      { name: "refund.created", desc: "A refund row was inserted." },
      { name: "refund.completed", desc: "Acquirer cleared the refund." },
      { name: "refund.failed", desc: "Refund could not be processed; balance unaffected." },
    ],
  },
  {
    resource: "Payouts",
    events: [
      { name: "payout.created", desc: "A payout was queued for the next settlement window." },
      { name: "payout.in_transit", desc: "Submitted to SEPA / SWIFT / ACH / FPS / on-chain rail." },
      { name: "payout.completed", desc: "Funds confirmed in the destination account." },
      { name: "payout.failed", desc: "Rail rejected the payout — see metadata.rail_error." },
    ],
  },
  {
    resource: "Disputes",
    events: [
      { name: "dispute.created", desc: "Chargeback or retrieval request opened (synced from Chargeflow)." },
      { name: "dispute.updated", desc: "Network state, evidence_due_date, or outcome changed." },
      { name: "dispute.won", desc: "Decided in your favour; debit reversed." },
      { name: "dispute.lost", desc: "Decided against you; debit remains and a fee may be assessed." },
    ],
  },
  {
    resource: "Customers",
    events: [
      { name: "customer.created", desc: "New row inserted in customers." },
      { name: "customer.updated", desc: "Customer fields changed." },
      { name: "customer.deleted", desc: "Customer row was removed (cascade-deletes invoices/subscriptions)." },
    ],
  },
  {
    resource: "Subscriptions",
    events: [
      { name: "subscription.created", desc: "Subscription started (status=active or trialing)." },
      { name: "subscription.updated", desc: "Plan, payment method, or schedule changed." },
      { name: "subscription.trial_will_end", desc: "Fires 3 days before trial conversion." },
      { name: "subscription.renewed", desc: "Recurring charge succeeded." },
      { name: "subscription.past_due", desc: "Renewal failed; smart-retry engaged via retry-payment." },
      { name: "subscription.canceled", desc: "Subscription is no longer active." },
    ],
  },
  {
    resource: "Invoices",
    events: [
      { name: "invoice.created", desc: "Draft or open invoice issued." },
      { name: "invoice.sent", desc: "Hosted invoice email delivered." },
      { name: "invoice.paid", desc: "Invoice fully paid; status=paid." },
      { name: "invoice.overdue", desc: "Detected by invoice-overdue-check (runs daily)." },
      { name: "invoice.voided", desc: "Invoice canceled." },
    ],
  },
  {
    resource: "Open Banking",
    events: [
      { name: "open_banking.payment.created", desc: "PIS request issued to the ASPSP." },
      { name: "open_banking.payment.authorised", desc: "Customer completed strong customer authentication." },
      { name: "open_banking.payment.completed", desc: "Funds settled (FPS / SEPA Instant)." },
      { name: "open_banking.payment.failed", desc: "Customer abandoned or bank rejected." },
      { name: "open_banking.refund.completed", desc: "Bank-rail refund cleared." },
    ],
  },
  {
    resource: "Crypto",
    events: [
      { name: "crypto.charge.created", desc: "Deposit address generated by crypto-pay." },
      { name: "crypto.charge.detected", desc: "On-chain transaction observed (0 confirmations)." },
      { name: "crypto.charge.confirmed", desc: "Required confirmations reached; status=complete." },
      { name: "crypto.charge.expired", desc: "Window closed without sufficient funds." },
      { name: "crypto.withdrawal.broadcast", desc: "Withdrawal sent to the network." },
      { name: "crypto.withdrawal.confirmed", desc: "Withdrawal mined and confirmed." },
    ],
  },
  {
    resource: "Payment Links",
    events: [
      { name: "payment_link.created", desc: "Hosted checkout link issued." },
      { name: "payment_link.completed", desc: "Customer completed checkout via the link." },
      { name: "payment_link.expired", desc: "Link expired without payment." },
    ],
  },
];

/* ── component ──────────────────────────────────────────── */

function EventRow({ e }: { e: { name: string; desc: string } }) {
  const [open, setOpen] = useState(false);
  const payload = eventPayloads[e.name];

  return (
    <div className="border-b border-border last:border-b-0">
      <button
        className="w-full grid grid-cols-[260px_1fr_28px] gap-4 px-4 py-3 text-sm text-left hover:bg-muted/40 transition-colors"
        onClick={() => payload && setOpen(!open)}
        type="button"
      >
        <code className="text-xs font-mono font-semibold text-primary self-start">
          {e.name}
        </code>
        <p className="text-muted-foreground text-[13px] leading-relaxed">{e.desc}</p>
        <span className="self-center">
          {payload ? (
            open ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />
          ) : null}
        </span>
      </button>
      {open && payload && (
        <div className="px-4 pb-4">
          <CodeBlock code={JSON.stringify(payload, null, 2)} language="curl" />
        </div>
      )}
    </div>
  );
}

export default function DocsWebhookEvents() {
  return (
    <div className="max-w-4xl mx-auto space-y-10">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <Badge variant="secondary" className="mb-3">Reference</Badge>
          <h1 className="text-3xl font-heading font-bold tracking-tight">Webhook Events</h1>
          <p className="text-muted-foreground mt-2">
            Every event MzzPay dispatches via <code>webhook-dispatch</code>, grouped by
            resource. Subscribe in <strong>Settings → Webhooks</strong> or by inserting into
            the <code>webhook_endpoints</code> table. Click any event to see its full payload.
          </p>
        </div>
        <DocsDownloadActions />
      </div>

      <Callout variant="info" title="One envelope, every event">
        All webhooks share the envelope below. The <code>type</code> field identifies the
        event; <code>data</code> contains the resource snapshot at dispatch time. Verify the{" "}
        <code>X-Mzzpay-Signature</code> header — it is the raw HMAC-SHA256 hex digest of the
        request body using your endpoint secret.
      </Callout>

      {/* ── Signature verification guide ────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Signature Verification</CardTitle>
          <CardDescription>
            Every webhook delivery includes these headers. Always verify the signature before processing.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="border border-border rounded-lg overflow-hidden divide-y divide-border text-sm">
            {[
              ["Content-Type", "application/json", "Always JSON."],
              ["X-Mzzpay-Event", "payment.completed", "The event type — use for routing."],
              ["X-Mzzpay-Signature", "7c9f3a…8e9f", "hex(HMAC-SHA256(raw_body, webhook_secret)). Compare with constant-time function."],
              ["X-Mzzpay-Timestamp", "1745452800000", "Unix milliseconds — reject if > 5 min old to prevent replays."],
              ["X-Mzzpay-Delivery-Id", "dlv_abc123", "Unique per delivery attempt. Use to detect retries."],
            ].map(([header, example, desc]) => (
              <div key={header} className="grid grid-cols-[180px_200px_1fr] gap-3 px-4 py-2.5">
                <code className="font-mono text-xs font-semibold text-primary">{header}</code>
                <code className="text-xs text-muted-foreground">{example}</code>
                <span className="text-muted-foreground text-[13px]">{desc}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Verification — Step by step</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
            <li>Read the <strong>raw request body</strong> as bytes — do NOT re-serialize JSON.</li>
            <li>Compute <code>expected = hex(HMAC_SHA256(raw_body, webhook_secret))</code>.</li>
            <li>Compare <code>expected</code> with <code>X-Mzzpay-Signature</code> using a <strong>constant-time</strong> comparison.</li>
            <li>Check <code>X-Mzzpay-Timestamp</code> — reject if the timestamp is older than 5 minutes.</li>
            <li>Deduplicate on <code>event.id</code> — we may deliver the same event twice.</li>
            <li>Return <code>200</code> within 10 seconds. Anything else triggers exponential retry.</li>
          </ol>
          <CodeBlock
            code={{
              node: `import crypto from 'node:crypto';
import express from 'express';

const app = express();
const WEBHOOK_SECRET = process.env.MZZPAY_WEBHOOK_SECRET!;

app.post(
  '/webhooks/mzzpay',
  express.raw({ type: 'application/json' }),
  (req, res) => {
    const rawBody = req.body as Buffer;
    const sig = req.header('X-Mzzpay-Signature') ?? '';
    const ts  = parseInt(req.header('X-Mzzpay-Timestamp') ?? '0', 10);

    // 1. Reject stale events (> 5 min)
    if (Math.abs(Date.now() - ts) > 5 * 60 * 1000) {
      return res.status(401).send('timestamp too old');
    }

    // 2. Compute expected signature
    const expected = crypto
      .createHmac('sha256', WEBHOOK_SECRET)
      .update(rawBody)
      .digest('hex');

    // 3. Constant-time comparison
    if (
      sig.length !== expected.length ||
      !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig))
    ) {
      return res.status(401).send('invalid signature');
    }

    // 4. Parse and dedupe
    const event = JSON.parse(rawBody.toString('utf8'));
    console.log('[webhook]', event.type, event.data.id);
    // TODO: check event.id against your idempotency store

    res.status(200).send('ok');
  },
);`,
              python: `import hmac, hashlib, json, time
from flask import Flask, request, abort

app = Flask(__name__)
SECRET = b"whsec_your_secret_here"

@app.post("/webhooks/mzzpay")
def mzzpay_hook():
    raw = request.get_data()
    sig = request.headers.get("X-Mzzpay-Signature", "")
    ts  = int(request.headers.get("X-Mzzpay-Timestamp", "0"))

    # Reject stale
    if abs(time.time() * 1000 - ts) > 5 * 60 * 1000:
        abort(401, "timestamp too old")

    # Verify
    expected = hmac.new(SECRET, raw, hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected, sig):
        abort(401, "invalid signature")

    event = json.loads(raw)
    print(f"[webhook] {event['type']} {event['data']['id']}")
    return ("ok", 200)`,
              curl: `# Simulate a signed webhook delivery
SECRET="whsec_your_secret_here"
BODY='{"id":"evt_test_001","type":"payment.completed","created":1745452800000,"data":{"id":"txn_001","amount":5000,"currency":"usd","status":"completed"}}'

SIG=$(echo -n "$BODY" | openssl dgst -sha256 -hmac "$SECRET" -hex | awk '{print $NF}')

curl -X POST https://your-app.com/webhooks/mzzpay \\
  -H "Content-Type: application/json" \\
  -H "X-Mzzpay-Event: payment.completed" \\
  -H "X-Mzzpay-Timestamp: 1745452800000" \\
  -H "X-Mzzpay-Signature: $SIG" \\
  -d "$BODY"`,
            }}
          />
        </CardContent>
      </Card>

      {/* ── Retry schedule ──────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Retry Schedule</CardTitle>
          <CardDescription>
            If your endpoint doesn't return 2xx within 10 seconds, we retry with exponential backoff for up to 72 hours.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-2 text-center text-xs">
            {["1 min", "5 min", "30 min", "2 hr", "12 hr", "24 hr", "24 hr"].map((t, i) => (
              <div key={i} className="bg-muted/50 rounded-lg py-2 px-1">
                <p className="font-semibold text-foreground">Retry {i + 1}</p>
                <p className="text-muted-foreground mt-0.5">{t}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── Webhook envelope ────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Webhook Envelope</CardTitle>
        </CardHeader>
        <CardContent>
          <CodeBlock
            code={`{
  "id":      "evt_1Q9aB3cDeFgHiJkLmNoPqRsT",   // unique — your dedupe key
  "type":    "payment.completed",               // see events below
  "created": 1745452800000,                     // unix milliseconds
  "data": {
    "id":          "txn_9b1c2d3e-...",           // resource id
    "amount":      5000,                         // minor units
    "currency":    "usd",
    "status":      "completed",
    "merchant_id": "mer_test_123"
  }
}`}
            language="curl"
          />
        </CardContent>
      </Card>

      {/* ── Event reference with expandable payloads ──── */}
      {groups.map((g) => (
        <Card key={g.resource}>
          <CardHeader>
            <CardTitle className="text-lg">{g.resource}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {g.events.map((e) => (
                <EventRow key={e.name} e={e} />
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
