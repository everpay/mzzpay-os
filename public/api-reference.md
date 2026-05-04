# MzzPay API Reference

Base URL: `https://api.mzzpay.io/v1`

## Authentication
```
Authorization: Bearer sk_live_…
```

## Payments
Charge customers via cards, wallets, open banking.

### `POST /payments`
Create a payment

### `GET /payments`
List payments

### `GET /payments/{id}`
Retrieve a payment

### `POST /payments/{id}/capture`
Capture a held authorization

### `POST /payments/{id}/refund`
Refund a payment

### `POST /payments/{id}/cancel`
Cancel a payment before capture

## Customers
Manage customer profiles and saved payment methods.

### `POST /customers`
Create a customer

### `GET /customers`
List customers

### `GET /customers/{id}`
Retrieve a customer

### `PATCH /customers/{id}`
Update a customer

### `DELETE /customers/{id}`
Soft-delete a customer

### `POST /customers/{id}/payment_methods`
Attach a saved payment method

## Invoices
Hosted billing documents with payment URLs.

### `POST /invoices`
Create an invoice

### `GET /invoices`
List invoices

### `GET /invoices/{id}`
Retrieve an invoice

### `POST /invoices/{id}/send`
Email the hosted invoice link

### `POST /invoices/{id}/void`
Void an unpaid invoice

## Products
Catalog entries for invoices and subscriptions.

### `POST /products`
Create a product

### `GET /products`
List products

### `GET /products/{id}`
Retrieve a product

### `PATCH /products/{id}`
Update a product

### `DELETE /products/{id}`
Delete a product

## Refunds
Full and partial refund management.

### `GET /refunds`
List refunds

### `GET /refunds/{id}`
Retrieve a refund

## Payouts
Withdraw funds to bank accounts.

### `POST /payouts`
Request a payout

### `GET /payouts`
List payouts

### `GET /payouts/{id}`
Retrieve a payout

## Subscriptions
Recurring billing with dunning and proration.

### `POST /subscriptions`
Create a subscription

### `GET /subscriptions`
List subscriptions

### `GET /subscriptions/{id}`
Retrieve a subscription

### `PATCH /subscriptions/{id}`
Update a subscription

### `DELETE /subscriptions/{id}`
Cancel a subscription

## Disputes
Chargeback and dispute management.

### `GET /disputes`
List disputes

### `GET /disputes/{id}`
Retrieve a dispute

### `POST /disputes/{id}/evidence`
Submit dispute evidence

## Wallets & Balances
Fiat wallet balances and ledger entries.

### `GET /wallets`
List fiat wallets

### `GET /wallets/balance-transactions`
List balance transactions (ledger)

## Payment Links
Shareable, hosted checkout links.

### `POST /payment-links`
Create a payment link

### `GET /payment-links`
List payment links

## FX
Foreign exchange rates and conversions.

### `GET /fx/rates`
Get current FX rates

### `POST /fx/convert`
Convert between currencies

## Webhooks
Event delivery endpoints.

### `POST /webhooks/endpoints`
Register a webhook endpoint

### `GET /webhooks/endpoints`
List webhook endpoints

### `DELETE /webhooks/endpoints/{id}`
Delete a webhook endpoint
