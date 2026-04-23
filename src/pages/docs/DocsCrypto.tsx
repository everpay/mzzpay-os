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
          <h1 className="text-3xl font-heading font-bold tracking-tight">Crypto Payments API</h1>
          <p className="text-muted-foreground mt-2">
            Accept BTC, ETH, USDT, USDC, and other supported assets. MzzPay generates a
            unique deposit address per charge and auto-converts to your settlement currency.
          </p>
        </div>
        <DocsDownloadActions />
      </div>

      <Callout variant="info" title="Confirmations are network-dependent">
        BTC requires <strong>2 confirmations</strong>, ETH/ERC-20 requires <strong>12</strong>,
        Polygon and BSC require <strong>20</strong>. The
        <code> crypto.charge.confirmed</code> webhook fires once the threshold is met.
      </Callout>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">The Crypto Charge Object</CardTitle>
        </CardHeader>
        <CardContent>
          <CodeBlock
            code={`{
  "id": "cch_2xLp9",
  "object": "crypto_charge",
  "asset": "usdt",
  "network": "tron",
  "address": "TRX9KpMs...QcL2",
  "amount_crypto": "199.50",
  "amount_fiat": 199.50,
  "fiat_currency": "usd",
  "status": "awaiting_payment",
  "expires_at": "2026-04-22T10:45:00Z",
  "settlement": { "currency": "usd", "auto_convert": true }
}`}
            language="curl"
          />
        </CardContent>
      </Card>

      <ApiEndpoint
        method="POST"
        path="/v1/crypto/charges"
        title="Create a Crypto Charge"
        description="Generate a unique address for the customer to send funds to. Funds are auto-converted to your settlement currency on confirmation."
        params={[
          { name: "amount", type: "number", required: true, desc: "Fiat amount (e.g. 199.50)" },
          { name: "currency", type: "string", required: true, desc: "Fiat currency (usd, eur, gbp)" },
          { name: "asset", type: "string", required: true, desc: "btc, eth, usdt, usdc, sol, matic" },
          { name: "network", type: "string", required: false, desc: "Required for multi-network assets (tron, ethereum, polygon, bsc)" },
          { name: "auto_convert", type: "boolean", required: false, desc: "Auto-settle to fiat. Defaults to true" },
          { name: "metadata", type: "object", required: false, desc: "Custom key-value tags" },
        ]}
        code={{
          curl: `curl -X POST https://api.mzzpay.io/v1/crypto/charges \\
  -H "Authorization: Bearer sk_test_your_key" \\
  -d '{
    "amount": 199.50,
    "currency": "usd",
    "asset": "usdt",
    "network": "tron"
  }'`,
          node: `const charge = await mzzpay.crypto.charges.create({
  amount: 199.50,
  currency: 'usd',
  asset: 'usdt',
  network: 'tron',
});`,
          python: `charge = mzzpay.Crypto.Charge.create(
  amount=199.50, currency="usd",
  asset="usdt", network="tron",
)`,
        }}
        response={`{
  "id": "cch_2xLp9",
  "address": "TRX9KpMs...QcL2",
  "amount_crypto": "199.50",
  "status": "awaiting_payment",
  "expires_at": "2026-04-22T10:45:00Z"
}`}
      />

      <ApiEndpoint
        method="GET"
        path="/v1/crypto/charges/:id"
        title="Retrieve a Crypto Charge"
        description="Returns the latest state including on-chain confirmations and settlement amount."
        code={{
          curl: `curl https://api.mzzpay.io/v1/crypto/charges/cch_2xLp9 \\
  -H "Authorization: Bearer sk_test_your_key"`,
          node: `const charge = await mzzpay.crypto.charges.retrieve('cch_2xLp9');`,
          python: `charge = mzzpay.Crypto.Charge.retrieve("cch_2xLp9")`,
        }}
        response={`{
  "id": "cch_2xLp9",
  "status": "confirmed",
  "tx_hash": "0x4c...8a",
  "confirmations": 12,
  "settled_amount": 199.18,
  "settled_currency": "usd"
}`}
      />

      <ApiEndpoint
        method="POST"
        path="/v1/crypto/withdrawals"
        title="Create a Crypto Withdrawal"
        description="Send crypto from your wallet to an external address. Subject to per-asset withdrawal limits."
        params={[
          { name: "asset", type: "string", required: true, desc: "Asset to withdraw" },
          { name: "network", type: "string", required: false, desc: "Required for multi-network assets" },
          { name: "amount", type: "string", required: true, desc: "Amount as a string to preserve precision" },
          { name: "address", type: "string", required: true, desc: "Destination wallet address" },
        ]}
        code={{
          curl: `curl -X POST https://api.mzzpay.io/v1/crypto/withdrawals \\
  -H "Authorization: Bearer sk_test_your_key" \\
  -d '{"asset":"usdc","network":"polygon","amount":"500.00","address":"0xAbc..."}'`,
          node: `await mzzpay.crypto.withdrawals.create({
  asset: 'usdc', network: 'polygon',
  amount: '500.00', address: '0xAbc...',
});`,
          python: `mzzpay.Crypto.Withdrawal.create(
  asset="usdc", network="polygon",
  amount="500.00", address="0xAbc...",
)`,
        }}
        response={`{
  "id": "cwd_71zQ",
  "status": "broadcasting",
  "tx_hash": null,
  "estimated_arrival": "2026-04-22T10:18:00Z"
}`}
      />
    </div>
  );
}
