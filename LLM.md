Everpay Platform – AI Development Context (LLM.md)

This document provides architectural and development context for the Everpay platform so AI development tools (Lovable, LLM agents, copilots) can safely extend the system.

Scope of this context:
Start from Shopify integration request and include all architecture built afterward:

- Payment orchestration
- Multi-PSP routing
- Ledger financial core
- Treasury system
- Settlement engine
- Risk engine (Siggy)
- Fraud detection graph
- ML risk scoring
- Chargeback automation

---

1 Platform Overview

Everpay is a multi-region payment orchestration platform similar to Stripe / Adyen.

Core capabilities:

• Multi-processor routing
• Cross-border payments
• Multi-currency ledger
• Treasury liquidity pools
• Fraud detection (Siggy)
• Chargeback automation
• Merchant dashboards
• Admin financial controls

Regions supported:

- Europe (PSD2)
- Africa (Lipad / Marasoft)
- LATAM (FacilitaPay)
- US / Canada (Card processor)
- Global settlement via Delos (USD / USDC / USDT)

---

2 System Architecture

High level architecture:

Merchant Apps
↓
Payment API
↓
Payment Orchestration
↓
Siggy Risk Engine
↓
Routing Engine
↓
Payment Processor
↓
Ledger (double entry)
↓
Treasury
↓
Settlement

---

3 Key System Modules

Payment Orchestration

Handles:

- payment intents
- processor routing
- retries
- idempotency

Tables:

payment_intents
charges
payment_attempts
routing_rules

---

Routing Engine

Chooses best processor based on:

- fees
- success rate
- region
- fraud risk
- margin score

Processors integrated:

- Mondo
- FacilitaPay
- Lipad
- MarasoftPay
- US/Canada card processor

---

4 Ledger Financial Core

Double entry ledger required for financial integrity.

Tables:

ledger_accounts
ledger_entries

Rules:

debit + credit must balance.

Accounts:

merchant_balance
merchant_reserve
processor_clearing
platform_revenue
treasury_pool

---

5 Treasury System

Manages liquidity and settlement.

Tables:

treasury_accounts
liquidity_pools
pool_accounts
fx_positions
treasury_transfers

Treasury pools by region:

EU EUR Pool
LATAM BRL Pool
Africa NGN Pool
USD Global Pool

---

6 Settlement System

Handles merchant payouts and processor settlement.

Tables:

settlement_instructions
settlement_runs

Supported rails:

ACH
Fedwire
SEPA
PIX
Crypto / Stablecoin

---

7 Siggy Risk Engine

Everpay internal fraud system similar to Stripe Radar.

Capabilities:

- rule engine
- velocity checks
- device fingerprinting
- behavioral biometrics
- fraud graph analysis
- ML scoring

Possible decisions:

approve
review
challenge
block
reserve_increase

---

8 Fraud Graph System

Used to detect coordinated fraud rings.

Tables:

fraud_graph_nodes
fraud_graph_edges

Node types:

device
ip
card_hash
email
customer

Relationships connect nodes across transactions.

Admin visualization uses D3 graph rendering.

---

9 Device Reputation

Tracks fraud-associated devices.

Table:

device_reputation

Fields:

device_fingerprint
risk_score
fraud_events
chargebacks

---

10 Behavioral Biometrics

Used to detect bots and stolen cards.

Table:

behavioral_profiles

Signals collected:

typing speed
mouse entropy
session duration

---

11 ML Risk Scoring

Self-learning model trains from transaction outcomes.

Worker:

riskTrainer.ts

Training data source:

transaction_risk_scores

Features:

amount
velocity
device_risk
behavior_score

Prediction output:

chargeback_probability

---

12 Fraud Ring Detection

Service:

fraudRingDetector.ts

Logic:

Identify nodes with many connections across merchants.

If threshold exceeded:

create risk_event severity critical.

---

13 Automated Chargeback Defense

Chargebacks automatically sent to Chargeflow.

Service:

chargebackDefense.ts

Worker:

chargeback-defense-worker.ts

Evidence includes:

transaction ID
IP address
device fingerprint
receipt

---

14 Admin Pages

Admin portal contains:

/admin/risk
/admin/fraud-network
/admin/device-reputation
/admin/reserve-automation

These provide:

risk monitoring
fraud graph visualization
device risk tracking
reserve adjustment logs

---

15 Merchant Portal Pages

Merchant dashboards include:

/merchant/security
/merchant/settlements
/merchant/transactions
/merchant/wallets

Features:

fraud insights
settlement tracking
margin monitoring

---

16 Shopify Integration

Merchants can connect Shopify stores.

Data collected:

shop id
store domain
access token
webhook subscriptions

Tables:

shopify_stores
shopify_orders
shopify_webhooks

Payments created via Shopify orders feed into:

payment_intents → routing engine → ledger.

---

17 Global Treasury Model

Everpay operates treasury pools by region.

Regions:

Europe
Africa
LATAM
North America

Settlement provider:

Delos Financial

Currencies:

USD
USDC
USDT
EUR
BRL
NGN
KES

---

18 AI Margin Engine

Margin monitoring tracks:

processor fees
FX spreads
routing decisions

Alerts generated when:

margin compression detected.

---

19 AI Development Guidelines

When modifying system:

1 Do not break ledger double entry rules.
2 Merchant isolation must remain enforced via RLS.
3 All financial writes require idempotency keys.
4 Risk engine runs BEFORE routing.
5 Settlement only occurs after ledger posting.

---

20 Future Development Goals

Siggy v3 roadmap:

- cross-merchant fraud intelligence
- advanced ML scoring
- fraud ring clustering
- autonomous routing AI

Treasury roadmap:

- automated liquidity rebalancing
- FX hedging support
- capital efficiency optimization

---

END OF CONTEXT
