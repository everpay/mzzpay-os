import { Currency, Provider } from './types';
import { processorLabel } from './processor-labels';

interface ProviderConfig {
  name: string;
  displayName: string;
  supportedCurrencies: Currency[];
  regions: string[];
  methods: string[];
}

export const providerConfigs: Record<Provider, ProviderConfig> = {
  mondo: {
    name: 'mondo',
    displayName: processorLabel('mondo'),
    supportedCurrencies: ['EUR', 'GBP'],
    regions: ['EU', 'UK'],
    methods: ['SEPA', 'Faster Payments', 'SEPA Direct Debit', 'Card'],
  },
  stripe: {
    name: 'stripe',
    displayName: processorLabel('stripe'),
    supportedCurrencies: ['USD'],
    regions: ['US'],
    methods: ['Card', 'ACH'],
  },
  mzzpay: {
    name: 'mzzpay',
    displayName: processorLabel('mzzpay'),
    supportedCurrencies: ['USD', 'BRL', 'MXN', 'COP'],
    regions: ['US', 'GLOBAL'],
    methods: ['Card', 'ACH', 'PIX', 'Boleto'],
  },
  moneto: {
    name: 'moneto',
    displayName: processorLabel('moneto'),
    supportedCurrencies: ['CAD'],
    regions: ['CA'],
    methods: ['Wallet', 'Bank Transfer'],
  },
  moneto_mpg: {
    name: 'moneto_mpg',
    displayName: processorLabel('moneto_mpg'),
    supportedCurrencies: ['CAD', 'USD'],
    regions: ['CA', 'US'],
    methods: ['Card'],
  },
  matrix: {
    name: 'matrix',
    displayName: processorLabel('matrix'),
    supportedCurrencies: ['EUR', 'USD', 'GBP'],
    regions: ['EU', 'UK', 'GLOBAL'],
    methods: ['Card', 'APM', 'Subscription', 'Oneclick'],
  },
  shieldhub: {
    // Primary 2D card MID. Shares upstream with the legacy `mzzpay` key but
    // is the default acquirer for all card checkouts going forward. 2D only —
    // no 3DS step-up. Use `mondo` (Openbanking EU) for EU 3DS/SCA flows.
    name: 'shieldhub',
    displayName: processorLabel('shieldhub'),
    supportedCurrencies: ['USD', 'EUR', 'GBP', 'MXN', 'BRL', 'COP'],
    regions: ['US', 'GLOBAL'],
    methods: ['Card', '2D'],
  },
};

/**
 * Default routing for every checkout/payment form on the platform.
 *
 * Per product decision (2026-04):
 *  - **Shieldhub** is the primary 2D card processor for ALL merchants.
 *  - **Mondo (Openbanking EU)** is offered as an alternative for EU/UK
 *    open-banking and SEPA flows; it is enabled for every merchant.
 *  - **Matrix Partners** is gated behind `merchants.gambling_enabled`
 *    (super_admin only) for casino/lottery/sportsbook/sweepstakes.
 *
 * `paymentMethod` lets callers force open-banking even when the currency
 * would normally route to Shieldhub.
 */
export function resolveProvider(
  currency: Currency,
  region?: string,
  opts?: { paymentMethod?: string; gamblingEnabled?: boolean },
): Provider {
  if (opts?.paymentMethod === 'open_banking') return 'mondo';
  if (opts?.gamblingEnabled) return 'matrix';
  return 'shieldhub';
}

export function getProviderColor(provider: Provider): string {
  switch (provider) {
    case 'mondo': return 'hsl(var(--chart-3))';
    case 'stripe': return 'hsl(var(--chart-1))';
    case 'mzzpay': return 'hsl(var(--chart-2))';
    case 'moneto': return 'hsl(var(--chart-5))';
    case 'moneto_mpg': return 'hsl(var(--chart-5))';
    case 'matrix': return 'hsl(var(--chart-4))';
    case 'shieldhub': return 'hsl(var(--chart-2))';
    default: return 'hsl(var(--chart-1))';
  }
}
