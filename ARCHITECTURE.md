Mzzpay Platform – Architecture Rules

This document defines the engineering architecture and system boundaries for the Everpay platform.
AI development tools must follow these rules when generating code.

Mzzpay is a financial-grade payment orchestration system.
Integrity of financial data and merchant isolation is critical.

---

1 Core System Principles

Mzzpay follows five strict principles.

1. Financial Integrity

All financial state must be derived from the ledger.

No system may mutate balances directly.

Balances are derived from:

ledger_entries

Every financial action must create double-entry postings.

Example:

Debit: processor_clearing
Credit: merchant_balance

---

2 Ledger Immutability

Ledger entries must never be modified or deleted.

Rules:

• Only INSERT operations allowed
• Updates are forbidden
• Deletes are forbidden

Reversals must create compensating ledger entries.

---

3 Idempotent Financial Writes

All financial actions must support idempotency.

Example:

payment_intent → charge → ledger_post

Duplicate API calls must not create duplicate ledger entries.

Use:

idempotency_keys

---

4 Multi-Tenant Isolation

Everpay is a multi-tenant platform.

All data must be scoped by:

tenant_id
merchant_id

Row Level Security (RLS) must always be enforced.

No query should return cross-merchant data.

---

5 Risk Before Money Movement

Fraud and risk systems must run before routing.

Order of operations:

Payment Intent
↓
Siggy Risk Engine
↓
Routing Engine
↓
Processor
↓
Ledger

---

2 System Components

Mzzpay consists of the following services.

---

Payment API

Responsible for:

• creating payment intents
• confirming payments
• creating charges

Key tables:

payment_intents
charges
payment_attempts

---

Routing Engine

Determines which processor should handle a payment.

Routing factors:

• region
• processor success rate
• processor fees
• fraud score
• margin score

Tables:

routing_rules
payment_processors
processor_fees

---

Ledger Service

Handles all financial accounting.

Tables:

ledger_accounts
ledger_entries

Accounts include:

merchant_balance
merchant_reserve
processor_clearing
platform_revenue
treasury_pool

---

Treasury System

Manages liquidity pools and settlement flows.

Tables:

treasury_accounts
liquidity_pools
pool_accounts
fx_positions

Treasury pools exist per region.

Example:

EU EUR Pool
LATAM BRL Pool
Africa NGN Pool
USD Global Pool

---

Settlement Engine

Responsible for paying merchants.

Tables:

settlement_instructions
settlement_runs
payouts

Settlement rails include:

ACH
Fedwire
SEPA
PIX
Crypto settlements

---

Siggy Risk Engine

Internal fraud detection system.

Capabilities:

• rule engine
• velocity checks
• device fingerprinting
• behavioral biometrics
• fraud graph detection
• ML scoring

Tables:

transaction_risk_scores
device_reputation
behavioral_profiles
fraud_graph_nodes
fraud_graph_edges

Possible decisions:

approve
review
block
challenge
reserve_increase

---

3 Fraud Graph System

Fraud detection uses network graph analysis.

Nodes represent:

device
ip_address
card_hash
email
customer

Edges represent relationships between nodes.

Graph is visualized using D3 network graphs.

Admin page:

/admin/fraud-network

---

4 Device Intelligence

Device fingerprinting generates a unique device ID.

Stored in:

device_reputation

Device score updates when:

• fraud detected
• chargebacks occur
• velocity thresholds exceeded

---

5 Behavioral Biometrics

Used to detect bots or stolen cards.

Signals captured:

typing cadence
mouse movement entropy
session timing

Stored in:

behavioral_profiles

---

6 Chargeback Automation

Everpay integrates with:

Chargeflow.

Chargebacks are automatically defended when possible.

Flow:

chargeback_event
↓
evidence_collection
↓
chargeflow_submission
↓
case_tracking

Service:

chargebackDefense.ts

Worker:

chargeback-defense-worker.ts

---

7 Shopify Integration

Merchants can connect Shopify stores.

Tables:

shopify_stores
shopify_orders
shopify_webhooks

Shopify events trigger payment flows.

Flow:

Shopify Order
↓
Mzzpay Payment Intent
↓
Routing Engine
↓
Processor
↓
Ledger

---

8 Margin Monitoring

Mzzpay tracks profit margin on each payment.

Margin calculation:

merchant_fee
- processor_fee
- FX spread

If margin drops below threshold:

create margin compression alert.

Admin page:

/admin/reserve-automation

---

9 Reserve Automation

Reserves protect platform against fraud losses.

Reserve levels adjust based on:

• fraud score
• chargeback rate
• merchant history

Stored in:

merchant_reserves
reserve_adjustments

---

10 Treasury Liquidity Stress Testing

Treasury system must support stress simulations.

Scenarios include:

processor outage
currency volatility
mass merchant payouts

Simulation service:

treasuryStressTest.ts

---

11 Development Rules

When generating code:

DO:

• use TypeScript
• follow service-based architecture
• separate API / services / workers
• log all financial events

DO NOT:

• mutate balances directly
• bypass ledger
• bypass risk engine
• bypass idempotency

---

12 Admin Portal Structure

Admin routes:

/admin/risk
/admin/fraud-network
/admin/device-reputation
/admin/reserve-automation
/admin/treasury
/admin/settlements

---

13 Merchant Portal Structure

Merchant routes:

/merchant/dashboard
/merchant/transactions
/merchant/security
/merchant/settlements
/merchant/wallets

---

14 Background Workers

Workers run async tasks.

Examples:

riskTrainer.ts
fraudRingDetector.ts
chargeback-defense-worker.ts
reconciliation-worker.ts
margin-monitor.ts

Workers should run via queue system.

---

15 Observability

All financial events must be logged.

Tables:

audit_logs
payment_logs
security_audit_logs
system_events

---

16 Security

Secrets stored in:

vault_secrets
credential_references

Sensitive data must use tokenization:

VGS (Very Good Security)

---

17 AI Development Safety

AI tools must never modify ledger entries directly.

All financial writes must go through:

ledgerService.postEntries()

All payment flows must pass through:

riskEngine.evaluate()

---

END
