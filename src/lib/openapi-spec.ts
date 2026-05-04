/**
 * OpenAPI 3.1 specification for MzzPay API.
 * Single source of truth — consumed by the Swagger UI page,
 * the downloadable openapi.json, and the Postman collection generator.
 */

import { DOCS_META } from "./docs-content";

export const OPENAPI_SPEC = {
  openapi: "3.1.0",
  info: {
    title: "MzzPay API",
    version: "1.0.0",
    description:
      "Unified payments API for cards, wallets, open banking, crypto and gaming rails. Intelligent provider routing, idempotent requests, real-time webhooks, and PCI-DSS Level 1 vaulting.",
    contact: { email: DOCS_META.contact, url: "https://mzzpay.io" },
    license: { name: "Proprietary" },
    "x-logo": { url: "/logos/visa.svg" },
  },
  servers: [
    { url: DOCS_META.baseUrl, description: "Production" },
    { url: "https://api.mzzpay.io/v1", description: "Live" },
  ],
  security: [{ BearerAuth: [] }],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "sk_live_… / sk_test_…",
        description: "Secret API key issued from the MzzPay dashboard.",
      },
    },
    schemas: {
      Error: {
        type: "object",
        properties: {
          error: {
            type: "object",
            properties: {
              type: { type: "string", enum: ["api_error", "card_error", "validation_error", "rate_limit_error"] },
              code: { type: "string" },
              decline_code: { type: "string", nullable: true },
              message: { type: "string" },
              param: { type: "string", nullable: true },
              doc_url: { type: "string", format: "uri" },
              request_id: { type: "string" },
            },
          },
        },
      },
      Payment: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          amount: { type: "number" },
          currency: { type: "string", minLength: 3, maxLength: 3 },
          status: { type: "string", enum: ["created", "requires_action", "processing", "succeeded", "failed", "canceled", "refunded"] },
          payment_method: { type: "string" },
          customer_id: { type: "string", format: "uuid", nullable: true },
          description: { type: "string", nullable: true },
          metadata: { type: "object", additionalProperties: { type: "string" } },
          statement_descriptor: { type: "string", nullable: true },
          next_action: {
            type: "object",
            nullable: true,
            properties: {
              redirect_url: { type: "string", format: "uri" },
            },
          },
          provider: { type: "string", nullable: true },
          provider_ref: { type: "string", nullable: true },
          error: { $ref: "#/components/schemas/Error/properties/error" },
          created_at: { type: "string", format: "date-time" },
          updated_at: { type: "string", format: "date-time" },
        },
        required: ["id", "amount", "currency", "status"],
      },
      Customer: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          email: { type: "string", format: "email" },
          name: { type: "string" },
          phone: { type: "string", nullable: true },
          metadata: { type: "object", additionalProperties: { type: "string" } },
          created_at: { type: "string", format: "date-time" },
        },
        required: ["id"],
      },
      Invoice: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          customer_id: { type: "string", format: "uuid" },
          amount: { type: "number" },
          currency: { type: "string" },
          status: { type: "string", enum: ["draft", "open", "paid", "overdue", "void"] },
          due_date: { type: "string", format: "date" },
          hosted_url: { type: "string", format: "uri" },
          items: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                qty: { type: "integer" },
                unit_price: { type: "number" },
                tax_rate: { type: "number", nullable: true },
              },
            },
          },
          created_at: { type: "string", format: "date-time" },
        },
      },
      Product: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          name: { type: "string" },
          description: { type: "string", nullable: true },
          price: { type: "number" },
          currency: { type: "string" },
          stock: { type: "integer", nullable: true },
          active: { type: "boolean" },
          metadata: { type: "object" },
          created_at: { type: "string", format: "date-time" },
        },
      },
      Refund: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          payment_id: { type: "string", format: "uuid" },
          amount: { type: "number" },
          currency: { type: "string" },
          status: { type: "string", enum: ["pending", "succeeded", "failed"] },
          reason: { type: "string", nullable: true },
          created_at: { type: "string", format: "date-time" },
        },
      },
      Payout: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          amount: { type: "number" },
          currency: { type: "string" },
          status: { type: "string", enum: ["pending", "in_transit", "paid", "failed", "canceled"] },
          arrival_date: { type: "string", format: "date" },
          bank_account_id: { type: "string", format: "uuid" },
          created_at: { type: "string", format: "date-time" },
        },
      },
      Subscription: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          customer_id: { type: "string", format: "uuid" },
          plan_name: { type: "string" },
          amount: { type: "number" },
          currency: { type: "string" },
          interval: { type: "string", enum: ["day", "week", "month", "year"] },
          status: { type: "string", enum: ["active", "past_due", "canceled", "trialing", "paused"] },
          current_period_start: { type: "string", format: "date-time" },
          current_period_end: { type: "string", format: "date-time" },
          created_at: { type: "string", format: "date-time" },
        },
      },
      Dispute: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          payment_id: { type: "string", format: "uuid" },
          amount: { type: "number" },
          currency: { type: "string" },
          reason: { type: "string" },
          status: { type: "string", enum: ["needs_response", "under_review", "won", "lost"] },
          evidence_due_by: { type: "string", format: "date-time" },
          created_at: { type: "string", format: "date-time" },
        },
      },
      Wallet: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          currency: { type: "string" },
          balance: { type: "number" },
          available_balance: { type: "number" },
          pending_balance: { type: "number" },
          created_at: { type: "string", format: "date-time" },
        },
      },
      LedgerEntry: {
        type: "object",
        properties: {
          id: { type: "string" },
          transaction_id: { type: "string", format: "uuid" },
          account_id: { type: "string", format: "uuid" },
          currency: { type: "string" },
          entry_type: { type: "string", enum: ["credit", "debit"] },
          amount: { type: "number" },
          created_at: { type: "string", format: "date-time" },
        },
      },
      PaymentLink: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          url: { type: "string", format: "uri" },
          amount: { type: "number" },
          currency: { type: "string" },
          active: { type: "boolean" },
          expires_at: { type: "string", format: "date-time", nullable: true },
          created_at: { type: "string", format: "date-time" },
        },
      },
      FxRate: {
        type: "object",
        properties: {
          from: { type: "string" },
          to: { type: "string" },
          rate: { type: "number" },
          timestamp: { type: "string", format: "date-time" },
        },
      },
      WebhookEndpoint: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          url: { type: "string", format: "uri" },
          events: { type: "array", items: { type: "string" } },
          active: { type: "boolean" },
          secret: { type: "string" },
          created_at: { type: "string", format: "date-time" },
        },
      },
      PaginatedList: {
        type: "object",
        properties: {
          object: { type: "string", const: "list" },
          data: { type: "array", items: {} },
          has_more: { type: "boolean" },
          next_cursor: { type: "string", nullable: true },
        },
      },
    },
    parameters: {
      IdempotencyKey: {
        name: "Idempotency-Key",
        in: "header",
        required: false,
        schema: { type: "string", format: "uuid" },
        description: "Unique key for idempotent retries.",
      },
      Cursor: {
        name: "cursor",
        in: "query",
        required: false,
        schema: { type: "string" },
        description: "Pagination cursor from previous response.",
      },
      Limit: {
        name: "limit",
        in: "query",
        required: false,
        schema: { type: "integer", minimum: 1, maximum: 100, default: 10 },
        description: "Number of items per page (1–100).",
      },
    },
  },
  paths: {
    "/payments": {
      post: {
        tags: ["Payments"],
        operationId: "createPayment",
        summary: "Create a payment",
        description: "Charge a customer for a one-off purchase. Supports card, wallet, open banking, and crypto.",
        parameters: [{ $ref: "#/components/parameters/IdempotencyKey" }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["amount", "currency", "payment_method"],
                properties: {
                  amount: { type: "integer", description: "Amount in smallest currency unit (cents)." },
                  currency: { type: "string", minLength: 3, maxLength: 3, description: "ISO-4217 lowercase." },
                  payment_method: { type: "string", description: "pm_… token from Checkout.js or saved method." },
                  capture: { type: "boolean", default: true, description: "False for auth-only." },
                  description: { type: "string" },
                  customer_id: { type: "string", format: "uuid" },
                  metadata: { type: "object", additionalProperties: { type: "string" } },
                  statement_descriptor: { type: "string", maxLength: 22 },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Payment created.", content: { "application/json": { schema: { $ref: "#/components/schemas/Payment" } } } },
          "400": { description: "Validation error.", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "402": { description: "Payment failed.", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
      get: {
        tags: ["Payments"],
        operationId: "listPayments",
        summary: "List payments",
        parameters: [
          { $ref: "#/components/parameters/Cursor" },
          { $ref: "#/components/parameters/Limit" },
          { name: "status", in: "query", schema: { type: "string" } },
          { name: "created[gte]", in: "query", schema: { type: "string", format: "date-time" } },
          { name: "created[lte]", in: "query", schema: { type: "string", format: "date-time" } },
        ],
        responses: {
          "200": { description: "Paginated list of payments.", content: { "application/json": { schema: { $ref: "#/components/schemas/PaginatedList" } } } },
        },
      },
    },
    "/payments/{id}": {
      get: {
        tags: ["Payments"],
        operationId: "getPayment",
        summary: "Retrieve a payment",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          "200": { description: "Payment object.", content: { "application/json": { schema: { $ref: "#/components/schemas/Payment" } } } },
          "404": { description: "Not found." },
        },
      },
    },
    "/payments/{id}/capture": {
      post: {
        tags: ["Payments"],
        operationId: "capturePayment",
        summary: "Capture a held authorization",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
          { $ref: "#/components/parameters/IdempotencyKey" },
        ],
        responses: {
          "200": { description: "Captured.", content: { "application/json": { schema: { $ref: "#/components/schemas/Payment" } } } },
        },
      },
    },
    "/payments/{id}/refund": {
      post: {
        tags: ["Payments"],
        operationId: "refundPayment",
        summary: "Refund a payment",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
          { $ref: "#/components/parameters/IdempotencyKey" },
        ],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  amount: { type: "integer", description: "Partial refund amount. Omit for full refund." },
                  reason: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Refund created.", content: { "application/json": { schema: { $ref: "#/components/schemas/Refund" } } } },
        },
      },
    },
    "/payments/{id}/cancel": {
      post: {
        tags: ["Payments"],
        operationId: "cancelPayment",
        summary: "Cancel a payment before capture",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          "200": { description: "Payment canceled.", content: { "application/json": { schema: { $ref: "#/components/schemas/Payment" } } } },
        },
      },
    },
    "/customers": {
      post: {
        tags: ["Customers"],
        operationId: "createCustomer",
        summary: "Create a customer",
        parameters: [{ $ref: "#/components/parameters/IdempotencyKey" }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  email: { type: "string", format: "email" },
                  name: { type: "string" },
                  phone: { type: "string" },
                  metadata: { type: "object", additionalProperties: { type: "string" } },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Customer created or matched.", content: { "application/json": { schema: { $ref: "#/components/schemas/Customer" } } } },
        },
      },
      get: {
        tags: ["Customers"],
        operationId: "listCustomers",
        summary: "List customers",
        parameters: [{ $ref: "#/components/parameters/Cursor" }, { $ref: "#/components/parameters/Limit" }],
        responses: {
          "200": { description: "Paginated list.", content: { "application/json": { schema: { $ref: "#/components/schemas/PaginatedList" } } } },
        },
      },
    },
    "/customers/{id}": {
      get: {
        tags: ["Customers"],
        operationId: "getCustomer",
        summary: "Retrieve a customer",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: { "200": { description: "Customer.", content: { "application/json": { schema: { $ref: "#/components/schemas/Customer" } } } } },
      },
      patch: {
        tags: ["Customers"],
        operationId: "updateCustomer",
        summary: "Update a customer",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        requestBody: { content: { "application/json": { schema: { $ref: "#/components/schemas/Customer" } } } },
        responses: { "200": { description: "Updated.", content: { "application/json": { schema: { $ref: "#/components/schemas/Customer" } } } } },
      },
      delete: {
        tags: ["Customers"],
        operationId: "deleteCustomer",
        summary: "Soft-delete a customer",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: { "200": { description: "Deleted." } },
      },
    },
    "/customers/{id}/payment_methods": {
      post: {
        tags: ["Customers"],
        operationId: "attachPaymentMethod",
        summary: "Attach a saved payment method",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { type: "object", required: ["token"], properties: { token: { type: "string" } } } } },
        },
        responses: { "200": { description: "Method attached." } },
      },
    },
    "/invoices": {
      post: {
        tags: ["Invoices"],
        operationId: "createInvoice",
        summary: "Create an invoice",
        parameters: [{ $ref: "#/components/parameters/IdempotencyKey" }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["customer_id", "items", "currency"],
                properties: {
                  customer_id: { type: "string", format: "uuid" },
                  currency: { type: "string" },
                  due_date: { type: "string", format: "date" },
                  items: { type: "array", items: { type: "object", properties: { name: { type: "string" }, qty: { type: "integer" }, unit_price: { type: "number" }, tax_rate: { type: "number" } } } },
                  metadata: { type: "object" },
                },
              },
            },
          },
        },
        responses: { "200": { description: "Invoice created.", content: { "application/json": { schema: { $ref: "#/components/schemas/Invoice" } } } } },
      },
      get: {
        tags: ["Invoices"],
        operationId: "listInvoices",
        summary: "List invoices",
        parameters: [{ $ref: "#/components/parameters/Cursor" }, { $ref: "#/components/parameters/Limit" }],
        responses: { "200": { description: "Paginated list.", content: { "application/json": { schema: { $ref: "#/components/schemas/PaginatedList" } } } } },
      },
    },
    "/invoices/{id}": {
      get: { tags: ["Invoices"], operationId: "getInvoice", summary: "Retrieve an invoice", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }], responses: { "200": { description: "Invoice.", content: { "application/json": { schema: { $ref: "#/components/schemas/Invoice" } } } } } },
    },
    "/invoices/{id}/send": {
      post: { tags: ["Invoices"], operationId: "sendInvoice", summary: "Email the hosted invoice link", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }], responses: { "200": { description: "Sent." } } },
    },
    "/invoices/{id}/void": {
      post: { tags: ["Invoices"], operationId: "voidInvoice", summary: "Void an unpaid invoice", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }], responses: { "200": { description: "Voided." } } },
    },
    "/products": {
      post: { tags: ["Products"], operationId: "createProduct", summary: "Create a product", requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/Product" } } } }, responses: { "200": { description: "Product created.", content: { "application/json": { schema: { $ref: "#/components/schemas/Product" } } } } } },
      get: { tags: ["Products"], operationId: "listProducts", summary: "List products", parameters: [{ $ref: "#/components/parameters/Cursor" }, { $ref: "#/components/parameters/Limit" }], responses: { "200": { description: "Paginated list.", content: { "application/json": { schema: { $ref: "#/components/schemas/PaginatedList" } } } } } },
    },
    "/products/{id}": {
      get: { tags: ["Products"], operationId: "getProduct", summary: "Retrieve a product", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }], responses: { "200": { description: "Product.", content: { "application/json": { schema: { $ref: "#/components/schemas/Product" } } } } } },
      patch: { tags: ["Products"], operationId: "updateProduct", summary: "Update a product", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }], requestBody: { content: { "application/json": { schema: { $ref: "#/components/schemas/Product" } } } }, responses: { "200": { description: "Updated." } } },
      delete: { tags: ["Products"], operationId: "deleteProduct", summary: "Delete a product", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }], responses: { "200": { description: "Deleted." } } },
    },
    "/refunds": {
      get: { tags: ["Refunds"], operationId: "listRefunds", summary: "List refunds", parameters: [{ $ref: "#/components/parameters/Cursor" }, { $ref: "#/components/parameters/Limit" }], responses: { "200": { description: "Paginated list.", content: { "application/json": { schema: { $ref: "#/components/schemas/PaginatedList" } } } } } },
    },
    "/refunds/{id}": {
      get: { tags: ["Refunds"], operationId: "getRefund", summary: "Retrieve a refund", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }], responses: { "200": { description: "Refund.", content: { "application/json": { schema: { $ref: "#/components/schemas/Refund" } } } } } },
    },
    "/payouts": {
      post: { tags: ["Payouts"], operationId: "createPayout", summary: "Request a payout", parameters: [{ $ref: "#/components/parameters/IdempotencyKey" }], requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["amount", "currency"], properties: { amount: { type: "integer" }, currency: { type: "string" }, bank_account_id: { type: "string", format: "uuid" } } } } } }, responses: { "200": { description: "Payout created.", content: { "application/json": { schema: { $ref: "#/components/schemas/Payout" } } } } } },
      get: { tags: ["Payouts"], operationId: "listPayouts", summary: "List payouts", parameters: [{ $ref: "#/components/parameters/Cursor" }, { $ref: "#/components/parameters/Limit" }], responses: { "200": { description: "Paginated list.", content: { "application/json": { schema: { $ref: "#/components/schemas/PaginatedList" } } } } } },
    },
    "/payouts/{id}": {
      get: { tags: ["Payouts"], operationId: "getPayout", summary: "Retrieve a payout", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }], responses: { "200": { description: "Payout.", content: { "application/json": { schema: { $ref: "#/components/schemas/Payout" } } } } } },
    },
    "/subscriptions": {
      post: {
        tags: ["Subscriptions"],
        operationId: "createSubscription",
        summary: "Create a subscription",
        parameters: [{ $ref: "#/components/parameters/IdempotencyKey" }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { type: "object", required: ["customer_id", "plan_name", "amount", "currency", "interval"], properties: { customer_id: { type: "string", format: "uuid" }, plan_name: { type: "string" }, amount: { type: "integer" }, currency: { type: "string" }, interval: { type: "string", enum: ["day", "week", "month", "year"] }, trial_days: { type: "integer" }, payment_method: { type: "string" } } } } },
        },
        responses: { "200": { description: "Subscription created.", content: { "application/json": { schema: { $ref: "#/components/schemas/Subscription" } } } } },
      },
      get: { tags: ["Subscriptions"], operationId: "listSubscriptions", summary: "List subscriptions", parameters: [{ $ref: "#/components/parameters/Cursor" }, { $ref: "#/components/parameters/Limit" }], responses: { "200": { description: "Paginated list.", content: { "application/json": { schema: { $ref: "#/components/schemas/PaginatedList" } } } } } },
    },
    "/subscriptions/{id}": {
      get: { tags: ["Subscriptions"], operationId: "getSubscription", summary: "Retrieve a subscription", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }], responses: { "200": { description: "Subscription.", content: { "application/json": { schema: { $ref: "#/components/schemas/Subscription" } } } } } },
      patch: { tags: ["Subscriptions"], operationId: "updateSubscription", summary: "Update a subscription", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }], requestBody: { content: { "application/json": { schema: { type: "object", properties: { plan_name: { type: "string" }, amount: { type: "integer" }, interval: { type: "string" } } } } } }, responses: { "200": { description: "Updated." } } },
      delete: { tags: ["Subscriptions"], operationId: "cancelSubscription", summary: "Cancel a subscription", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }], responses: { "200": { description: "Canceled." } } },
    },
    "/disputes": {
      get: { tags: ["Disputes"], operationId: "listDisputes", summary: "List disputes", parameters: [{ $ref: "#/components/parameters/Cursor" }, { $ref: "#/components/parameters/Limit" }], responses: { "200": { description: "Paginated list.", content: { "application/json": { schema: { $ref: "#/components/schemas/PaginatedList" } } } } } },
    },
    "/disputes/{id}": {
      get: { tags: ["Disputes"], operationId: "getDispute", summary: "Retrieve a dispute", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }], responses: { "200": { description: "Dispute.", content: { "application/json": { schema: { $ref: "#/components/schemas/Dispute" } } } } } },
    },
    "/disputes/{id}/evidence": {
      post: { tags: ["Disputes"], operationId: "submitEvidence", summary: "Submit dispute evidence", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }], requestBody: { content: { "application/json": { schema: { type: "object", properties: { customer_communication: { type: "string" }, receipt: { type: "string" }, shipping_documentation: { type: "string" } } } } } }, responses: { "200": { description: "Evidence submitted." } } },
    },
    "/wallets": {
      get: { tags: ["Wallets & Balances"], operationId: "listWallets", summary: "List fiat wallets", parameters: [{ name: "currency", in: "query", schema: { type: "string" } }], responses: { "200": { description: "Wallets.", content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/Wallet" } } } } } } },
    },
    "/wallets/balance-transactions": {
      get: { tags: ["Wallets & Balances"], operationId: "listLedgerEntries", summary: "List balance transactions (ledger)", parameters: [{ $ref: "#/components/parameters/Cursor" }, { $ref: "#/components/parameters/Limit" }, { name: "currency", in: "query", schema: { type: "string" } }], responses: { "200": { description: "Ledger entries.", content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/LedgerEntry" } } } } } } },
    },
    "/payment-links": {
      post: { tags: ["Payment Links"], operationId: "createPaymentLink", summary: "Create a payment link", parameters: [{ $ref: "#/components/parameters/IdempotencyKey" }], requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["amount", "currency"], properties: { amount: { type: "integer" }, currency: { type: "string" }, description: { type: "string" }, expires_at: { type: "string", format: "date-time" } } } } } }, responses: { "200": { description: "Link created.", content: { "application/json": { schema: { $ref: "#/components/schemas/PaymentLink" } } } } } },
      get: { tags: ["Payment Links"], operationId: "listPaymentLinks", summary: "List payment links", parameters: [{ $ref: "#/components/parameters/Cursor" }, { $ref: "#/components/parameters/Limit" }], responses: { "200": { description: "Paginated list." } } },
    },
    "/fx/rates": {
      get: { tags: ["FX"], operationId: "getFxRates", summary: "Get current FX rates", parameters: [{ name: "from", in: "query", required: true, schema: { type: "string" } }, { name: "to", in: "query", required: true, schema: { type: "string" } }], responses: { "200": { description: "Rate.", content: { "application/json": { schema: { $ref: "#/components/schemas/FxRate" } } } } } },
    },
    "/fx/convert": {
      post: { tags: ["FX"], operationId: "convertCurrency", summary: "Convert between currencies", requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["amount", "from", "to"], properties: { amount: { type: "number" }, from: { type: "string" }, to: { type: "string" } } } } } }, responses: { "200": { description: "Conversion result." } } },
    },
    "/webhooks/endpoints": {
      post: { tags: ["Webhooks"], operationId: "createWebhookEndpoint", summary: "Register a webhook endpoint", requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["url", "events"], properties: { url: { type: "string", format: "uri" }, events: { type: "array", items: { type: "string" } } } } } } }, responses: { "200": { description: "Endpoint created.", content: { "application/json": { schema: { $ref: "#/components/schemas/WebhookEndpoint" } } } } } },
      get: { tags: ["Webhooks"], operationId: "listWebhookEndpoints", summary: "List webhook endpoints", responses: { "200": { description: "Endpoints." } } },
    },
    "/webhooks/endpoints/{id}": {
      delete: { tags: ["Webhooks"], operationId: "deleteWebhookEndpoint", summary: "Delete a webhook endpoint", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }], responses: { "200": { description: "Deleted." } } },
    },
  },
  tags: [
    { name: "Payments", description: "Charge customers via cards, wallets, open banking." },
    { name: "Customers", description: "Manage customer profiles and saved payment methods." },
    { name: "Invoices", description: "Hosted billing documents with payment URLs." },
    { name: "Products", description: "Catalog entries for invoices and subscriptions." },
    { name: "Refunds", description: "Full and partial refund management." },
    { name: "Payouts", description: "Withdraw funds to bank accounts." },
    { name: "Subscriptions", description: "Recurring billing with dunning and proration." },
    { name: "Disputes", description: "Chargeback and dispute management." },
    { name: "Wallets & Balances", description: "Fiat wallet balances and ledger entries." },
    { name: "Payment Links", description: "Shareable, hosted checkout links." },
    { name: "FX", description: "Foreign exchange rates and conversions." },
    { name: "Webhooks", description: "Event delivery endpoints." },
  ],
} as const;

/** Generate a Postman Collection v2.1 from the OpenAPI spec */
export function buildPostmanCollection() {
  const spec = OPENAPI_SPEC;
  const items: any[] = [];

  const tagGroups: Record<string, any[]> = {};
  for (const tag of spec.tags) {
    tagGroups[tag.name] = [];
  }

  for (const [path, methods] of Object.entries(spec.paths)) {
    for (const [method, op] of Object.entries(methods as Record<string, any>)) {
      const tag = op.tags?.[0] || "Other";
      if (!tagGroups[tag]) tagGroups[tag] = [];
      
      const url = `{{baseUrl}}${path}`.replace(/{(\w+)}/g, ":$1");
      const item: any = {
        name: op.summary || op.operationId,
        request: {
          method: method.toUpperCase(),
          header: [
            { key: "Content-Type", value: "application/json" },
            { key: "Authorization", value: "Bearer {{apiKey}}" },
          ],
          url: {
            raw: url,
            host: ["{{baseUrl}}"],
            path: path.split("/").filter(Boolean).map((s: string) => s.replace(/{(\w+)}/g, ":$1")),
          },
        },
      };

      if (op.requestBody?.content?.["application/json"]?.schema) {
        const schema = op.requestBody.content["application/json"].schema;
        const example = generateExample(schema);
        item.request.body = {
          mode: "raw",
          raw: JSON.stringify(example, null, 2),
        };
      }

      if (op.parameters) {
        const queryParams = op.parameters.filter((p: any) => p.in === "query" || p?.schema);
        const qp = queryParams.filter((p: any) => p.in === "query");
        if (qp.length) {
          item.request.url.query = qp.map((p: any) => ({
            key: p.name,
            value: "",
            disabled: !p.required,
          }));
        }
      }

      tagGroups[tag].push(item);
    }
  }

  const folders = Object.entries(tagGroups)
    .filter(([, items]) => items.length > 0)
    .map(([name, items]) => ({ name, item: items }));

  return {
    info: {
      name: "MzzPay API",
      description: spec.info.description,
      schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
    },
    variable: [
      { key: "baseUrl", value: DOCS_META.baseUrl },
      { key: "apiKey", value: "sk_test_your_key_here" },
    ],
    item: folders,
  };
}

function generateExample(schema: any): any {
  if (!schema) return {};
  if (schema.$ref) return {};
  if (schema.type === "object") {
    const obj: any = {};
    for (const [key, val] of Object.entries(schema.properties || {})) {
      obj[key] = generateExample(val as any);
    }
    return obj;
  }
  if (schema.type === "array") return [generateExample(schema.items)];
  if (schema.type === "integer") return 5000;
  if (schema.type === "number") return 50.0;
  if (schema.type === "boolean") return true;
  if (schema.enum) return schema.enum[0];
  if (schema.format === "uuid") return "00000000-0000-0000-0000-000000000000";
  if (schema.format === "email") return "customer@example.com";
  if (schema.format === "uri") return "https://example.com/webhook";
  if (schema.format === "date-time") return new Date().toISOString();
  if (schema.format === "date") return "2026-05-15";
  return "string_value";
}
