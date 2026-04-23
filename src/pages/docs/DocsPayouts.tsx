import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CodeBlock } from "@/components/docs/CodeBlock";
import { ApiEndpoint } from "@/components/docs/ApiEndpoint";
import { DocsDownloadActions } from "@/components/docs/DocsDownloadActions";
import { Callout } from "@/components/docs/Callout";

export default function DocsPayouts() {
  return (
    <div className="max-w-4xl mx-auto space-y-10">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <Badge variant="secondary" className="mb-3">API Reference</Badge>
          <h1 className="text-3xl font-heading font-bold tracking-tight">Payouts API</h1>
          <p className="text-muted-foreground mt-2">
            Move available balance to an external bank account or crypto address. Fiat
            payouts route through <code>moneto-wallet</code>; crypto via{" "}
            <code>elektropay-wallet</code>. Both write a unified record into{" "}
            <code>crypto_transactions</code> with <code>tx_type='withdrawal'</code>.
          </p>
        </div>
        <DocsDownloadActions />
      </div>

      <Callout variant="warning" title="Payouts deduct from available_balance only">
        Pending and rolling-reserve amounts are excluded.
      </Callout>

      <Card>
        <CardHeader><CardTitle className="text-lg">The Payout Object</CardTitle></CardHeader>
        <CardContent>
          <CodeBlock
            code={`{
  "id": "2b3c4d5e-6f7a-8b9c-0d1e-2f3a4b5c6d7e",
  "merchant_id": "9b1c2d3e-...",
  "wallet_id": "1a2b3c4d-...",
  "asset_id": "USD",
  "tx_type": "withdrawal",
  "amount": 1500.00,
  "fee": 1.50,
  "status": "pending",
  "to_address": "GB29NWBK60161331926819",
  "elektropay_id": "ep_8821k",
  "metadata": { "rail": "sepa" },
  "created_at": "2026-04-22T10:00:00Z"
}`}
            language="curl"
          />
          <p className="text-xs text-muted-foreground mt-2">
            Status flow: <code>pending → processing → complete | failed</code>.
          </p>
        </CardContent>
      </Card>

      <ApiEndpoint
        method="POST"
        path="/functions/v1/moneto-wallet"
        title="Create a Fiat Payout"
        description="Initiate USD/EUR/GBP payout via Moneto. Settles T+1 SEPA / T+2 SWIFT."
        params={[
          { name: "action", type: "string", required: true, desc: "Must be 'create_payout'" },
          { name: "amount", type: "number", required: true, desc: "Major units" },
          { name: "currency_code", type: "string", required: true, desc: "USD | EUR | GBP" },
          { name: "country_code", type: "string", required: true, desc: "ISO-3166 alpha-2" },
          { name: "bank_account", type: "object", required: true, desc: "{ institution_number, transit_number, account_number, account_holder_name }" },
          { name: "description", type: "string", required: false, desc: "Statement reference" },
        ]}
        code={{
          curl: `curl -X POST "https://api.mzzpay.io/functions/v1/moneto-wallet" -H "Authorization: Bearer <user_jwt>" -H "Content-Type: application/json" -d '{ "action":"create_payout", "amount":1500, "currency_code":"USD", "country_code":"US", "bank_account":{ "institution_number":"021", "transit_number":"00001", "account_number":"1234567890", "account_holder_name":"Acme Inc" } }'`,
          node: `await supabase.functions.invoke('moneto-wallet', { body: { action:'create_payout', amount:1500, currency_code:'USD', country_code:'US', bank_account: {...} } });`,
          python: `supabase.functions.invoke("moneto-wallet", body={"action":"create_payout", ...})`,
        }}
        response={`{ "success": true, "payout": { "id":"2b3c...", "amount":1500, "currency":"USD", "status":"pending", "external_id":"moneto_8821" } }`}
      />

      <ApiEndpoint
        method="POST"
        path="/functions/v1/elektropay-wallet"
        title="Create a Crypto Payout"
        description="Withdraw crypto to an external on-chain address. Validates wallet has sufficient available balance."
        params={[
          { name: "action", type: "string", required: true, desc: "Must be 'withdrawal'" },
          { name: "wallet_id", type: "uuid", required: true, desc: "Source crypto_wallets row" },
          { name: "asset_id", type: "string", required: true, desc: "e.g. BTC, USDT_TRC20" },
          { name: "amount", type: "number", required: true, desc: "Asset major units" },
          { name: "to_address", type: "string", required: true, desc: "Destination address" },
          { name: "network", type: "string", required: false, desc: "Network override" },
        ]}
        code={{
          curl: `curl -X POST "https://api.mzzpay.io/functions/v1/elektropay-wallet" -H "Authorization: Bearer <user_jwt>" -H "Content-Type: application/json" -d '{ "action":"withdrawal", "wallet_id":"1a2b...", "asset_id":"USDT_TRC20", "amount":250, "to_address":"TXYZ...abcd" }'`,
          node: `await supabase.functions.invoke('elektropay-wallet', { body: { action:'withdrawal', wallet_id, asset_id:'USDT_TRC20', amount:250, to_address } });`,
          python: `supabase.functions.invoke("elektropay-wallet", body={"action":"withdrawal", ...})`,
        }}
        response={`{ "success": true, "transaction": { "id":"2b3c...", "tx_type":"withdrawal", "amount":250, "status":"pending" } }`}
      />

      <ApiEndpoint
        method="GET"
        path="/rest/v1/crypto_transactions"
        title="List Payouts"
        description="Filter tx_type=eq.withdrawal to scope to payouts."
        params={[
          { name: "tx_type", type: "string", required: false, desc: "eq.withdrawal" },
          { name: "status", type: "string", required: false, desc: "eq.pending | eq.complete | eq.failed" },
        ]}
        code={{
          curl: `curl "https://api.mzzpay.io/rest/v1/crypto_transactions?tx_type=eq.withdrawal" -H "Authorization: Bearer <user_jwt>" -H "apikey: <publishable_key>"`,
          node: `await supabase.from('crypto_transactions').select('*').eq('tx_type','withdrawal');`,
          python: `supabase.table("crypto_transactions").select("*").eq("tx_type","withdrawal").execute()`,
        }}
        response={`[ { "id":"2b3c...", "tx_type":"withdrawal", "amount":1500, "status":"complete" } ]`}
      />
    </div>
  );
}
