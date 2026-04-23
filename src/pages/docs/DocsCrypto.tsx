import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CodeBlock } from "@/components/docs/CodeBlock";
import { ApiEndpoint } from "@/components/docs/ApiEndpoint";
import { DocsDownloadActions } from "@/components/docs/DocsDownloadActions";
import { Callout } from "@/components/docs/Callout";

export default function DocsCrypto() {
  return (
    <div className="max-w-4xl mx-auto space-y-10">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <Badge variant="secondary" className="mb-3">API Reference</Badge>
          <h1 className="text-3xl font-heading font-bold tracking-tight">Crypto API</h1>
          <p className="text-muted-foreground mt-2">
            Accept stablecoin and native-asset payments through MzzPay's Elektropay-backed
            crypto rails. Charges are recorded as <code>crypto_transactions</code> rows and
            settled to your <code>crypto_wallets</code> on confirmation.
          </p>
        </div>
        <DocsDownloadActions />
      </div>

      <Callout variant="info" title="Public endpoint — no merchant JWT required">
        <code>crypto-pay</code> is callable from hosted checkout and invoice payment pages.
        The receiving merchant is resolved from <code>invoice_id</code> or an explicit{" "}
        <code>merchant_id</code>. A store and wallet are auto-provisioned on first use.
      </Callout>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">The Crypto Transaction Object</CardTitle>
        </CardHeader>
        <CardContent>
          <CodeBlock
            code={`{
  "id": "c1a2b3c4-...",
  "merchant_id": "mer_abc123",
  "store_id": "str_x8s2",
  "wallet_id": "wal_usdt",
  "asset_id": "USDT",
  "tx_type": "deposit",
  "status": "pending",
  "amount": 49.99,
  "fee": 0.50,
  "to_address": "0x742d35Cc6634C0532925a3b8D697...",
  "tx_hash": null,
  "elektropay_id": "ep_dep_8821",
  "metadata": { "asset_network": "tron" },
  "created_at": "2026-04-22T12:00:00Z"
}`}
            language="curl"
          />
        </CardContent>
      </Card>

      <ApiEndpoint
        method="POST"
        path="/functions/v1/crypto-pay"
        title="Create a Crypto Charge"
        description="Generate a deposit address for a customer to send funds. The webhook from elektropay-webhook will flip status to complete once enough confirmations are reached."
        params={[
          { name: "asset_id", type: "string", required: true, desc: "USDT, USDC, BTC, ETH, TRX, etc." },
          { name: "amount", type: "number", required: true, desc: "Amount in fiat currency major units" },
          { name: "currency", type: "string", required: true, desc: "Fiat currency to quote against (e.g. USD)" },
          { name: "merchant_id", type: "uuid", required: false, desc: "Receiving merchant. Required if invoice_id is omitted" },
          { name: "invoice_id", type: "uuid", required: false, desc: "Pay-this-invoice flow. Resolves merchant_id automatically" },
          { name: "description", type: "string", required: false, desc: "Note saved on the crypto_transactions row" },
          { name: "reference", type: "string", required: false, desc: "External reference (order id, etc.)" },
        ]}
        code={{
          curl: `curl -X POST https://api.mzzpay.io/functions/v1/crypto-pay \\
  -H "Content-Type: application/json" \\
  -d '{
    "merchant_id": "mer_abc123",
    "asset_id": "USDT",
    "amount": 49.99,
    "currency": "USD",
    "reference": "order_42"
  }'`,
          node: `const { data } = await supabase.functions.invoke('crypto-pay', {
  body: {
    merchant_id: 'mer_abc123',
    asset_id: 'USDT',
    amount: 49.99,
    currency: 'USD',
  },
});`,
          python: `data = supabase.functions.invoke("crypto-pay", body={
    "merchant_id": "mer_abc123",
    "asset_id": "USDT",
    "amount": 49.99,
    "currency": "USD",
})`,
        }}
        response={`{
  "success": true,
  "transaction_id": "c1a2b3c4-...",
  "deposit_address": "0x742d35Cc6634C0532925a3b8D697...",
  "asset_id": "USDT",
  "amount": 49.99,
  "currency": "USD",
  "expires_at": "2026-04-22T13:00:00Z"
}`}
      />

      <ApiEndpoint
        method="POST"
        path="/functions/v1/elektropay-wallet"
        title="Withdraw to External Wallet"
        description="Submit an on-chain withdrawal from a merchant's crypto_wallet. Validates min/max withdrawal amounts on crypto_assets and records a withdrawal entry in crypto_transactions."
        params={[
          { name: "wallet_id", type: "uuid", required: true, desc: "Source wallet" },
          { name: "to_address", type: "string", required: true, desc: "Destination on-chain address" },
          { name: "amount", type: "number", required: true, desc: "Amount in the asset's base unit" },
          { name: "network", type: "string", required: false, desc: "Override network (e.g. tron, eth) when the asset supports multiple chains" },
        ]}
        code={{
          curl: `curl -X POST https://api.mzzpay.io/functions/v1/elektropay-wallet \\
  -H "Authorization: Bearer <user_jwt>" \\
  -d '{
    "wallet_id": "wal_usdt",
    "to_address": "0x742d35...",
    "amount": 100,
    "network": "tron"
  }'`,
          node: `await supabase.functions.invoke('elektropay-wallet', {
  body: { wallet_id: 'wal_usdt', to_address: '0x742d35...', amount: 100, network: 'tron' },
});`,
          python: `supabase.functions.invoke("elektropay-wallet", body={ "wallet_id": "wal_usdt", "to_address": "0x742d35...", "amount": 100 })`,
        }}
        response={`{
  "success": true,
  "withdrawal": {
    "id": "c2b3c4d5-...",
    "tx_type": "withdrawal",
    "status": "pending",
    "elektropay_id": "ep_wd_4421"
  }
}`}
      />

      <ApiEndpoint
        method="GET"
        path="/rest/v1/crypto_wallets"
        title="List Wallets"
        description="Returns one row per merchant + store + asset combination."
        params={[
          { name: "merchant_id", type: "uuid", required: false, desc: "eq.<id>" },
          { name: "asset_id", type: "string", required: false, desc: "eq.USDT" },
          { name: "is_active", type: "boolean", required: false, desc: "eq.true" },
        ]}
        code={{
          curl: `curl "https://api.mzzpay.io/rest/v1/crypto_wallets?is_active=eq.true" \\
  -H "Authorization: Bearer <user_jwt>" \\
  -H "apikey: <publishable_key>"`,
          node: `const { data } = await supabase
  .from('crypto_wallets')
  .select('*')
  .eq('is_active', true);`,
          python: `data = supabase.table("crypto_wallets").select("*").eq("is_active", True).execute()`,
        }}
        response={`[
  {
    "id": "wal_usdt",
    "asset_id": "USDT",
    "balance": 1842.50,
    "available": 1750.50,
    "on_hold": 92.00,
    "address": "0x742d35..."
  }
]`}
      />
    </div>
  );
}
