/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'

export interface TemplateEntry {
  component: React.ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  to?: string
  displayName?: string
  previewData?: Record<string, any>
}

import { template as paymentConfirmation } from './payment-confirmation.tsx'
import { template as paymentDeclined } from './payment-declined.tsx'
import { template as invoiceCreated } from './invoice-created.tsx'
import { template as invoicePaid } from './invoice-paid.tsx'
import { template as customerWelcome } from './customer-welcome.tsx'
import { template as chargebackNotification } from './chargeback-notification.tsx'
import { template as refundConfirmation } from './refund-confirmation.tsx'
import { template as payoutConfirmation } from './payout-confirmation.tsx'
import { template as transferNotification } from './transfer-notification.tsx'
import { template as depositConfirmation } from './deposit-confirmation.tsx'
import { template as chargeSucceeded } from './charge-succeeded.tsx'
import { template as transferSent } from './transfer-sent.tsx'
import { template as transferReceived } from './transfer-received.tsx'
import { template as subscriptionCreated } from './subscription-created.tsx'
import { template as subscriptionRenewed } from './subscription-renewed.tsx'
import { template as subscriptionCanceled } from './subscription-canceled.tsx'
import { template as settlementReady } from './settlement-ready.tsx'

export const TEMPLATES: Record<string, TemplateEntry> = {
  'payment-confirmation': paymentConfirmation,
  'payment-declined': paymentDeclined,
  'charge-succeeded': chargeSucceeded,
  'invoice-created': invoiceCreated,
  'invoice-paid': invoicePaid,
  'customer-welcome': customerWelcome,
  'chargeback-notification': chargebackNotification,
  'refund-confirmation': refundConfirmation,
  'payout-confirmation': payoutConfirmation,
  'transfer-notification': transferNotification,
  'transfer-sent': transferSent,
  'transfer-received': transferReceived,
  'deposit-confirmation': depositConfirmation,
  'subscription-created': subscriptionCreated,
  'subscription-renewed': subscriptionRenewed,
  'subscription-canceled': subscriptionCanceled,
  'settlement-ready': settlementReady,
}
