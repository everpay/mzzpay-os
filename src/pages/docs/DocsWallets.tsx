import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CodeBlock } from "@/components/docs/CodeBlock";
import { ApiEndpoint } from "@/components/docs/ApiEndpoint";
import { DocsDownloadActions } from "@/components/docs/DocsDownloadActions";

export default function DocsWallets() {
  return (
    <div className="max-w-4xl mx-auto space-y-10">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <Badge variant="secondary" className="mb-3">API Reference</Badge>
          <h1 className="text-3xl font-heading font-bold tracking-tight">Wallets &amp; Balances API</h1>
          <p className="text-muted-foreground mt-2">
            Inspect multi-currency balances, available vs. pending funds, and per-currency
            payout thresholds. MzzPay maintains separate ledger accounts for USD, EUR, GBP,
            and supported crypto assets.
          </p>
        </div>
        <DocsDownloadActions />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">The Wallet Object</CardTitle>
        </CardHeader>
        <CardContent>
          <CodeBlock
            code={`{
  "id": "wal_usd_main",
  "object": "wallet",
  "currency": "usd",
  "available": 1842500,
  "pending": 124000,
  "rolling_reserve": 92000,
  "next_payout_eligible": 1750500,
  "updated_at": "2026-04-22T10:00:00Z"
}`}
            language="curl"
          />
        </CardContent>
      </Card>

      <ApiEndpoint
        method="GET"
        path="/v1/wallets"
        title="List Wallets"
        description="Returns one wallet per currency you transact in."
        code={{
          curl: `curl https://api.mzzpay.io/v1/wallets \\
  -H "Authorization: Bearer sk_test_your_key"`,
          node: `const wallets = await mzzpay.wallets.list();`,
          python: `wallets = mzzpay.Wallet.list()`,
        }}
        response={`{
  "object": "list",
  "data": [
    { "currency": "usd", "available": 1842500, "pending": 124000 },
    { "currency": "eur", "available": 982000, "pending": 41000 }
  ]
}`}
      />

      <ApiEndpoint
        method="GET"
        path="/v1/wallets/:currency"
        title="Retrieve a Wallet"
        description="Detailed balance breakdown including reserves and the amount eligible for payout."
        code={{
          curl: `curl https://api.mzzpay.io/v1/wallets/usd \\
  -H "Authorization: Bearer sk_test_your_key"`,
          node: `const wallet = await mzzpay.wallets.retrieve('usd');`,
          python: `wallet = mzzpay.Wallet.retrieve("usd")`,
        }}
        response={`{
  "currency": "usd",
  "available": 1842500,
  "pending": 124000,
  "rolling_reserve": 92000
}`}
      />

      <ApiEndpoint
        method="GET"
        path="/v1/balance/transactions"
        title="List Balance Transactions"
        description="Audit trail of every credit and debit on your ledger — payments, refunds, payouts, fees, FX conversions, and adjustments."
        params={[
          { name: "currency", type: "string", required: false, desc: "Filter to a single ledger" },
          { name: "type", type: "string", required: false, desc: "payment, refund, payout, fee, fx, adjustment" },
          { name: "limit", type: "integer", required: false, desc: "Max results (1-100, default 25)" },
        ]}
        code={{
          curl: `curl "https://api.mzzpay.io/v1/balance/transactions?currency=usd" \\
  -H "Authorization: Bearer sk_test_your_key"`,
          node: `const txs = await mzzpay.balance.transactions.list({ currency: 'usd' });`,
          python: `txs = mzzpay.Balance.transactions.list(currency="usd")`,
        }}
        response={`{
  "object": "list",
  "data": [
    {
      "id": "btx_001",
      "type": "payment",
      "amount": 5000,
      "fee": 175,
      "net": 4825,
      "source": "pay_abc123"
    }
  ]
}`}
      />
    </div>
  );
}
