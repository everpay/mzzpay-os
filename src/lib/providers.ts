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
    // Same upstream endpoint as `mzzpay` — kept as a separate key for
    // historical migrations but presented under the same merged label.
    name: 'shieldhub',
    displayName: processorLabel('shieldhub'),
    supportedCurrencies: ['USD'],
    regions: ['US', 'GLOBAL'],
    methods: ['Card', '3DS'],
  },
};

export function resolveProvider(currency: Currency, region?: string): Provider {
  if (['EUR', 'GBP'].includes(currency)) return 'mondo';
  return 'mzzpay';
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
