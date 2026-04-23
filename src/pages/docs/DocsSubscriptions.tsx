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
            Recurring billing across <code>subscription_plans</code> (catalog) and{" "}
            <code>subscriptions</code> (per-customer enrollment). The{" "}
            <code>subscription-billing</code> cron charges due renewals;{" "}
            <code>prorate-subscription</code> handles plan changes mid-cycle.
          </p>
        </div>
        <DocsDownloadActions />
      </div>

      <Callout variant="info" title="Plans vs. Subscriptions">
        Create a <strong>plan</strong> once. Then create one <strong>subscription</strong> per
        customer that references the plan + a saved payment_methods row.
      </Callout>

      <Card>
        <CardHeader><CardTitle className="text-lg">The Subscription Plan Object</CardTitle></CardHeader>
        <CardContent>
          <CodeBlock
            code={`{
  "id": "5e6f7a8b-9c0d-1e2f-3a4b-5c6d7e8f9a0b",
  "merchant_id": "9b1c2d3e-...",
  "name": "Premium Annual",
  "amount": 249.00,
  "currency": "USD",
  "interval": "year",
  "interval_count": 1,
  "trial_enabled": true,
  "trial_duration": 14,
  "trial_unit": "days",
  "billing_period_unit": "months",
  "subscription_starts": "immediately",
  "ends_type": "never",
  "retry_logic": "4_retries_1d_fri_2d_5d",
  "status": "active"
}`}
            language="curl"
          />
          <p className="text-xs text-muted-foreground mt-2">
            Source: <code>public.subscription_plans</code> · <code>interval</code> ∈{" "}
            <code>day | week | month | year</code>.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">The Subscription Object</CardTitle></CardHeader>
        <CardContent>
          <CodeBlock
            code={`{
  "id": "4d5e6f7a-...",
  "customer_id": "8a2b1c3d-...",
  "plan_id": "5e6f7a8b-...",
  "payment_method_id": "3c4d5e6f-...",
  "status": "active",
  "current_period_start": "2026-04-22T10:00:00Z",
  "current_period_end": "2026-05-22T10:00:00Z",
  "trial_end": null,
  "canceled_at": null
}`}
            language="curl"
          />
          <p className="text-xs text-muted-foreground mt-2">
            Source: <code>public.subscriptions</code> · status ∈{" "}
            <code>active | past_due | canceled | paused | trial</code>.
          </p>
        </CardContent>
      </Card>

      <ApiEndpoint
        method="POST"
        path="/rest/v1/subscription_plans"
        title="Create a Plan"
        description="Insert a recurring plan. Plans are reusable across many subscriptions."
        params={[
          { name: "merchant_id", type: "uuid", required: true, desc: "Owning merchant" },
          { name: "name", type: "string", required: true, desc: "Display name" },
          { name: "amount", type: "number", required: true, desc: "Price per period" },
          { name: "currency", type: "string", required: true, desc: "ISO 4217" },
          { name: "interval", type: "string", required: true, desc: "day | week | month | year" },
          { name: "interval_count", type: "integer", required: false, desc: "Default 1" },
        ]}
        code={{
          curl: `curl -X POST "https://api.mzzpay.io/rest/v1/subscription_plans" -H "Authorization: Bearer <user_jwt>" -H "apikey: <publishable_key>" -H "Content-Type: application/json" -d '{ "merchant_id":"9b1c...", "name":"Premium Monthly", "amount":29, "currency":"USD", "interval":"month" }'`,
          node: `await supabase.from('subscription_plans').insert({
  merchant_id: merchant.id, name: 'Premium Monthly', amount: 29, currency: 'USD', interval: 'month',
}).select().single();`,
          python: `supabase.table("subscription_plans").insert({...}).execute()`,
        }}
        response={`[ { "id": "5e6f...", "amount": 29 } ]`}
      />

      <ApiEndpoint
        method="POST"
        path="/rest/v1/subscriptions"
        title="Subscribe a Customer"
        description="Link a customer + plan + saved payment method. current_period_end determines when subscription-billing will charge."
        params={[
          { name: "customer_id", type: "uuid", required: true, desc: "FK to customers" },
          { name: "plan_id", type: "uuid", required: true, desc: "FK to subscription_plans" },
          { name: "payment_method_id", type: "uuid", required: true, desc: "FK to payment_methods" },
          { name: "current_period_start", type: "timestamptz", required: true, desc: "Cycle start" },
          { name: "current_period_end", type: "timestamptz", required: true, desc: "Next charge date" },
        ]}
        code={{
          curl: `curl -X POST "https://api.mzzpay.io/rest/v1/subscriptions" -H "Authorization: Bearer <user_jwt>" -H "apikey: <publishable_key>" -H "Content-Type: application/json" -d '{ "customer_id":"8a2b...", "plan_id":"5e6f...", "payment_method_id":"3c4d...", "current_period_start":"2026-04-22T10:00:00Z", "current_period_end":"2026-05-22T10:00:00Z" }'`,
          node: `await supabase.from('subscriptions').insert({...});`,
          python: `supabase.table("subscriptions").insert({...}).execute()`,
        }}
        response={`[ { "id": "4d5e...", "status": "active" } ]`}
      />

      <ApiEndpoint
        method="POST"
        path="/functions/v1/subscription-billing"
        title="(Cron) Run Renewals"
        description="Selects active subscriptions where current_period_end <= now(), inserts a transactions row at plan.amount, rolls the period forward."
        code={{
          curl: `curl -X POST "https://api.mzzpay.io/functions/v1/subscription-billing" -H "Authorization: Bearer <service_role_key>"`,
          node: `await supabase.functions.invoke('subscription-billing');`,
          python: `supabase.functions.invoke("subscription-billing")`,
        }}
        response={`{ "success": true, "charged": 2, "items": [{ "subscriptionId":"4d5e...", "transactionId":"9b1c...", "amount":29 }] }`}
      />

      <ApiEndpoint
        method="POST"
        path="/functions/v1/prorate-subscription"
        title="Change Plan (Prorate)"
        description="Switch a subscription to a different plan mid-cycle. Returns prorated credit/charge breakdown and writes a provider_events entry."
        params={[
          { name: "subscription_id", type: "uuid", required: true, desc: "Subscription to change" },
          { name: "new_plan_id", type: "uuid", required: true, desc: "Target plan" },
        ]}
        code={{
          curl: `curl -X POST "https://api.mzzpay.io/functions/v1/prorate-subscription" -H "Authorization: Bearer <user_jwt>" -H "Content-Type: application/json" -d '{ "subscription_id":"4d5e...", "new_plan_id":"5e6f..." }'`,
          node: `await supabase.functions.invoke('prorate-subscription', { body: { subscription_id, new_plan_id } });`,
          python: `supabase.functions.invoke("prorate-subscription", body={...})`,
        }}
        response={`{ "success": true, "proration": { "old_plan":"Standard", "new_plan":"Premium", "days_remaining":17, "unused_credit":5.66, "new_charge":16.42, "prorated_amount":10.76, "is_upgrade":true, "currency":"USD" } }`}
      />

      <ApiEndpoint
        method="POST"
        path="/functions/v1/retry-payment"
        title="Smart-Retry a Failed Renewal"
        description="Re-attempts a failed subscription charge using the merchant's retry_settings. Pass force=true to bypass eligibility checks."
        params={[
          { name: "subscription_id", type: "uuid", required: false, desc: "Specific subscription; omit to retry all eligible" },
          { name: "force", type: "boolean", required: false, desc: "Skip eligibility checks" },
        ]}
        code={{
          curl: `curl -X POST "https://api.mzzpay.io/functions/v1/retry-payment" -H "Authorization: Bearer <service_role_key>" -d '{ "subscription_id":"4d5e..." }'`,
          node: `await supabase.functions.invoke('retry-payment', { body: { subscription_id } });`,
          python: `supabase.functions.invoke("retry-payment", body={"subscription_id": id})`,
        }}
        response={`{ "success": true, "retried": 1, "results": [...] }`}
      />

      <ApiEndpoint
        method="PATCH"
        path="/rest/v1/subscriptions?id=eq.{id}"
        title="Cancel / Pause"
        description="Set status to canceled (with canceled_at) or paused."
        code={{
          curl: `curl -X PATCH "https://api.mzzpay.io/rest/v1/subscriptions?id=eq.4d5e..." -H "Authorization: Bearer <user_jwt>" -H "apikey: <publishable_key>" -H "Content-Type: application/json" -d '{ "status":"canceled", "canceled_at":"2026-04-22T11:00:00Z" }'`,
          node: `await supabase.from('subscriptions').update({ status:'canceled', canceled_at: new Date().toISOString() }).eq('id', subId);`,
          python: `supabase.table("subscriptions").update({"status":"canceled"}).eq("id", id).execute()`,
        }}
        response={`[ { "id": "4d5e...", "status": "canceled" } ]`}
      />
    </div>
  );
}
