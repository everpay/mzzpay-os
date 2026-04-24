import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Webhook, Plus, Send, CheckCircle2, XCircle, Clock } from "lucide-react";
import { CodeBlock } from "@/components/docs/CodeBlock";
import { DocsContentSection } from "@/components/docs/DocsContentSection";
import { DocsDownloadActions } from "@/components/docs/DocsDownloadActions";
import { Callout } from "@/components/docs/Callout";
import { useToast } from "@/hooks/use-toast";

const eventTypes = [
  "payment.created", "payment.completed", "payment.failed",
  "refund.created", "refund.completed",
  "customer.created", "customer.updated",
  "payout.created", "payout.completed",
  "dispute.created", "dispute.won", "dispute.lost",
  "subscription.renewed", "subscription.past_due",
  "invoice.paid", "invoice.overdue",
  "open_banking.payment.completed",
  "crypto.charge.confirmed",
];

const mockLogs = [
  { id: "1", event: "payment.succeeded", url: "https://example.com/hooks", status: "delivered", statusCode: 200, timestamp: "2026-04-09 14:32:01", duration: "234ms" },
  { id: "2", event: "payment.failed", url: "https://example.com/hooks", status: "failed", statusCode: 500, timestamp: "2026-04-09 14:30:45", duration: "1.2s" },
  { id: "3", event: "refund.created", url: "https://example.com/hooks", status: "delivered", statusCode: 200, timestamp: "2026-04-09 14:28:12", duration: "189ms" },
];

export default function DocsWebhooks() {
  const [selectedEvent, setSelectedEvent] = useState("payment.succeeded");
  const [testUrl, setTestUrl] = useState("https://example.com/webhooks");
  const [isSending, setIsSending] = useState(false);
  const { toast } = useToast();

  const sendTestEvent = () => {
    setIsSending(true);
    setTimeout(() => {
      setIsSending(false);
      toast({ title: "Test webhook sent", description: `${selectedEvent} → ${testUrl}` });
    }, 1500);
  };

  const statusIcon = (s: string) => {
    if (s === "delivered") return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
    if (s === "failed") return <XCircle className="w-4 h-4 text-destructive" />;
    return <Clock className="w-4 h-4 text-muted-foreground" />;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <Badge variant="secondary" className="mb-3">Webhooks</Badge>
          <h1 className="text-3xl font-heading font-bold tracking-tight">Webhooks</h1>
          <p className="text-muted-foreground mt-2">Configure endpoints, test events, and view delivery logs.</p>
        </div>
        <div className="flex items-center gap-2">
          <DocsDownloadActions />
          <Button className="gap-2"><Plus className="w-4 h-4" /> Add Endpoint</Button>
        </div>
      </div>

      <Callout variant="success" title="Treat webhooks as the source of truth">
        Don't poll our API for state. Subscribe to events, verify the signature, dedupe by
        <code> event.id</code>, and respond <code>2xx</code> within 10 seconds — anything
        slower is retried.
      </Callout>

      <Tabs defaultValue="test">
        <TabsList>
          <TabsTrigger value="test">Test Events</TabsTrigger>
          <TabsTrigger value="logs">Delivery Logs</TabsTrigger>
          <TabsTrigger value="reference">Reference</TabsTrigger>
        </TabsList>

        <TabsContent value="test" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Webhook className="w-5 h-5 text-primary" /> Send Test Event
              </CardTitle>
              <CardDescription>Simulate webhook events to test your integration.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Event Type</label>
                  <Select value={selectedEvent} onValueChange={setSelectedEvent}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {eventTypes.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Endpoint URL</label>
                  <Input value={testUrl} onChange={(e) => setTestUrl(e.target.value)} placeholder="https://your-app.com/webhooks" />
                </div>
              </div>
              <Button onClick={sendTestEvent} disabled={isSending} className="gap-2">
                <Send className="w-4 h-4" /> {isSending ? "Sending..." : "Send Test Event"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-lg">Event Payload Preview</CardTitle></CardHeader>
            <CardContent>
              <CodeBlock
                code={`POST /your/endpoint
Content-Type: application/json
X-Mzzpay-Event: ${selectedEvent}
X-Mzzpay-Signature: <hex hmac-sha256 of body>

{
  "id": "evt_test_abc123",
  "type": "${selectedEvent}",
  "created": ${Date.now()},
  "data": {
    "id": "9b1c2d3e-4f5a-6b7c-8d9e-0a1b2c3d4e5f",
    "amount": 5000,
    "currency": "usd",
    "status": "${selectedEvent.includes('failed') ? 'failed' : 'completed'}",
    "merchant_id": "mer_test_123"
  }
}`}
                language="curl"
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="mt-6">
          <Card>
            <CardHeader><CardTitle className="text-lg">Recent Deliveries</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {mockLogs.map((log) => (
                  <div key={log.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      {statusIcon(log.status)}
                      <div>
                        <p className="text-sm font-medium font-mono">{log.event}</p>
                        <p className="text-xs text-muted-foreground">{log.url}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant={log.status === "delivered" ? "secondary" : log.status === "failed" ? "destructive" : "outline"} className="text-[10px]">
                        {log.statusCode > 0 ? log.statusCode : "—"}
                      </Badge>
                      <p className="text-[10px] text-muted-foreground mt-1">{log.timestamp} · {log.duration}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reference" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Signature scheme</CardTitle>
              <CardDescription>
                Every event is signed as <code>HMAC_SHA256(raw_body, webhook_secret)</code>,
                hex-encoded, in the <code>X-Mzzpay-Signature</code> header. Verify against the
                <strong> raw request body</strong> — never the re-serialized JSON.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CodeBlock
                code={`Method:    POST <your endpoint>
Headers:   Content-Type:        application/json
           X-Mzzpay-Event:      payment.completed
           X-Mzzpay-Signature:  <hex(hmac_sha256(raw_body, secret))>
           X-Mzzpay-Timestamp:  <unix ms, mirrors envelope.created>
Body:      Canonical JSON envelope (below)`}
                language="curl"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">End-to-end signed cURL example</CardTitle>
              <CardDescription>
                Reproduce the exact request MzzPay sends to your endpoint. Pipe the same body
                bytes into <code>openssl dgst</code> to get the signature you'll see in the header.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CodeBlock
                code={{
                  curl: `# 1. Build the canonical envelope (write to file so we sign the EXACT bytes)
cat > /tmp/evt.json <<'JSON'
{"id":"evt_1Q9aB3cDeFgHiJkLmNoPqRsT","type":"payment.completed","created":1745452800000,"data":{"transaction_id":"9b1c2d3e-4f5a-6b7c-8d9e-0a1b2c3d4e5f","amount":5000,"currency":"usd","status":"completed","merchant_id":"mer_test_123"}}
JSON

# 2. Sign the raw body with your webhook secret (hex output)
SECRET="whsec_test_abcdef1234567890"
SIG=$(openssl dgst -sha256 -hmac "$SECRET" -hex /tmp/evt.json | awk '{print $2}')

# 3. Send to your endpoint — body MUST be byte-identical to what was signed
curl -X POST https://your-app.com/webhooks/mzzpay \\
  -H "Content-Type: application/json" \\
  -H "X-Mzzpay-Event: payment.completed" \\
  -H "X-Mzzpay-Timestamp: 1745452800000" \\
  -H "X-Mzzpay-Signature: $SIG" \\
  --data-binary @/tmp/evt.json`,
                  node: `import crypto from 'node:crypto';
import express from 'express';

const app = express();
const SECRET = process.env.MZZPAY_WEBHOOK_SECRET!;

// CRITICAL: capture the raw body BEFORE any JSON middleware parses it
app.post(
  '/webhooks/mzzpay',
  express.raw({ type: 'application/json' }),
  (req, res) => {
    const rawBody = req.body as Buffer;            // <-- raw bytes
    const signature = req.header('X-Mzzpay-Signature') ?? '';

    const expected = crypto
      .createHmac('sha256', SECRET)
      .update(rawBody)
      .digest('hex');

    const ok =
      signature.length === expected.length &&
      crypto.timingSafeEqual(
        Buffer.from(expected, 'hex'),
        Buffer.from(signature, 'hex'),
      );

    if (!ok) return res.status(401).end('invalid signature');

    const event = JSON.parse(rawBody.toString('utf8'));
    // Dedupe on event.id, then handle
    console.log(event.type, event.data);
    res.status(200).end('ok');
  },
);`,
                  python: `import hmac, hashlib, json
from flask import Flask, request, abort

app = Flask(__name__)
SECRET = b"whsec_test_abcdef1234567890"

@app.post("/webhooks/mzzpay")
def mzzpay_hook():
    raw = request.get_data()  # <-- raw bytes, NOT request.json
    sig = request.headers.get("X-Mzzpay-Signature", "")
    expected = hmac.new(SECRET, raw, hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected, sig):
        abort(401)

    event = json.loads(raw)
    # event = { "id", "type", "created", "data" }
    return ("ok", 200)`,
                }}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Canonical envelope</CardTitle>
              <CardDescription>Every event MzzPay emits uses this shape.</CardDescription>
            </CardHeader>
            <CardContent>
              <CodeBlock
                code={`{
  "id":      "evt_1Q9aB3cDeFgHiJkLmNoPqRsT",   // unique, dedupe key
  "type":    "payment.completed",               // see Event Reference
  "created": 1745452800000,                     // unix milliseconds
  "data": {
    "transaction_id": "9b1c2d3e-4f5a-6b7c-8d9e-0a1b2c3d4e5f",
    "amount":   5000,                           // minor units
    "currency": "usd",
    "status":   "completed",                    // completed | failed | pending
    "merchant_id": "mer_test_123"
  }
}`}
                language="curl"
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <section className="space-y-4 pt-4 border-t border-border">
        <h2 className="text-2xl font-heading font-semibold tracking-tight">
          Delivery, signatures & idempotent consumers
        </h2>
        <DocsContentSection sectionId="webhooks" />
      </section>
    </div>
  );
}
