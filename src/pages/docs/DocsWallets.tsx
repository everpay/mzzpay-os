import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CodeBlock } from "@/components/docs/CodeBlock";
import { ApiEndpoint } from "@/components/docs/ApiEndpoint";
import { DocsDownloadActions } from "@/components/docs/DocsDownloadActions";
import { Callout } from "@/components/docs/Callout";

export default function DocsWallets() {
  return (
    <div className="max-w-4xl mx-auto space-y-10">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <Badge variant="secondary" className="mb-3">API Reference</Badge>
          <h1 className="text-3xl font-heading font-bold tracking-tight">Wallets &amp; Balances API</h1>
          <p className="text-muted-foreground mt-2">
            MzzPay maintains separate ledger accounts per merchant per currency. Fiat
            balances live in <code>public.accounts</code>; crypto balances live in
            <code> public.crypto_wallets</code>. Both use a double-entry model — every credit
            in <code>ledger_entries</code> has a matching debit.
          </p>
        </div>
        <DocsDownloadActions />
      </div>

      <Callout variant="info" title="Available vs. Pending vs. Reserved">
        <code>balance</code> = total. <code>available_balance</code> = withdrawable now.
        <code> pending_balance</code> = settling (T+0/T+1/T+2 by rail). The difference is
        held by rolling reserves and unsettled processor batches.
      </Callout>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">The Account (Fiat Wallet) Object</CardTitle>
        </CardHeader>
        <CardContent>
          <CodeBlock
            code={`{
  "id": "1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d",
  "merchant_id": "9b1c2d3e-...",
  "currency": "USD",
  "balance": 18425.00,
  "available_balance": 17505.00,
  "pending_balance": 1240.00,
  "created_at": "2026-04-22T10:00:00Z",
  "updated_at": "2026-04-22T10:00:00Z"
}`}
            language="curl"
          />
          <p className="text-xs text-muted-foreground mt-2">
            Source: <code>public.accounts</code>. Rolling reserve held off-balance in
            <code> public.rolling_reserves</code>.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">The Crypto Wallet Object</CardTitle>
        </CardHeader>
        <CardContent>
          <CodeBlock
            code={`{
  "id": "0a1b2c3d-...",
  "merchant_id": "9b1c2d3e-...",
  "store_id": "ee11ff22-...",
  "asset_id": "USDT_TRC20",
  "network": "TRC20",
  "address": "TXYZabc...",
  "balance": 1250.42,
  "available": 1180.42,
  "on_hold": 70.00,
  "base_balance": 1250.42,
  "is_default": true,
  "is_active": true,
  "status": "active",
  "metadata": {},
  "created_at": "2026-04-22T10:00:00Z"
}`}
            language="curl"
          />
          <p className="text-xs text-muted-foreground mt-2">
            Source: <code>public.crypto_wallets</code>. <code>base_balance</code> is the
            store's reporting-currency equivalent (snapshot).
          </p>
        </CardContent>
      </Card>

      <ApiEndpoint
        method="GET"
        path="/rest/v1/accounts"
        title="List Fiat Wallets"
        description="Returns one accounts row per (merchant, currency) you transact in."
        params={[
          { name: "currency", type: "string", required: false, desc: "eq.USD / eq.EUR / eq.GBP" },
          { name: "select", type: "string", required: false, desc: "Column projection" },
        ]}
        code={{
          curl: `curl "https://api.mzzpay.io/rest/v1/accounts?select=currency,balance,available_balance,pending_balance" \\
  -H "Authorization: Bearer <user_jwt>" \\
  -H "apikey: <publishable_key>"`,
          node: `const { data } = await supabase.from('accounts').select('*');`,
          python: `supabase.table("accounts").select("*").execute()`,
        }}
        response={`[
  { "currency": "USD", "balance": 18425, "available_balance": 17505, "pending_balance": 1240 },
  { "currency": "EUR", "balance": 9820, "available_balance": 9410, "pending_balance": 410 }
]`}
      />

      <ApiEndpoint
        method="GET"
        path="/rest/v1/crypto_wallets"
        title="List Crypto Wallets"
        description="Returns crypto wallets across all of a merchant's stores. Filter ?store_id=eq.{id} to scope to one store."
        params={[
          { name: "store_id", type: "uuid", required: false, desc: "Scope to one crypto_stores row" },
          { name: "asset_id", type: "string", required: false, desc: "Filter by asset symbol" },
          { name: "is_active", type: "boolean", required: false, desc: "eq.true to hide disabled wallets" },
        ]}
        code={{
          curl: `curl "https://api.mzzpay.io/rest/v1/crypto_wallets?is_active=eq.true" \\
  -H "Authorization: Bearer <user_jwt>" \\
  -H "apikey: <publishable_key>"`,
          node: `const { data } = await supabase.from('crypto_wallets').select('*').eq('is_active', true);`,
          python: `supabase.table("crypto_wallets").select("*").eq("is_active", True).execute()`,
        }}
        response={`[
  { "id": "0a1b...", "asset_id": "USDT_TRC20", "balance": 1250.42, "available": 1180.42 }
]`}
      />

      <ApiEndpoint
        method="GET"
        path="/rest/v1/ledger_entries"
        title="List Balance Transactions"
        description="The double-entry ledger. Every transaction (payment, refund, payout, fee, FX, adjustment) is recorded as a credit/debit pair."
        params={[
          { name: "transaction_id", type: "uuid", required: false, desc: "Filter to a single source transaction" },
          { name: "currency", type: "string", required: false, desc: "Filter by ledger currency" },
          { name: "entry_type", type: "string", required: false, desc: "credit | debit" },
        ]}
        code={{
          curl: `curl "https://api.mzzpay.io/rest/v1/ledger_entries?currency=eq.USD&order=created_at.desc&limit=25" \\
  -H "Authorization: Bearer <user_jwt>" \\
  -H "apikey: <publishable_key>"`,
          node: `const { data } = await supabase.from('ledger_entries').select('*').eq('currency','USD').limit(25);`,
          python: `supabase.table("ledger_entries").select("*").eq("currency","USD").execute()`,
        }}
        response={`[
  {
    "id": "btx_001",
    "transaction_id": "9b1c...",
    "account_id": "1a2b...",
    "currency": "USD",
    "entry_type": "credit",
    "amount": 50.00,
    "created_at": "2026-04-22T10:00:00Z"
  }
]`}
      />
    </div>
  );
}
