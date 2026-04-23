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
          <h1 className="text-3xl font-heading font-bold tracking-tight">3D Secure API</h1>
          <p className="text-muted-foreground mt-2">
            Strong Customer Authentication (SCA) for card payments. MzzPay handles
            challenge-vs-frictionless flows automatically; this API exposes the underlying
            authentication objects for advanced flows.
          </p>
        </div>
        <DocsDownloadActions />
      </div>

      <Callout variant="info" title="3DS is automatic for EU/UK card flows">
        You typically do not need to call these endpoints. Pass <code>three_d_secure: &quot;automatic&quot;</code>
        on a payment and MzzPay will trigger the challenge when required, returning
        <code> requires_action</code> with a <code>next_action.redirect_url</code>.
      </Callout>

      <ApiEndpoint
        method="POST"
        path="/v1/3ds/authentications"
        title="Create a 3DS Authentication"
        description="Manually start a 3DS authentication for a payment method. Returns the challenge URL when required."
        params={[
          { name: "payment_method", type: "string", required: true, desc: "Payment method ID" },
          { name: "amount", type: "integer", required: true, desc: "Amount the auth is being requested for" },
          { name: "currency", type: "string", required: true, desc: "Currency of the auth" },
          { name: "return_url", type: "string", required: true, desc: "Where to redirect after the challenge" },
        ]}
        code={{
          curl: `curl -X POST https://api.mzzpay.io/v1/3ds/authentications \\
  -H "Authorization: Bearer sk_test_your_key" \\
  -d '{
    "payment_method": "pm_card_visa",
    "amount": 5000,
    "currency": "eur",
    "return_url": "https://shop.example.com/3ds/return"
  }'`,
          node: `const auth = await mzzpay.threeDS.authentications.create({
  payment_method: 'pm_card_visa',
  amount: 5000,
  currency: 'eur',
  return_url: 'https://shop.example.com/3ds/return',
});`,
          python: `auth = mzzpay.ThreeDS.Authentication.create(
  payment_method="pm_card_visa",
  amount=5000, currency="eur",
  return_url="https://shop.example.com/3ds/return",
)`,
        }}
        response={`{
  "id": "tds_8KqL2",
  "status": "challenge_required",
  "redirect_url": "https://3ds.acs.example/challenge/abc",
  "eci": null,
  "cavv": null
}`}
      />

      <ApiEndpoint
        method="GET"
        path="/v1/3ds/authentications/:id"
        title="Retrieve an Authentication"
        description="Poll for the outcome of a 3DS challenge. Returns ECI/CAVV values when frictionless or successful."
        code={{
          curl: `curl https://api.mzzpay.io/v1/3ds/authentications/tds_8KqL2 \\
  -H "Authorization: Bearer sk_test_your_key"`,
          node: `const auth = await mzzpay.threeDS.authentications.retrieve('tds_8KqL2');`,
          python: `auth = mzzpay.ThreeDS.Authentication.retrieve("tds_8KqL2")`,
        }}
        response={`{
  "id": "tds_8KqL2",
  "status": "succeeded",
  "eci": "05",
  "cavv": "AAABBg...",
  "ds_transaction_id": "f4a83e..."
}`}
      />
    </div>
  );
}
