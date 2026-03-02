import { Currency, Provider } from './types';

interface ProviderConfig {
  name: string;
  displayName: string;
  supportedCurrencies: Currency[];
  regions: string[];
  methods: string[];
}

export const providerConfigs: Record<Provider, ProviderConfig> = {
  facilitapay: {
    name: 'facilitapay',
    displayName: 'FacilitaPay',
    supportedCurrencies: ['BRL', 'MXN', 'COP'],
    regions: ['BR', 'MX', 'CO'],
    methods: ['PIX', 'Boleto', 'SPEI', 'PSE'],
  },
  mondo: {
    name: 'mondo',
    displayName: 'Mondo',
    supportedCurrencies: ['EUR', 'GBP'],
    regions: ['EU', 'UK'],
    methods: ['SEPA', 'Faster Payments', 'SEPA Direct Debit'],
  },
  stripe: {
    name: 'stripe',
    displayName: 'Stripe',
    supportedCurrencies: ['USD', 'EUR', 'GBP'],
    regions: ['US', 'EU', 'UK'],
    methods: ['Card', 'ACH'],
  },
};

export function resolveProvider(currency: Currency, region?: string): Provider {
  if (['BRL', 'MXN', 'COP'].includes(currency)) return 'facilitapay';
  if (['EUR', 'GBP'].includes(currency) && region !== 'US') return 'mondo';
  return 'stripe';
}

export function getProviderColor(provider: Provider): string {
  switch (provider) {
    case 'facilitapay': return 'hsl(var(--chart-4))';
    case 'mondo': return 'hsl(var(--chart-3))';
    case 'stripe': return 'hsl(var(--chart-1))';
  }
}
