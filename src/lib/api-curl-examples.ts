/**
 * Copy-pastable cURL examples for the API reference.
 * Keyed by operationId to match the OpenAPI spec.
 */

const BASE = "https://api.mzzpay.io/v1";

export const CURL_EXAMPLES: Record<string, { title: string; curl: string; description: string }> = {
  /* ── Payments ─────────────────────────────────────── */
  createPayment: {
    title: "Create a payment",
    description: "Charge a customer using a card token. Amount is in minor units (cents).",
    curl: `curl -X POST ${BASE}/payments \\
  -H "Authorization: Bearer sk_test_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -H "Idempotency-Key: $(uuidgen)" \\
  -d '{
    "amount": 5000,
    "currency": "usd",
    "payment_method": "pm_card_visa",
    "description": "Order #1234",
    "customer_id": "cus_abc123",
    "metadata": { "order_id": "ORD-1234" }
  }'`,
  },
  listPayments: {
    title: "List payments",
    description: "Retrieve a paginated list of payments. Filter by status or date range.",
    curl: `curl "${BASE}/payments?limit=25&status=succeeded&created%5Bgte%5D=2026-01-01T00:00:00Z" \\
  -H "Authorization: Bearer sk_test_YOUR_KEY"`,
  },
  getPayment: {
    title: "Retrieve a payment",
    description: "Fetch a single payment by its ID.",
    curl: `curl "${BASE}/payments/txn_9b1c2d3e-4f5a-6b7c-8d9e-0a1b2c3d4e5f" \\
  -H "Authorization: Bearer sk_test_YOUR_KEY"`,
  },
  capturePayment: {
    title: "Capture a held authorization",
    description: "Capture a payment that was created with capture=false.",
    curl: `curl -X POST "${BASE}/payments/txn_9b1c2d3e-4f5a-6b7c-8d9e-0a1b2c3d4e5f/capture" \\
  -H "Authorization: Bearer sk_test_YOUR_KEY" \\
  -H "Idempotency-Key: $(uuidgen)"`,
  },
  refundPayment: {
    title: "Refund a payment",
    description: "Issue a full or partial refund. Omit amount for a full refund.",
    curl: `curl -X POST "${BASE}/payments/txn_9b1c2d3e-4f5a-6b7c-8d9e-0a1b2c3d4e5f/refund" \\
  -H "Authorization: Bearer sk_test_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -H "Idempotency-Key: $(uuidgen)" \\
  -d '{ "amount": 2500, "reason": "customer_request" }'`,
  },
  cancelPayment: {
    title: "Cancel a payment",
    description: "Cancel an authorized payment before capture.",
    curl: `curl -X POST "${BASE}/payments/txn_9b1c2d3e-4f5a-6b7c-8d9e-0a1b2c3d4e5f/cancel" \\
  -H "Authorization: Bearer sk_test_YOUR_KEY"`,
  },

  /* ── Customers ────────────────────────────────────── */
  createCustomer: {
    title: "Create a customer",
    description: "Create a new customer. Deduplicates on email per merchant.",
    curl: `curl -X POST ${BASE}/customers \\
  -H "Authorization: Bearer sk_test_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "email": "jane@example.com",
    "name": "Jane Doe",
    "phone": "+1234567890",
    "metadata": { "source": "website" }
  }'`,
  },
  listCustomers: {
    title: "List customers",
    description: "Retrieve all customers with cursor-based pagination.",
    curl: `curl "${BASE}/customers?limit=50" \\
  -H "Authorization: Bearer sk_test_YOUR_KEY"`,
  },
  getCustomer: {
    title: "Retrieve a customer",
    description: "Fetch a single customer by ID.",
    curl: `curl "${BASE}/customers/cus_abc123" \\
  -H "Authorization: Bearer sk_test_YOUR_KEY"`,
  },
  updateCustomer: {
    title: "Update a customer",
    description: "Patch customer fields.",
    curl: `curl -X PATCH "${BASE}/customers/cus_abc123" \\
  -H "Authorization: Bearer sk_test_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{ "name": "Jane Smith", "phone": "+1987654321" }'`,
  },
  deleteCustomer: {
    title: "Delete a customer",
    description: "Soft-delete. PII is anonymized within 30 days.",
    curl: `curl -X DELETE "${BASE}/customers/cus_abc123" \\
  -H "Authorization: Bearer sk_test_YOUR_KEY"`,
  },
  attachPaymentMethod: {
    title: "Attach a payment method",
    description: "Attach a tokenized card (pm_… token) to a customer.",
    curl: `curl -X POST "${BASE}/customers/cus_abc123/payment_methods" \\
  -H "Authorization: Bearer sk_test_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{ "token": "pm_card_visa_4242" }'`,
  },

  /* ── Invoices ─────────────────────────────────────── */
  createInvoice: {
    title: "Create an invoice",
    description: "Create a new invoice with line items. A hosted payment URL is auto-generated.",
    curl: `curl -X POST ${BASE}/invoices \\
  -H "Authorization: Bearer sk_test_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -H "Idempotency-Key: $(uuidgen)" \\
  -d '{
    "customer_id": "cus_abc123",
    "currency": "usd",
    "due_date": "2026-05-15",
    "items": [
      { "name": "Pro Plan", "qty": 1, "unit_price": 4900 },
      { "name": "API calls overage", "qty": 5000, "unit_price": 1 }
    ]
  }'`,
  },
  listInvoices: {
    title: "List invoices",
    description: "Retrieve invoices with optional status filter.",
    curl: `curl "${BASE}/invoices?limit=25" \\
  -H "Authorization: Bearer sk_test_YOUR_KEY"`,
  },
  sendInvoice: {
    title: "Send an invoice",
    description: "Email the hosted invoice link to the customer.",
    curl: `curl -X POST "${BASE}/invoices/inv_001/send" \\
  -H "Authorization: Bearer sk_test_YOUR_KEY"`,
  },
  voidInvoice: {
    title: "Void an invoice",
    description: "Cancel an unpaid invoice.",
    curl: `curl -X POST "${BASE}/invoices/inv_001/void" \\
  -H "Authorization: Bearer sk_test_YOUR_KEY"`,
  },

  /* ── Payouts ──────────────────────────────────────── */
  createPayout: {
    title: "Request a payout",
    description: "Withdraw available balance to a bank account.",
    curl: `curl -X POST ${BASE}/payouts \\
  -H "Authorization: Bearer sk_test_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -H "Idempotency-Key: $(uuidgen)" \\
  -d '{
    "amount": 150000,
    "currency": "usd",
    "bank_account_id": "ba_001"
  }'`,
  },
  listPayouts: {
    title: "List payouts",
    description: "Retrieve payout history with pagination.",
    curl: `curl "${BASE}/payouts?limit=25" \\
  -H "Authorization: Bearer sk_test_YOUR_KEY"`,
  },
  getPayout: {
    title: "Retrieve a payout",
    description: "Fetch a single payout by ID.",
    curl: `curl "${BASE}/payouts/po_001" \\
  -H "Authorization: Bearer sk_test_YOUR_KEY"`,
  },

  /* ── Wallets & Balances ───────────────────────────── */
  listWallets: {
    title: "List fiat wallets",
    description: "Returns one wallet per currency. Filter by currency.",
    curl: `curl "${BASE}/wallets?currency=usd" \\
  -H "Authorization: Bearer sk_test_YOUR_KEY"`,
  },
  listLedgerEntries: {
    title: "List balance transactions",
    description: "The double-entry ledger — every credit has a matching debit.",
    curl: `curl "${BASE}/wallets/balance-transactions?currency=usd&limit=25" \\
  -H "Authorization: Bearer sk_test_YOUR_KEY"`,
  },

  /* ── Subscriptions ────────────────────────────────── */
  createSubscription: {
    title: "Create a subscription",
    description: "Start a recurring billing plan for a customer.",
    curl: `curl -X POST ${BASE}/subscriptions \\
  -H "Authorization: Bearer sk_test_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -H "Idempotency-Key: $(uuidgen)" \\
  -d '{
    "customer_id": "cus_abc123",
    "plan_name": "Pro Monthly",
    "amount": 4900,
    "currency": "usd",
    "interval": "month",
    "payment_method": "pm_card_visa"
  }'`,
  },
  listSubscriptions: {
    title: "List subscriptions",
    description: "Retrieve all subscriptions with pagination.",
    curl: `curl "${BASE}/subscriptions?limit=25" \\
  -H "Authorization: Bearer sk_test_YOUR_KEY"`,
  },
  cancelSubscription: {
    title: "Cancel a subscription",
    description: "Cancel immediately. Customer retains access until period end.",
    curl: `curl -X DELETE "${BASE}/subscriptions/sub_001" \\
  -H "Authorization: Bearer sk_test_YOUR_KEY"`,
  },

  /* ── Disputes ─────────────────────────────────────── */
  listDisputes: {
    title: "List disputes",
    description: "Retrieve all chargebacks and disputes.",
    curl: `curl "${BASE}/disputes?limit=25" \\
  -H "Authorization: Bearer sk_test_YOUR_KEY"`,
  },
  getDispute: {
    title: "Retrieve a dispute",
    description: "Get dispute details including evidence deadline.",
    curl: `curl "${BASE}/disputes/dis_001" \\
  -H "Authorization: Bearer sk_test_YOUR_KEY"`,
  },
  submitEvidence: {
    title: "Submit dispute evidence",
    description: "Upload evidence to defend a chargeback.",
    curl: `curl -X POST "${BASE}/disputes/dis_001/evidence" \\
  -H "Authorization: Bearer sk_test_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "customer_communication": "Email thread showing delivery confirmation...",
    "receipt": "Receipt #1234 issued on 2026-04-10",
    "shipping_documentation": "Tracking: FEDEX-ABC123, delivered 2026-04-12"
  }'`,
  },

  /* ── FX ───────────────────────────────────────────── */
  getFxRates: {
    title: "Get FX rates",
    description: "Retrieve the current exchange rate between two currencies.",
    curl: `curl "${BASE}/fx/rates?from=USD&to=EUR" \\
  -H "Authorization: Bearer sk_test_YOUR_KEY"`,
  },
  convertCurrency: {
    title: "Convert currency",
    description: "Convert an amount between currencies at the current rate.",
    curl: `curl -X POST "${BASE}/fx/convert" \\
  -H "Authorization: Bearer sk_test_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{ "amount": 10000, "from": "USD", "to": "EUR" }'`,
  },

  /* ── Webhooks ─────────────────────────────────────── */
  createWebhookEndpoint: {
    title: "Register a webhook endpoint",
    description: "Subscribe to specific events delivered to your URL.",
    curl: `curl -X POST "${BASE}/webhooks/endpoints" \\
  -H "Authorization: Bearer sk_test_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "url": "https://your-app.com/webhooks/mzzpay",
    "events": [
      "payment.completed",
      "payment.failed",
      "refund.created",
      "dispute.created"
    ]
  }'`,
  },
  listWebhookEndpoints: {
    title: "List webhook endpoints",
    description: "Retrieve all registered webhook endpoints.",
    curl: `curl "${BASE}/webhooks/endpoints" \\
  -H "Authorization: Bearer sk_test_YOUR_KEY"`,
  },
  deleteWebhookEndpoint: {
    title: "Delete a webhook endpoint",
    description: "Remove a registered webhook endpoint.",
    curl: `curl -X DELETE "${BASE}/webhooks/endpoints/whe_001" \\
  -H "Authorization: Bearer sk_test_YOUR_KEY"`,
  },

  /* ── Payment Links ────────────────────────────────── */
  createPaymentLink: {
    title: "Create a payment link",
    description: "Generate a hosted checkout link that can be shared with customers.",
    curl: `curl -X POST ${BASE}/payment-links \\
  -H "Authorization: Bearer sk_test_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -H "Idempotency-Key: $(uuidgen)" \\
  -d '{
    "amount": 7500,
    "currency": "usd",
    "description": "Premium upgrade"
  }'`,
  },
  listPaymentLinks: {
    title: "List payment links",
    description: "Retrieve all payment links.",
    curl: `curl "${BASE}/payment-links?limit=25" \\
  -H "Authorization: Bearer sk_test_YOUR_KEY"`,
  },

  /* ── Reconciliation (internal) ────────────────────── */
  reconcileDrift: {
    title: "Check balance drift",
    description: "Compare account balances against ledger sums. Admin or merchant-scoped.",
    curl: `curl "${BASE}/reconcile-balance?action=drift" \\
  -H "Authorization: Bearer sk_test_YOUR_KEY"`,
  },
  reconcileAccount: {
    title: "Reconcile an account",
    description: "Atomically reset account balance to match ledger entries.",
    curl: `curl -X POST "${BASE}/reconcile-balance" \\
  -H "Authorization: Bearer sk_test_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "account_id": "9e7b9e1b-5aed-4f59-b987-28fe71fb89da",
    "reason": "Nightly reconciliation run"
  }'`,
  },
};
