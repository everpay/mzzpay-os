import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CodeBlock } from "@/components/docs/CodeBlock";
import { ApiEndpoint } from "@/components/docs/ApiEndpoint";
import { DocsDownloadActions } from "@/components/docs/DocsDownloadActions";
import { Callout } from "@/components/docs/Callout";

export default function Docs3DSecure() {
  return (
    <div className="max-w-4xl mx-auto space-y-10">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <Badge variant="secondary" className="mb-3">API Reference</Badge>
          <h1 className="text-3xl font-heading font-bold tracking-tight">3D Secure</h1>
          <p className="text-muted-foreground mt-2">
            Strong Customer Authentication (SCA) for card payments. MzzPay handles the
            challenge-vs-frictionless decision automatically inside{" "}
            <code>process-payment</code> — there is no separate authentication endpoint.
            When a challenge is required, the response surfaces the redirect URL on the
            transaction's <code>processor_raw_response</code> column.
          </p>
        </div>
        <DocsDownloadActions />
      </div>

      <Callout variant="info" title="3DS is automatic for EU/UK card flows">
        Card charges that need SCA come back with{" "}
        <code>transaction.status = "pending"</code> and a redirect URL nested at{" "}
        <code>transaction.processor_raw_response.three_ds.redirect_url</code>. After the
        cardholder completes the challenge, the issuer posts the result back to the
        processor and the merchant <code>webhook_url</code> receives a{" "}
        <code>payment.completed</code> or <code>payment.failed</code> event.
      </Callout>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">3DS-aware Transaction Response</CardTitle>
        </CardHeader>
        <CardContent>
          <CodeBlock
            code={`{
  "success": true,
  "transaction": {
    "id": "9b1c2d3e-...",
    "status": "pending",
    "amount": 50.00,
    "currency": "EUR",
    "provider": "mondo",
    "card_brand": "visa",
    "card_last4": "4242",
    "processor_raw_response": {
      "three_ds": {
        "required": true,
        "version": "2.2.0",
        "redirect_url": "https://3ds.acs.example/challenge/abc",
        "ds_transaction_id": "f4a83e..."
      }
    }
  }
}`}
            language="curl"
          />
          <p className="text-xs text-muted-foreground mt-2">
            On a frictionless flow the same shape returns with{" "}
            <code>three_ds.required = false</code>, plus <code>eci</code> and{" "}
            <code>cavv</code> values for the issuer's liability shift.
          </p>
        </CardContent>
      </Card>

      <ApiEndpoint
        method="POST"
        path="/functions/v1/process-payment"
        title="Charge with Automatic 3DS"
        description="Standard payment endpoint. If the issuer or merchant 3DS rules require a challenge, the response status is pending with a redirect URL the cardholder must visit."
        params={[
          { name: "amount", type: "number", required: true, desc: "Major units" },
          { name: "currency", type: "string", required: true, desc: "ISO 4217" },
          { name: "paymentMethod", type: "string", required: true, desc: "'card'" },
          { name: "cardDetails", type: "object", required: true, desc: "{ number, expMonth, expYear, cvc, holderName? }" },
          { name: "billing.country", type: "string", required: false, desc: "Drives EU/UK SCA enforcement" },
          { name: "idempotencyKey", type: "string", required: false, desc: "De-dupes retries" },
        ]}
        code={{
          curl: `curl -X POST "https://api.mzzpay.io/functions/v1/process-payment" \\
  -H "Authorization: Bearer <user_jwt>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "amount": 50,
    "currency": "EUR",
    "paymentMethod": "card",
    "cardDetails": { "number": "4242424242424242", "expMonth": "12", "expYear": "2027", "cvc": "123" },
    "billing": { "country": "FR" }
  }'`,
          node: `const { data } = await supabase.functions.invoke('process-payment', {
  body: { amount: 50, currency: 'EUR', paymentMethod: 'card', cardDetails: {...}, billing: { country: 'FR' } },
});
if (data?.transaction?.processor_raw_response?.three_ds?.redirect_url) {
  window.location.href = data.transaction.processor_raw_response.three_ds.redirect_url;
}`,
          python: `data = supabase.functions.invoke("process-payment", body={...})`,
        }}
        response={`{
  "success": true,
  "transaction": {
    "id": "9b1c...",
    "status": "pending",
    "processor_raw_response": {
      "three_ds": { "required": true, "redirect_url": "https://3ds.acs.example/...", "version": "2.2.0" }
    }
  }
}`}
      />

      <ApiEndpoint
        method="GET"
        path="/rest/v1/transactions?id=eq.{id}&select=id,status,processor_raw_response"
        title="Poll for 3DS Outcome"
        description="After redirecting the cardholder, poll the transaction (or — preferred — listen for the payment.completed / payment.failed webhook). The processor_raw_response gains eci, cavv and ds_transaction_id once the issuer confirms."
        code={{
          curl: `curl "https://api.mzzpay.io/rest/v1/transactions?id=eq.9b1c...&select=id,status,processor_raw_response" \\
  -H "Authorization: Bearer <user_jwt>" \\
  -H "apikey: <publishable_key>"`,
          node: `const { data } = await supabase.from('transactions')
  .select('id,status,processor_raw_response').eq('id', txnId).single();`,
          python: `supabase.table("transactions").select("id,status,processor_raw_response").eq("id", txn_id).single().execute()`,
        }}
        response={`[
  {
    "id": "9b1c...",
    "status": "completed",
    "processor_raw_response": {
      "three_ds": { "required": true, "eci": "05", "cavv": "AAABBg...", "ds_transaction_id": "f4a83e..." }
    }
  }
]`}
      />
    </div>
  );
}
