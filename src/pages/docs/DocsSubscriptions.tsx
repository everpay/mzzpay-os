import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CodeBlock } from "@/components/docs/CodeBlock";
import { ApiEndpoint } from "@/components/docs/ApiEndpoint";
import { DocsDownloadActions } from "@/components/docs/DocsDownloadActions";
import { Callout } from "@/components/docs/Callout";

export default function DocsSubscriptions() {
  return (
    <div className="max-w-4xl mx-auto space-y-10">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <Badge variant="secondary" className="mb-3">API Reference</Badge>
          <h1 className="text-3xl font-heading font-bold tracking-tight">Subscriptions API</h1>
          <p className="text-muted-foreground mt-2">
            Recurring billing with automatic dunning, mid-cycle proration, and per-customer
            trial windows. Subscriptions inherit your default smart-retry policy.
          </p>
        </div>
        <DocsDownloadActions />
      </div>

      <Callout variant="info" title="Proration is automatic">
        Plan upgrades and downgrades inside an active billing cycle are prorated to the second.
        See <code>POST /v1/subscriptions/:id/preview-proration</code> to compute charges before
        applying a change.
      </Callout>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">The Subscription Object</CardTitle>
        </CardHeader>
        <CardContent>
          <CodeBlock
            code={`{
  "id": "sub_5hKp2",
  "object": "subscription",
  "customer_id": "cus_abc123",
  "plan_id": "plan_pro_monthly",
  "status": "active",
  "current_period_start": "2026-04-01T00:00:00Z",
  "current_period_end": "2026-05-01T00:00:00Z",
  "cancel_at_period_end": false,
  "trial_end": null,
  "metadata": {}
}`}
            language="curl"
          />
        </CardContent>
      </Card>

      <ApiEndpoint
        method="POST"
        path="/v1/subscriptions"
        title="Create a Subscription"
        description="Subscribe a customer to a recurring plan. Charges the saved payment method on each renewal."
        params={[
          { name: "customer_id", type: "string", required: true, desc: "ID of the existing customer" },
          { name: "plan_id", type: "string", required: true, desc: "Plan identifier (e.g. plan_pro_monthly)" },
          { name: "trial_days", type: "integer", required: false, desc: "Override default trial length" },
          { name: "coupon", type: "string", required: false, desc: "Promotion code to apply" },
          { name: "metadata", type: "object", required: false, desc: "Custom key-value tags" },
        ]}
        code={{
          curl: `curl -X POST https://api.mzzpay.io/v1/subscriptions \\
  -H "Authorization: Bearer sk_test_your_key" \\
  -d '{
    "customer_id": "cus_abc123",
    "plan_id": "plan_pro_monthly",
    "trial_days": 14
  }'`,
          node: `const sub = await mzzpay.subscriptions.create({
  customer_id: 'cus_abc123',
  plan_id: 'plan_pro_monthly',
  trial_days: 14,
});`,
          python: `sub = mzzpay.Subscription.create(
  customer_id="cus_abc123",
  plan_id="plan_pro_monthly",
  trial_days=14,
)`,
        }}
        response={`{
  "id": "sub_5hKp2",
  "status": "trialing",
  "trial_end": "2026-05-06T00:00:00Z"
}`}
      />

      <ApiEndpoint
        method="POST"
        path="/v1/subscriptions/:id"
        title="Update a Subscription"
        description="Change plan, payment method, or metadata. Plan changes are prorated automatically."
        params={[
          { name: "plan_id", type: "string", required: false, desc: "New plan to switch to (prorated)" },
          { name: "payment_method", type: "string", required: false, desc: "Replace the card or wallet on file" },
          { name: "cancel_at_period_end", type: "boolean", required: false, desc: "Schedule cancellation at the end of the cycle" },
        ]}
        code={{
          curl: `curl -X POST https://api.mzzpay.io/v1/subscriptions/sub_5hKp2 \\
  -H "Authorization: Bearer sk_test_your_key" \\
  -d '{"plan_id": "plan_enterprise_monthly"}'`,
          node: `await mzzpay.subscriptions.update('sub_5hKp2', {
  plan_id: 'plan_enterprise_monthly',
});`,
          python: `mzzpay.Subscription.modify(
  "sub_5hKp2", plan_id="plan_enterprise_monthly"
)`,
        }}
        response={`{
  "id": "sub_5hKp2",
  "plan_id": "plan_enterprise_monthly",
  "proration_credit": 1850
}`}
      />

      <ApiEndpoint
        method="POST"
        path="/v1/subscriptions/:id/cancel"
        title="Cancel a Subscription"
        description="Immediately cancel or schedule cancellation at the end of the current period."
        params={[
          { name: "at_period_end", type: "boolean", required: false, desc: "If true, the subscription stays active until current_period_end" },
        ]}
        code={{
          curl: `curl -X POST https://api.mzzpay.io/v1/subscriptions/sub_5hKp2/cancel \\
  -H "Authorization: Bearer sk_test_your_key" \\
  -d '{"at_period_end": true}'`,
          node: `await mzzpay.subscriptions.cancel('sub_5hKp2', { at_period_end: true });`,
          python: `mzzpay.Subscription.cancel("sub_5hKp2", at_period_end=True)`,
        }}
        response={`{ "id": "sub_5hKp2", "status": "active", "cancel_at_period_end": true }`}
      />

      <ApiEndpoint
        method="GET"
        path="/v1/subscriptions"
        title="List Subscriptions"
        description="Paginated list of subscriptions. Filter by status or customer."
        params={[
          { name: "customer_id", type: "string", required: false, desc: "Filter by customer" },
          { name: "status", type: "string", required: false, desc: "trialing, active, past_due, canceled" },
        ]}
        code={{
          curl: `curl "https://api.mzzpay.io/v1/subscriptions?status=active" \\
  -H "Authorization: Bearer sk_test_your_key"`,
          node: `const subs = await mzzpay.subscriptions.list({ status: 'active' });`,
          python: `subs = mzzpay.Subscription.list(status="active")`,
        }}
        response={`{ "object": "list", "data": [...], "has_more": false }`}
      />
    </div>
  );
}
